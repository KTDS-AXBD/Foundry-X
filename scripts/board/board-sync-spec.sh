#!/usr/bin/env bash
# Board 아이템의 F-item 코드를 SPEC.md 상태와 비교 리포트 + 수정 — F503
#
# Usage:
#   bash scripts/board/board-sync-spec.sh            # 리포트만
#   bash scripts/board/board-sync-spec.sh --json     # JSON 출력
#   bash scripts/board/board-sync-spec.sh --fix      # 드리프트 자동 정합화 (SPEC → Board)
#   bash scripts/board/board-sync-spec.sh --fix --dry-run  # fix 미리보기
#
# --fix 정책 (SPEC을 SSOT로 간주):
#   SPEC=✅ & Board≠Done   → Board 를 Done 으로 이동
#   SPEC=🔧 & Board≠InProgress → Board 를 "In Progress" 로 이동
#   SPEC=📋 & Board=Done   → Board 를 "Sprint Ready" 로 되돌림 (경고)
#   SPEC=? (미매칭)        → 건드리지 않고 WARN
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
# shellcheck source=_common.sh
source "${HERE}/_common.sh"
board::require

MODE="report"   # report | json | fix
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --json) MODE="json" ;;
    --fix)  MODE="fix" ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

SPEC_FILE="${REPO_ROOT}/SPEC.md"
[ -f "$SPEC_FILE" ] || { echo "[board-sync-spec] SPEC.md 없음: $SPEC_FILE" >&2; exit 1; }

PROJECT_NUM=$(board::project_num)
[ -z "$PROJECT_NUM" ] && { echo "[board-sync-spec] 프로젝트 없음" >&2; exit 1; }

ITEMS=$(gh project item-list "$PROJECT_NUM" --owner "$OWNER" --format json --limit 200)

ROWS=$(echo "$ITEMS" | jq -r '
  (.items // [])[]
  | select((.content.type // "") == "Issue")
  | [
      (.content.number // 0),
      (.status // "none"),
      ((.content.title // "") + " " + (.content.body // "") | scan("F[0-9]{3,4}"))
    ]
  | @tsv' 2>/dev/null || true)

# SPEC 상태 이모지 → Board 컬럼 매핑
spec_to_board() {
  case "$1" in
    *✅*) echo "Done" ;;
    *🔧*) echo "In Progress" ;;
    *📋*) echo "Sprint Ready" ;;
    *) echo "" ;;
  esac
}

declare -i TOTAL=0 OK=0 DRIFT=0 FIXED=0 FAILED=0 UNMATCHED=0

case "$MODE" in
  json)
    echo "["
    FIRST=true
    while IFS=$'\t' read -r NUM COL FITEM; do
      [ -z "${FITEM:-}" ] && continue
      SPEC_STATUS=$(awk -F'|' -v f="$FITEM" '$2 ~ ("^ *"f" *$") {print $5; exit}' "$SPEC_FILE" | tr -d ' ')
      $FIRST || echo ","
      FIRST=false
      printf '  {"f_item":"%s","issue":%s,"board":"%s","spec":"%s"}' \
        "$FITEM" "$NUM" "$COL" "${SPEC_STATUS:-?}"
    done <<< "$ROWS"
    echo
    echo "]"
    ;;

  report)
    printf '%-8s  %-6s  %-14s  %s\n' "F-item" "Issue" "Board" "SPEC"
    printf '%-8s  %-6s  %-14s  %s\n' "------" "-----" "-----" "----"
    while IFS=$'\t' read -r NUM COL FITEM; do
      [ -z "${FITEM:-}" ] && continue
      TOTAL+=1
      SPEC_STATUS=$(awk -F'|' -v f="$FITEM" '$2 ~ ("^ *"f" *$") {print $5; exit}' "$SPEC_FILE" | tr -d ' ')
      EXPECTED=$(spec_to_board "$SPEC_STATUS")
      if [ -z "$EXPECTED" ]; then
        UNMATCHED+=1
      elif [ "$COL" = "$EXPECTED" ]; then
        OK+=1
      else
        DRIFT+=1
      fi
      printf '%-8s  #%-5s  %-14s  %s\n' "$FITEM" "$NUM" "$COL" "${SPEC_STATUS:-?}"
    done <<< "$ROWS"
    echo
    echo "Summary: total=${TOTAL} ok=${OK} drift=${DRIFT} unmatched=${UNMATCHED}"
    [ "$DRIFT" -gt 0 ] && echo "Run '--fix' to auto-reconcile ${DRIFT} drift(s)."
    ;;

  fix)
    MOVE_SCRIPT="${HERE}/board-move.sh"
    [ -x "$MOVE_SCRIPT" ] || { echo "[board-sync-spec] board-move.sh 없음/권한 없음" >&2; exit 1; }
    printf '%-8s  %-6s  %-14s  %-14s  %s\n' "F-item" "Issue" "Board" "→ Target" "Result"
    printf '%-8s  %-6s  %-14s  %-14s  %s\n' "------" "-----" "-----" "--------" "------"
    while IFS=$'\t' read -r NUM COL FITEM; do
      [ -z "${FITEM:-}" ] && continue
      TOTAL+=1
      SPEC_STATUS=$(awk -F'|' -v f="$FITEM" '$2 ~ ("^ *"f" *$") {print $5; exit}' "$SPEC_FILE" | tr -d ' ')
      EXPECTED=$(spec_to_board "$SPEC_STATUS")
      if [ -z "$EXPECTED" ]; then
        UNMATCHED+=1
        printf '%-8s  #%-5s  %-14s  %-14s  %s\n' "$FITEM" "$NUM" "$COL" "-" "WARN: SPEC 미매칭"
        continue
      fi
      if [ "$COL" = "$EXPECTED" ]; then
        OK+=1
        printf '%-8s  #%-5s  %-14s  %-14s  %s\n' "$FITEM" "$NUM" "$COL" "=" "OK"
        continue
      fi
      DRIFT+=1
      if $DRY_RUN; then
        printf '%-8s  #%-5s  %-14s  %-14s  %s\n' "$FITEM" "$NUM" "$COL" "$EXPECTED" "DRY-RUN"
        continue
      fi
      if bash "$MOVE_SCRIPT" "$NUM" "$EXPECTED" >/dev/null 2>&1; then
        FIXED+=1
        printf '%-8s  #%-5s  %-14s  %-14s  %s\n' "$FITEM" "$NUM" "$COL" "$EXPECTED" "FIXED ✅"
      else
        FAILED+=1
        printf '%-8s  #%-5s  %-14s  %-14s  %s\n' "$FITEM" "$NUM" "$COL" "$EXPECTED" "FAIL ❌"
      fi
    done <<< "$ROWS"
    echo
    if $DRY_RUN; then
      echo "Summary (dry-run): total=${TOTAL} ok=${OK} drift=${DRIFT} unmatched=${UNMATCHED} (no changes applied)"
    else
      echo "Summary: total=${TOTAL} ok=${OK} drift=${DRIFT} fixed=${FIXED} failed=${FAILED} unmatched=${UNMATCHED}"
    fi
    [ "$FAILED" -gt 0 ] && exit 1
    ;;
esac
