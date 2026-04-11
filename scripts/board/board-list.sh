#!/usr/bin/env bash
# Board 특정 컬럼의 Issue 아이템을 JSON으로 출력 — F503
#
# Usage:
#   bash scripts/board/board-list.sh                      # 기본 Backlog
#   bash scripts/board/board-list.sh --column "Sprint Ready"
#   bash scripts/board/board-list.sh --column "In Progress"
#
# 출력: [{number, title, url, labels}]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=_common.sh
source "${HERE}/_common.sh"
board::require_projects

COLUMN="Backlog"
while [ $# -gt 0 ]; do
  case "$1" in
    --column) COLUMN="$2"; shift 2 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "[board-list] unknown arg: $1" >&2; exit 2 ;;
  esac
done

PROJECT_NUM=$(board::project_num)
if [ -z "$PROJECT_NUM" ]; then
  echo "[board-list] 프로젝트를 찾을 수 없습니다: $PROJECT_TITLE" >&2
  exit 1
fi

gh project item-list "$PROJECT_NUM" --owner "$OWNER" --format json --limit 200 \
  | jq --arg col "$COLUMN" '
      (.items // [])
      | map(select((.status // "") == $col and (.content.type // "") == "Issue"))
      | map({
          number: .content.number,
          title: .content.title,
          url: .content.url,
          labels: ([.content.labels[]?.name] // [])
        })'
