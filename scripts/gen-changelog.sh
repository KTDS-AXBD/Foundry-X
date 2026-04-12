#!/usr/bin/env bash
# C-5: CHANGELOG.md 자동 생성/추가 — git log + F-item 매핑 — F515
#
# Usage:
#   bash scripts/gen-changelog.sh [--since <tag_or_hash>] [--dry-run]
#   bash scripts/gen-changelog.sh --since v1.8.0
#   bash scripts/gen-changelog.sh --since HEAD~20 --dry-run
#
# 동작:
#   1. git log에서 feat/fix 커밋 수집
#   2. F-item 번호(F[0-9]+) + PR 번호(#[0-9]+) 추출
#   3. SPEC.md에서 F-item 제목 조회
#   4. CHANGELOG.md [Unreleased] 섹션에 신규 항목 삽입 (중복 제외)
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CHANGELOG="${REPO_ROOT}/CHANGELOG.md"
SPEC="${REPO_ROOT}/SPEC.md"

SINCE=""
DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --since) SINCE="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

[ -f "$CHANGELOG" ] || { echo "[gen-changelog] CHANGELOG.md 없음" >&2; exit 1; }

# git log 범위 결정
if [ -n "$SINCE" ]; then
  GIT_RANGE="${SINCE}..HEAD"
else
  # 기본: 최근 tag 이후
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [ -n "$LAST_TAG" ]; then
    GIT_RANGE="${LAST_TAG}..HEAD"
  else
    GIT_RANGE="HEAD~30"
  fi
fi

echo "[gen-changelog] git log 범위: ${GIT_RANGE}"

# git log에서 feat/fix/chore 커밋 수집 (merge 커밋 제외)
COMMITS=$(git log "$GIT_RANGE" --no-merges --oneline --format="%H %s" 2>/dev/null || true)

if [ -z "$COMMITS" ]; then
  echo "[gen-changelog] 해당 범위에 커밋이 없어요."
  exit 0
fi

# F-item 제목 조회 (SPEC.md 테이블에서)
get_fitem_title() {
  local fitem="$1"
  if [ -f "$SPEC" ]; then
    awk -F'|' -v f="$fitem" '$2 ~ ("^ *"f" *$") {
      title = $3
      gsub(/^ +| +$/, "", title)
      # REQ 코드, Priority 제거: "제목 (FX-REQ-NNN, P0)" → "제목"
      sub(/ *\(FX-REQ-[^)]+\)/, "", title)
      sub(/ *\([Pp][0-9]\)/, "", title)
      gsub(/^ +| +$/, "", title)
      print title
      exit
    }' "$SPEC"
  fi
}

# 이미 CHANGELOG에 있는 F-item 목록
already_in_changelog() {
  local fitem="$1"
  grep -q "\*\*${fitem}\*\*" "$CHANGELOG" 2>/dev/null
}

# 각 커밋에서 항목 생성
declare -a NEW_ENTRIES=()
declare -A SEEN_FITEMS=()

while IFS= read -r line; do
  [ -z "$line" ] && continue
  HASH=$(echo "$line" | cut -d' ' -f1)
  MSG=$(echo "$line" | cut -d' ' -f2-)

  # F-item 번호 추출 (F[0-9]{3,4})
  FITEM=$(echo "$MSG" | grep -oP 'F[0-9]{3,4}' | head -1 || true)
  # PR 번호 추출 (#[0-9]+)
  PR=$(echo "$MSG" | grep -oP '#[0-9]+' | head -1 | tr -d '#' || true)

  [ -z "$FITEM" ] && continue
  [ -n "${SEEN_FITEMS[$FITEM]:-}" ] && continue
  already_in_changelog "$FITEM" && continue

  SEEN_FITEMS[$FITEM]=1

  TITLE=$(get_fitem_title "$FITEM")
  PR_PART=""
  [ -n "$PR" ] && PR_PART=", PR #${PR}"

  if [ -n "$TITLE" ]; then
    ENTRY="- **${FITEM}** (${MSG%%—*}${PR_PART}): ${TITLE}"
  else
    # SPEC에서 못 찾은 경우 commit 메시지 그대로
    ENTRY="- **${FITEM}**${PR_PART}: ${MSG}"
  fi

  NEW_ENTRIES+=("$ENTRY")
done <<< "$COMMITS"

if [ ${#NEW_ENTRIES[@]} -eq 0 ]; then
  echo "[gen-changelog] 추가할 새 항목이 없어요 (이미 CHANGELOG에 있거나 F-item 없는 커밋만)."
  exit 0
fi

echo ""
echo "새로 추가될 항목:"
for entry in "${NEW_ENTRIES[@]}"; do
  echo "  ${entry}"
done

if $DRY_RUN; then
  echo ""
  echo "[gen-changelog] DRY-RUN 완료 — 실제 파일 변경 없음"
  exit 0
fi

# [Unreleased] 섹션의 ### Added 다음 줄에 삽입
# 패턴: "### Added" 다음 빈 줄 이후, 첫 번째 "- " 항목 앞에
ENTRIES_TEXT=$(printf '%s\n' "${NEW_ENTRIES[@]}")

# sed: "### Added" 다음 줄 직후에 삽입
python3 - "$CHANGELOG" "$ENTRIES_TEXT" << 'PYEOF'
import sys, re

changelog_path = sys.argv[1]
new_entries = sys.argv[2]

with open(changelog_path, 'r', encoding='utf-8') as f:
    content = f.read()

# [Unreleased] → ### Added 섹션 찾기
# "### Added\n" 다음에 새 항목 삽입
insert_marker = "### Added\n"
if insert_marker not in content:
    # ### Added 없으면 [Unreleased] 다음에 삽입
    insert_marker = "## [Unreleased]\n"
    replacement = insert_marker + "\n### Added\n" + new_entries + "\n"
else:
    replacement = insert_marker + new_entries + "\n"

content = content.replace(insert_marker, replacement, 1)

with open(changelog_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"[gen-changelog] {len(new_entries.splitlines())}개 항목 추가 완료")
PYEOF
