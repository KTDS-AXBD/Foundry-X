#!/usr/bin/env bash
# rename-pdca-output.sh — C101 (b)
#
# PDCA 산출물 deviation(`sprint-{N}.{analysis,report}.md`)을 GOV-001 표준명
# (`FX-{ANLS|RPRT}-{NNN}_sprint-{N}-{kind}.md`)으로 자동 변환하고 INDEX.md에 등재.
#
# Usage:
#   rename-pdca-output.sh [--dry-run] [--quiet] [<file>...]
#
# - 인자 없음: docs/03-analysis + docs/04-report 전수 스캔
# - 인자 있음: 지정 파일만 처리 (autopilot pipeline에서 단건 호출)
# - --dry-run: 변경 없이 계획만 출력
# - --quiet: deviation 0건 시 stdout 침묵 (selfcheck/autopilot 통합용)
#
# Exit codes:
#   0  성공 (처리 0건 포함)
#   1  파일 시스템 에러
#   2  args 오류

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "❌ git 저장소가 아닙니다" >&2; exit 1; }
cd "$REPO_ROOT"

INDEX_FILE="docs/INDEX.md"
[ -f "$INDEX_FILE" ] || { echo "❌ $INDEX_FILE 없음" >&2; exit 1; }

DRY_RUN=0
QUIET=0
TARGETS=()

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --quiet)   QUIET=1 ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    -*)
      echo "❌ 알 수 없는 옵션: $arg" >&2
      exit 2
      ;;
    *) TARGETS+=("$arg") ;;
  esac
done

# Default scan
if [ ${#TARGETS[@]} -eq 0 ]; then
  while IFS= read -r f; do
    [ -n "$f" ] && TARGETS+=("$f")
  done < <(find docs/03-analysis docs/04-report -type f \
            \( -name 'sprint-*.analysis.md' -o -name 'sprint-*.report.md' \) 2>/dev/null)
fi

if [ ${#TARGETS[@]} -eq 0 ]; then
  [ $QUIET -eq 0 ] && echo "✅ deviation 0건 — 정리 불필요"
  exit 0
fi

# 다음 ID 발급 (INDEX.md 전체 grep)
next_id() {
  local kind="$1"  # ANLS or RPRT
  local max
  max=$(grep -oE "FX-${kind}-[0-9]+" "$INDEX_FILE" 2>/dev/null | grep -oE '[0-9]+$' | sort -n | tail -1)
  printf "%03d" "$((10#${max:-0} + 1))"
}

# Title 추출 — frontmatter `title:` 또는 첫 H1 또는 fallback
extract_title() {
  local f="$1" fallback="$2"
  local t
  # YAML frontmatter title:
  t=$(awk '/^---$/{c++; next} c==1 && /^title:/{sub(/^title:[[:space:]]*/,""); gsub(/^"|"$/,""); print; exit}' "$f" 2>/dev/null)
  [ -n "$t" ] && { printf "%s" "$t" | head -c 120; return; }
  # 첫 # heading
  t=$(grep -m1 '^# ' "$f" 2>/dev/null | sed 's/^# //')
  [ -n "$t" ] && { printf "%s" "$t" | head -c 120; return; }
  printf "%s" "$fallback"
}

declare -A NEXT_IDS
PROCESSED=0
SKIPPED=0

for FILE in "${TARGETS[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "⚠️ 파일 없음: $FILE" >&2
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  BASENAME=$(basename "$FILE")
  DIRNAME=$(dirname "$FILE")

  # Kind / suffix / target dir 결정
  case "$BASENAME" in
    *.analysis.md) KIND="ANLS"; SUFFIX="analysis"; NEW_DIR_BASE="docs/03-analysis" ;;
    *.report.md)   KIND="RPRT"; SUFFIX="report";   NEW_DIR_BASE="docs/04-report" ;;
    *)
      echo "⚠️ 패턴 미일치: $FILE" >&2
      SKIPPED=$((SKIPPED + 1))
      continue
      ;;
  esac

  # 이미 표준명이면 skip
  if [[ "$BASENAME" =~ ^FX-${KIND}-[0-9]+_ ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Sequential ID allocation (배치 내 누적)
  if [ -z "${NEXT_IDS[$KIND]:-}" ]; then
    NEXT_IDS[$KIND]=$(next_id "$KIND")
  else
    NEXT_IDS[$KIND]=$(printf "%03d" $((10#${NEXT_IDS[$KIND]} + 1)))
  fi
  ID="${NEXT_IDS[$KIND]}"

  # Slug = sprint-319.analysis.md → sprint-319
  SLUG_BASE=$(echo "$BASENAME" | sed -E 's/\.(analysis|report)\.md$//')
  NEW_NAME="FX-${KIND}-${ID}_${SLUG_BASE}-${SUFFIX}.md"

  # features/ 하위면 features/ 유지, 그 외엔 base에 직접
  case "$DIRNAME" in
    "$NEW_DIR_BASE"/features) NEW_DIR="$NEW_DIR_BASE/features" ;;
    "$NEW_DIR_BASE")          NEW_DIR="$NEW_DIR_BASE" ;;
    *)                        NEW_DIR="$DIRNAME" ;;  # 비표준 위치 보존
  esac
  NEW_PATH="${NEW_DIR}/${NEW_NAME}"

  echo "📋 ${FILE}"
  echo "  → ${NEW_PATH}"

  if [ $DRY_RUN -eq 1 ]; then
    PROCESSED=$((PROCESSED + 1))
    continue
  fi

  if ! git mv "$FILE" "$NEW_PATH" 2>&1; then
    echo "  ❌ git mv 실패 (대상 이미 존재 또는 staged 충돌)" >&2
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # INDEX.md 행 추가 (append-only, 정렬은 별도)
  REL_PATH="${NEW_PATH#docs/}"
  TITLE=$(extract_title "$NEW_PATH" "${SLUG_BASE} ${SUFFIX}")
  ROW="| FX-${KIND}-${ID} | ${TITLE} | 1.0 | Active | [${REL_PATH}](${REL_PATH}) |"
  echo "$ROW" >> "$INDEX_FILE"

  PROCESSED=$((PROCESSED + 1))
done

# INDEX 헤더 갱신 (총 GOV 문서 수 + 갱신일)
if [ $PROCESSED -gt 0 ] && [ $DRY_RUN -eq 0 ]; then
  TOTAL=$(grep -cE '^\| FX-[A-Z]+-' "$INDEX_FILE" || echo 0)
  TODAY=$(date +%Y-%m-%d)
  # `> 마지막 갱신: ...` + `> 총 GOV 문서: N개 ...` 갱신
  sed -i -E "s/^> 마지막 갱신:.*/> 마지막 갱신: ${TODAY}/" "$INDEX_FILE"
  sed -i -E "s/^> 총 GOV 문서: [0-9]+개/> 총 GOV 문서: ${TOTAL}개/" "$INDEX_FILE"
fi

if [ $PROCESSED -gt 0 ]; then
  if [ $DRY_RUN -eq 1 ]; then
    echo ""
    echo "🔍 dry-run: ${PROCESSED}건 변경 예정 (skipped ${SKIPPED}건)"
  else
    echo ""
    echo "✅ ${PROCESSED}건 rename + INDEX.md 등재 완료 (skipped ${SKIPPED}건)"
    echo "   다음 단계: git diff 검토 후 commit"
  fi
elif [ $QUIET -eq 0 ]; then
  echo "✅ 처리 대상 0건 (skipped ${SKIPPED}건 — 이미 표준명 또는 무관 파일)"
fi
