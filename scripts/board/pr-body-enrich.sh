#!/usr/bin/env bash
# PR 본문에 Sprint/F-items/Match Rate 표준 섹션 주입 (idempotent) — F504
#
# Usage:
#   bash scripts/board/pr-body-enrich.sh <pr-number> <sprint> <f-items> <match-rate>
#   예: pr-body-enrich.sh 456 246 "F503,F504" 95
#
# 고정 marker(<!-- fx-pr-enrich -->...<!-- /fx-pr-enrich -->) 블록을 교체합니다.
# 재실행해도 중복 섹션이 생기지 않습니다.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=_common.sh
source "${HERE}/_common.sh"
board::require

PR="${1:-}"; SPRINT="${2:-}"; FITEMS="${3:-}"; MATCH="${4:-}"
if [ -z "$PR" ] || [ -z "$SPRINT" ] || [ -z "$FITEMS" ] || [ -z "$MATCH" ]; then
  echo "Usage: $0 <pr-number> <sprint> <f-items> <match-rate>" >&2
  exit 2
fi

MARKER_START="<!-- fx-pr-enrich -->"
MARKER_END="<!-- /fx-pr-enrich -->"

CURRENT=$(gh pr view "$PR" --repo "$REPO" --json body --jq '.body' 2>/dev/null || echo "")

CLEANED=$(printf '%s\n' "$CURRENT" \
  | awk -v s="$MARKER_START" -v e="$MARKER_END" '
      index($0, s) {skip=1; next}
      index($0, e) {skip=0; next}
      !skip {print}')

BLOCK=$(cat <<EOF
${MARKER_START}
### Sprint Metadata
- Sprint: ${SPRINT}
- F-items: ${FITEMS}
- Match Rate: ${MATCH}%
${MARKER_END}
EOF
)

NEW_BODY=$(printf '%s\n\n%s\n' "$CLEANED" "$BLOCK")

# REST API direct PATCH — `gh pr edit` 우회
# S255 교훈: `gh pr edit`는 내부적으로 GraphQL projectCards(deprecated classic)를
# 건드려 "Projects (classic) is being deprecated" 오류로 실패. PATCH body는
# classic Projects와 무관하므로 REST API로 직접 업데이트.
if gh api -X PATCH "repos/${REPO}/pulls/${PR}" \
     --field body="$NEW_BODY" >/dev/null 2>&1; then
  echo "[pr-body-enrich] PR #$PR — Sprint=$SPRINT F=$FITEMS Match=${MATCH}%"
else
  echo "[pr-body-enrich] WARN: PR #$PR body 갱신 실패 (gh api PATCH)" >&2
  exit 1
fi
