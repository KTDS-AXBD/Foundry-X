#!/usr/bin/env bash
# F506 — Phase(Epic) 진행률 계산
# Usage:
#   bash scripts/epic/phase-progress.sh <phase_num> [--dry-run]
set -euo pipefail

PHASE="${1:-}"
DRY="${2:-}"
if [ -z "$PHASE" ]; then
  echo "Usage: $0 <phase_num> [--dry-run]" >&2
  exit 1
fi

CONFIG=".github/phase-config.yml"
if [ ! -f "$CONFIG" ]; then
  echo "ERROR: $CONFIG not found" >&2
  exit 1
fi

REPO="${GITHUB_REPO:-$(grep '^repo:' "$CONFIG" | sed 's/repo: *//')}"
[ -z "$REPO" ] && REPO="KTDS-AXBD/Foundry-X"

# phase-config.yml에서 title 추출
TITLE=$(awk -v p="$PHASE" '
  /^  - number:/ { cur = $3 }
  /^    title:/ && cur == p {
    sub(/^    title: *"?/, "")
    sub(/"?[[:space:]]*$/, "")
    print
    exit
  }
' "$CONFIG")

if [ -z "$TITLE" ]; then
  echo "ERROR: Phase ${PHASE} not in $CONFIG" >&2
  exit 1
fi

if [ "$DRY" = "--dry-run" ]; then
  cat <<EOF
${TITLE}
- Open: (dry-run)
- Closed: (dry-run)
- Progress: (dry-run)%
EOF
  exit 0
fi

if ! command -v gh >/dev/null; then
  echo "ERROR: gh CLI 필요 (또는 --dry-run 사용)" >&2
  exit 1
fi
if ! command -v jq >/dev/null; then
  echo "ERROR: jq 필요" >&2
  exit 1
fi

DATA=$(gh api "repos/${REPO}/milestones?state=all&per_page=100" 2>/dev/null | \
  jq -r --arg t "$TITLE" '.[] | select(.title==$t) | "\(.open_issues)|\(.closed_issues)"' | head -1)

if [ -z "$DATA" ]; then
  echo "Milestone not found: $TITLE" >&2
  exit 1
fi

OPEN=${DATA%|*}
CLOSED=${DATA#*|}
TOTAL=$(( OPEN + CLOSED ))

if [ "$TOTAL" -eq 0 ]; then
  PCT="N/A"
else
  PCT=$(awk -v c="$CLOSED" -v t="$TOTAL" 'BEGIN {printf "%.1f", c/t*100}')
fi

cat <<EOF
${TITLE}
- Open: ${OPEN}
- Closed: ${CLOSED}
- Progress: ${PCT}%
EOF
