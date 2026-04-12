#!/usr/bin/env bash
# C-2: ROADMAP.md §1 Current Position 자동 갱신 — F515
#
# Usage:
#   bash scripts/update-roadmap.sh <sprint_num> "<f_items>" "<summary>" [--pr <pr_num>] [--dry-run]
#
# Examples:
#   bash scripts/update-roadmap.sh 266 "F515" "자동화 연결 5종" --pr 525
#   bash scripts/update-roadmap.sh 266 "F515" "자동화 연결 5종" --dry-run
#
# Updates:
#   - YAML frontmatter: version, updated
#   - H1 제목의 버전
#   - §1 Current Position: Last Sprint, Next Sprint
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ROADMAP="${REPO_ROOT}/docs/ROADMAP.md"

SPRINT_NUM="${1:-}"
F_ITEMS="${2:-}"
SUMMARY="${3:-}"
PR_NUM=""
DRY_RUN=false

shift 3 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr) PR_NUM="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

[ -z "$SPRINT_NUM" ] && { echo "Usage: $0 <sprint_num> <f_items> <summary> [--pr N] [--dry-run]" >&2; exit 2; }
[ -f "$ROADMAP" ] || { echo "[update-roadmap] docs/ROADMAP.md 없음" >&2; exit 1; }

TODAY=$(date +%Y-%m-%d)
NEXT_SPRINT=$((SPRINT_NUM + 1))
PR_SUFFIX=""
[ -n "$PR_NUM" ] && PR_SUFFIX=", PR #${PR_NUM}"

# 현재 version 추출 (frontmatter)
CURRENT_VER=$(grep -oP '^version: \K[\d.]+' "$ROADMAP" || echo "1.0")
NEW_VER="1.${SPRINT_NUM}"

# Last Sprint 줄 구성
LAST_LINE="- **Last Sprint**: ${SPRINT_NUM} (${F_ITEMS} ${SUMMARY}${PR_SUFFIX})"
NEXT_LINE="- **Next Sprint**: ${NEXT_SPRINT} (TBD)"

if $DRY_RUN; then
  echo "[update-roadmap] DRY-RUN — 실제 파일 변경 없음"
  echo ""
  echo "Changes:"
  echo "  version: ${CURRENT_VER} → ${NEW_VER}"
  echo "  updated: → ${TODAY}"
  echo "  H1 제목: Foundry-X Roadmap v${CURRENT_VER} → Foundry-X Roadmap v${NEW_VER}"
  echo "  Last Sprint: ${LAST_LINE}"
  echo "  Next Sprint: ${NEXT_LINE}"
  exit 0
fi

# 1. frontmatter version 갱신
sed -i "s/^version: .*/version: ${NEW_VER}/" "$ROADMAP"

# 2. frontmatter updated 갱신
sed -i "s/^updated: .*/updated: ${TODAY}/" "$ROADMAP"

# 3. H1 제목 갱신 (# Foundry-X Roadmap v...)
sed -i "s/^# Foundry-X Roadmap v[0-9.]*/# Foundry-X Roadmap v${NEW_VER}/" "$ROADMAP"

# 4. Last Sprint 줄 갱신
sed -i "s/^- \*\*Last Sprint\*\*:.*/$(echo "$LAST_LINE" | sed 's/[&/\\]/\\&/g')/" "$ROADMAP"

# 5. Next Sprint 줄 갱신
sed -i "s/^- \*\*Next Sprint\*\*:.*/$(echo "$NEXT_LINE" | sed 's/[&/\\]/\\&/g')/" "$ROADMAP"

echo "[update-roadmap] docs/ROADMAP.md 갱신 완료"
echo "  version: ${CURRENT_VER} → ${NEW_VER}"
echo "  Last Sprint: ${SPRINT_NUM} (${F_ITEMS}${PR_SUFFIX})"
echo "  Next Sprint: ${NEXT_SPRINT}"
