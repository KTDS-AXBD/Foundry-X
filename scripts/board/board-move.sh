#!/usr/bin/env bash
# Board 아이템 컬럼 이동 — F503/F504 공용 헬퍼
#
# Usage:
#   bash scripts/board/board-move.sh <issue-number> "Sprint Ready"
#   bash scripts/board/board-move.sh 453 "Done"
#
# Issue가 Board에 없으면 먼저 item-add 후 이동합니다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=_common.sh
source "${HERE}/_common.sh"
board::require_projects

ISSUE="${1:-}"
COLUMN="${2:-}"
if [ -z "$ISSUE" ] || [ -z "$COLUMN" ]; then
  echo "Usage: $0 <issue-number> <column>" >&2
  exit 2
fi

PROJECT_NUM=$(board::project_num)
if [ -z "$PROJECT_NUM" ]; then
  echo "[board-move] 프로젝트 없음: $PROJECT_TITLE" >&2
  exit 1
fi

PROJECT_ID=$(board::project_id "$PROJECT_NUM")
FIELD_ID=$(board::status_field_id "$PROJECT_NUM")
OPTION_ID=$(board::status_option_id "$PROJECT_NUM" "$COLUMN")

if [ -z "$OPTION_ID" ]; then
  echo "[board-move] Status 옵션 '$COLUMN' 없음 — field-list 확인 필요" >&2
  exit 1
fi

ITEM_ID=$(gh project item-list "$PROJECT_NUM" --owner "$OWNER" --format json --limit 200 \
  | jq -r --argjson n "$ISSUE" \
      '(.items // [])[] | select((.content.number // -1) == $n) | .id' \
  | head -1)

if [ -z "$ITEM_ID" ]; then
  URL="https://github.com/${REPO}/issues/${ISSUE}"
  ITEM_ID=$(gh project item-add "$PROJECT_NUM" --owner "$OWNER" --url "$URL" \
    --format json 2>/dev/null | jq -r '.id' || true)
fi

if [ -z "$ITEM_ID" ]; then
  echo "[board-move] Issue #$ISSUE 프로젝트 추가 실패" >&2
  exit 1
fi

gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "$PROJECT_ID" \
  --field-id "$FIELD_ID" \
  --single-select-option-id "$OPTION_ID" >/dev/null

echo "[board-move] #$ISSUE → $COLUMN"
