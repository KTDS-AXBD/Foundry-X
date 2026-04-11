#!/usr/bin/env bash
# Board 아이템의 F-item 코드를 SPEC.md 상태와 비교 리포트 — F503
#
# Usage:
#   bash scripts/board/board-sync-spec.sh            # 리포트만
#   bash scripts/board/board-sync-spec.sh --json     # JSON 출력
#
# 현재 --fix 모드는 미구현 (후속 Sprint). 리포트 후 수동 정합화.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
# shellcheck source=_common.sh
source "${HERE}/_common.sh"
board::require

AS_JSON=false
[ "${1:-}" = "--json" ] && AS_JSON=true

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

if $AS_JSON; then
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
else
  printf '%-8s  %-6s  %-14s  %s\n' "F-item" "Issue" "Board" "SPEC"
  printf '%-8s  %-6s  %-14s  %s\n' "------" "-----" "-----" "----"
  while IFS=$'\t' read -r NUM COL FITEM; do
    [ -z "${FITEM:-}" ] && continue
    SPEC_STATUS=$(awk -F'|' -v f="$FITEM" '$2 ~ ("^ *"f" *$") {print $5; exit}' "$SPEC_FILE" | tr -d ' ')
    printf '%-8s  #%-5s  %-14s  %s\n' "$FITEM" "$NUM" "$COL" "${SPEC_STATUS:-?}"
  done <<< "$ROWS"
fi
