#!/usr/bin/env bash
# PR merge 완료 후 연관 Issue를 Done 컬럼으로 이동 — F504
#
# Usage:
#   bash scripts/board/board-on-merge.sh <pr-number>
#
# PR 본문/제목에서 `close[sd]?|fix(e[sd])?|resolve[sd]? #N` 패턴을 추출해
# 각 Issue를 Done으로 이동합니다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=_common.sh
source "${HERE}/_common.sh"
board::require

PR_NUM="${1:-}"
if [ -z "$PR_NUM" ]; then
  echo "Usage: $0 <pr-number>" >&2
  exit 2
fi

META=$(gh pr view "$PR_NUM" --repo "$REPO" --json body,title 2>/dev/null || echo '{}')
TEXT=$(echo "$META" | jq -r '(.title // "") + " " + (.body // "")')

ISSUE_REFS=$(echo "$TEXT" \
  | grep -oiE '(close[sd]?|fix(e[sd])?|resolve[sd]?) #[0-9]+' \
  | grep -oE '#[0-9]+' | tr -d '#' | sort -u || true)

if [ -z "$ISSUE_REFS" ]; then
  echo "[board-on-merge] PR #$PR_NUM — 연관 Issue 없음, skip"
  exit 0
fi

MOVED=0
FAILED=0
for ISSUE in $ISSUE_REFS; do
  if bash "${HERE}/board-move.sh" "$ISSUE" "Done" >/dev/null 2>&1; then
    MOVED=$((MOVED + 1))
    echo "[board-on-merge] #$ISSUE → Done"
  else
    FAILED=$((FAILED + 1))
    echo "[board-on-merge] #$ISSUE 이동 실패" >&2
  fi
  sleep 0.3
done

echo "[board-on-merge] PR #$PR_NUM — moved=$MOVED failed=$FAILED"
