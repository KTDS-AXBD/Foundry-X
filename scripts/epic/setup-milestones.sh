#!/usr/bin/env bash
# F506 — GitHub Milestones 생성/동기화 (Epic/Phase 메타데이터)
# Usage:
#   bash scripts/epic/setup-milestones.sh [--dry-run]
#
# 의존:
#   - .github/phase-config.yml
#   - gh CLI (--dry-run이 아니면 필수)
#   - GH_TOKEN env 또는 gh auth login
set -euo pipefail

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
fi

CONFIG=".github/phase-config.yml"
if [ ! -f "$CONFIG" ]; then
  echo "ERROR: $CONFIG not found" >&2
  exit 1
fi

REPO="${GITHUB_REPO:-$(grep '^repo:' "$CONFIG" | sed 's/repo: *//')}"
if [ -z "$REPO" ]; then
  REPO="KTDS-AXBD/Foundry-X"
fi

# phase-config.yml 파싱 — awk 기반 단순 파서
# 출력 포맷: number|title|description|due_on|state
parse_phases() {
  awk '
    /^  - number:/ {
      if (num != "") print num "|" title "|" desc "|" due "|" state
      num = $3; title = ""; desc = ""; due = ""; state = ""
      next
    }
    /^    title:/ {
      sub(/^    title: *"?/, "")
      sub(/"?[[:space:]]*$/, "")
      title = $0
    }
    /^    description:/ {
      sub(/^    description: *"?/, "")
      sub(/"?[[:space:]]*$/, "")
      desc = $0
    }
    /^    due_on:/ {
      sub(/^    due_on: *"?/, "")
      sub(/"?[[:space:]]*$/, "")
      due = $0
    }
    /^    state:/ {
      sub(/^    state: */, "")
      state = $0
    }
    END {
      if (num != "") print num "|" title "|" desc "|" due "|" state
    }
  ' "$CONFIG"
}

if [ "$DRY_RUN" -eq 1 ]; then
  echo "=== DRY RUN — Milestones to create/update in ${REPO} ==="
  parse_phases | while IFS='|' read -r num title desc due state; do
    [ -z "$num" ] && continue
    printf "  • #%s %s\n    state=%s  due=%s\n    desc=%s\n" \
      "$num" "$title" "$state" "$due" "$desc"
  done
  echo "=== END DRY RUN — gh api 호출 없음 ==="
  exit 0
fi

if ! command -v gh >/dev/null; then
  echo "ERROR: gh CLI 필요 (또는 --dry-run 사용)" >&2
  exit 1
fi

parse_phases | while IFS='|' read -r num title desc due state; do
  [ -z "$num" ] && continue
  existing=$(gh api "repos/${REPO}/milestones?state=all&per_page=100" \
    --jq ".[] | select(.title==\"$title\") | .number" 2>/dev/null | head -1 || true)
  if [ -n "$existing" ]; then
    echo "UPDATE milestone #$existing: $title"
    gh api -X PATCH "repos/${REPO}/milestones/${existing}" \
      -f title="$title" \
      -f description="$desc" \
      -f due_on="$due" \
      -f state="$state" >/dev/null
  else
    echo "CREATE milestone: $title"
    gh api -X POST "repos/${REPO}/milestones" \
      -f title="$title" \
      -f description="$desc" \
      -f due_on="$due" \
      -f state="$state" >/dev/null
  fi
  sleep 1
done

echo "✅ Milestones 동기화 완료 (${REPO})"
