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

TMP=$(mktemp)
printf '%s' "$NEW_BODY" > "$TMP"
gh pr edit "$PR" --repo "$REPO" --body-file "$TMP" >/dev/null
rm -f "$TMP"

echo "[pr-body-enrich] PR #$PR — Sprint=$SPRINT F=$FITEMS Match=${MATCH}%"
