#!/usr/bin/env bash
# F507 — Priority 변경 이력 조회
# Usage:
#   bash scripts/priority/list-history.sh [--f F507] [--since YYYY-MM] [--priority P1]
set -euo pipefail

F_FILTER=""
SINCE_FILTER=""
PRIORITY_FILTER=""

while [ $# -gt 0 ]; do
  case "$1" in
    --f)        F_FILTER="$2"; shift 2 ;;
    --since)    SINCE_FILTER="$2"; shift 2 ;;
    --priority) PRIORITY_FILTER="$2"; shift 2 ;;
    -h|--help)
      cat <<EOF
Usage: $0 [--f F507] [--since YYYY-MM] [--priority P1]
  --f        특정 F-item만 조회
  --since    해당 시점 이후 (timestamp prefix 비교)
  --priority Priority 포함 변경만 (OLD 또는 NEW)
EOF
      exit 0 ;;
    *) echo "ERROR: 알 수 없는 옵션 $1" >&2; exit 1 ;;
  esac
done

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
HIST_DIR="${REPO_ROOT}/docs/priority-history"

if [ ! -d "$HIST_DIR" ]; then
  echo "ℹ️  이력 디렉터리 없음: ${HIST_DIR}" >&2
  exit 0
fi

# 파일 목록
if [ -n "$F_FILTER" ]; then
  FILES=("${HIST_DIR}/${F_FILTER}.md")
  [ -f "${FILES[0]}" ] || { echo "ℹ️  ${F_FILTER} 이력 없음" >&2; exit 0; }
else
  mapfile -t FILES < <(find "$HIST_DIR" -maxdepth 1 -name 'F*.md' -type f 2>/dev/null | sort)
fi

[ ${#FILES[@]} -eq 0 ] && { echo "ℹ️  이력 없음" >&2; exit 0; }

# 수집: F_NUM|TS|OLD→NEW|REASON|ACTOR
ROWS=""
for f in "${FILES[@]}"; do
  f_num=$(basename "$f" .md)
  # 테이블 행만 추출 (timestamp 시작)
  while IFS= read -r line; do
    ts=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$2); print $2}')
    change=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$3); print $3}')
    reason=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$4); print $4}')
    actor=$(echo "$line" | awk -F'|' '{gsub(/^ +| +$/,"",$5); print $5}')

    [ -z "$ts" ] && continue
    # 필터
    if [ -n "$SINCE_FILTER" ] && [[ "$ts" < "$SINCE_FILTER" ]]; then
      continue
    fi
    if [ -n "$PRIORITY_FILTER" ] && [[ "$change" != *"$PRIORITY_FILTER"* ]]; then
      continue
    fi
    ROWS="${ROWS}${ts}|${f_num}|${change}|${reason}|${actor}"$'\n'
  done < <(grep -E '^\| 20[0-9]{2}-' "$f" 2>/dev/null || true)
done

if [ -z "$ROWS" ]; then
  echo "ℹ️  필터 조건에 맞는 이력 없음" >&2
  exit 0
fi

# 출력 (최신 먼저)
echo "| 시각 | F# | 변경 | 사유 | 변경자 |"
echo "|------|----|------|------|--------|"
echo -n "$ROWS" | sort -r | awk -F'|' '{printf "| %s | %s | %s | %s | %s |\n", $1, $2, $3, $4, $5}'
