#!/usr/bin/env bash
# C-3: BLUEPRINT.md 버전 자동 범프 — F515
#
# Usage:
#   bash scripts/bump-blueprint.sh <new_phase> [--dry-run]
#
# Examples:
#   bash scripts/bump-blueprint.sh 37
#   bash scripts/bump-blueprint.sh 37 --dry-run
#
# Updates:
#   - YAML frontmatter: version (1.{new_phase}), updated
#   - H1 제목의 버전
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BLUEPRINT="${REPO_ROOT}/docs/BLUEPRINT.md"

NEW_PHASE="${1:-}"
DRY_RUN=false
shift 1 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

[ -z "$NEW_PHASE" ] && { echo "Usage: $0 <new_phase> [--dry-run]" >&2; exit 2; }
[[ "$NEW_PHASE" =~ ^[0-9]+$ ]] || { echo "새 Phase 번호는 정수여야 해요: ${NEW_PHASE}" >&2; exit 2; }
[ -f "$BLUEPRINT" ] || { echo "[bump-blueprint] docs/BLUEPRINT.md 없음" >&2; exit 1; }

TODAY=$(date +%Y-%m-%d)
NEW_VER="1.${NEW_PHASE}"

# 현재 version 추출
CURRENT_VER=$(grep -oP '^version: \K[\d.]+' "$BLUEPRINT" || echo "1.0")

if $DRY_RUN; then
  echo "[bump-blueprint] DRY-RUN — 실제 파일 변경 없음"
  echo ""
  echo "Changes:"
  echo "  version: ${CURRENT_VER} → ${NEW_VER}"
  echo "  updated: → ${TODAY}"
  echo "  H1 제목: Foundry-X Blueprint v${CURRENT_VER} → Foundry-X Blueprint v${NEW_VER}"
  exit 0
fi

# 1. frontmatter version 갱신
sed -i "s/^version: .*/version: ${NEW_VER}/" "$BLUEPRINT"

# 2. frontmatter updated 갱신
sed -i "s/^updated: .*/updated: ${TODAY}/" "$BLUEPRINT"

# 3. H1 제목 갱신
sed -i "s/^# Foundry-X Blueprint v[0-9.]*/# Foundry-X Blueprint v${NEW_VER}/" "$BLUEPRINT"

echo "[bump-blueprint] docs/BLUEPRINT.md 버전 범프 완료"
echo "  version: ${CURRENT_VER} → ${NEW_VER}"
echo "  updated: ${TODAY}"
