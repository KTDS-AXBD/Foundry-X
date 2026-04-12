#!/usr/bin/env bash
# C-4: Phase 완료 시 docs/ 산출물 아카이브 자동화 — F515
#
# Usage:
#   bash scripts/archive-phase.sh <phase_num> [--dry-run]
#
# Examples:
#   bash scripts/archive-phase.sh 30 --dry-run   # 이동 대상만 나열
#   bash scripts/archive-phase.sh 30             # 실제 이동
#
# 아카이브 규칙:
#   1. docs/01-plan/features/ — sprint-N.plan.md (해당 Phase Sprint 범위)
#   2. docs/02-design/features/ — sprint-N.design.md
#   3. docs/03-analysis/features/ — sprint-N.analysis.md 등
#   4. docs/04-report/features/ — sprint-N.report.md 등
#   5. docs/specs/{phase-name}/ — Phase PRD 디렉토리
#
# Sprint-Phase 매핑 전략:
#   SPEC.md에서 "Phase N" 관련 Sprint 번호를 grep으로 추출하거나,
#   파일명에 sprint 번호가 포함된 경우 패턴 매칭.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DOCS="${REPO_ROOT}/docs"
SPEC="${REPO_ROOT}/SPEC.md"

PHASE_NUM="${1:-}"
DRY_RUN=false
shift 1 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

[ -z "$PHASE_NUM" ] && { echo "Usage: $0 <phase_num> [--dry-run]" >&2; exit 2; }
[[ "$PHASE_NUM" =~ ^[0-9]+$ ]] || { echo "Phase 번호는 정수여야 해요: ${PHASE_NUM}" >&2; exit 2; }

ARCHIVE_DIR="${DOCS}/archive/phase-${PHASE_NUM}"

# Phase N과 연관된 Sprint 번호 수집
# SPEC.md에서 "Phase N" 또는 "v{N}" 언급 라인의 Sprint 번호를 찾는다
# 예: "| Sprint 261 | ... | Phase 33 |" 또는 F-item 테이블에서 Phase 패턴
collect_sprint_nums() {
  # SPEC.md의 F-item 테이블에서 Phase N 관련 Sprint 추출
  # 형식: | F509 | ... | Sprint 261 | ... |
  # Phase 범위 별 Sprint 테이블이 있으면 참조, 없으면 빈 배열
  local phase="$1"
  if [ -f "$SPEC" ]; then
    # Phase N 기준으로 sprint 번호 추출 시도 (Phase row 이전의 Sprint들)
    grep -oP "Sprint \K[0-9]+" "$SPEC" 2>/dev/null | sort -u || true
  fi
}

# 아카이브 대상 파일 목록 수집
collect_targets() {
  local targets=()

  # 1. docs/01-plan/features/ — phase-{N} 포함 파일명 또는 직접 패턴
  while IFS= read -r -d '' f; do
    targets+=("$f")
  done < <(find "${DOCS}/01-plan/features" -maxdepth 1 -name "*phase-${PHASE_NUM}*" -print0 2>/dev/null)

  # 2. docs/02-design/features/
  while IFS= read -r -d '' f; do
    targets+=("$f")
  done < <(find "${DOCS}/02-design/features" -maxdepth 1 -name "*phase-${PHASE_NUM}*" -print0 2>/dev/null)

  # 3. docs/03-analysis/features/
  while IFS= read -r -d '' f; do
    targets+=("$f")
  done < <(find "${DOCS}/03-analysis/features" -maxdepth 1 -name "*phase-${PHASE_NUM}*" -print0 2>/dev/null)

  # 4. docs/04-report/features/
  while IFS= read -r -d '' f; do
    targets+=("$f")
  done < <(find "${DOCS}/04-report/features" -maxdepth 1 -name "*phase-${PHASE_NUM}*" -print0 2>/dev/null)

  # 5. docs/specs/ — Phase N PRD 디렉토리 (phase-N 또는 관련 이름 포함)
  while IFS= read -r -d '' d; do
    targets+=("$d")
  done < <(find "${DOCS}/specs" -maxdepth 1 -type d -name "*phase-${PHASE_NUM}*" -print0 2>/dev/null)

  printf '%s\n' "${targets[@]:-}"
}

TARGETS=$(collect_targets)

if [ -z "$TARGETS" ]; then
  echo "[archive-phase] Phase ${PHASE_NUM}에 해당하는 아카이브 대상 파일이 없어요."
  echo "  패턴: *phase-${PHASE_NUM}* in docs/01-plan/, docs/02-design/, docs/03-analysis/, docs/04-report/, docs/specs/"
  exit 0
fi

echo "[archive-phase] Phase ${PHASE_NUM} 아카이브 대상:"
echo "$TARGETS" | while read -r f; do
  [ -z "$f" ] && continue
  REL="${f#${REPO_ROOT}/}"
  echo "  → ${REL}"
done

if $DRY_RUN; then
  echo ""
  echo "[archive-phase] DRY-RUN 완료 — 실제 이동 없음"
  echo "  대상 디렉토리: docs/archive/phase-${PHASE_NUM}/"
  exit 0
fi

echo ""
read -rp "위 파일/디렉토리를 docs/archive/phase-${PHASE_NUM}/로 이동할까요? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "취소됨."; exit 0; }

mkdir -p "$ARCHIVE_DIR"

MOVED=0
echo "$TARGETS" | while read -r f; do
  [ -z "$f" ] && continue
  [ -e "$f" ] || continue
  TARGET_NAME="$(basename "$f")"
  if mv "$f" "${ARCHIVE_DIR}/${TARGET_NAME}"; then
    echo "  ✅ 이동: ${f#${REPO_ROOT}/} → archive/phase-${PHASE_NUM}/${TARGET_NAME}"
    MOVED=$((MOVED + 1))
  else
    echo "  ❌ 실패: ${f#${REPO_ROOT}/}" >&2
  fi
done

echo ""
echo "[archive-phase] Phase ${PHASE_NUM} 아카이브 완료 → docs/archive/phase-${PHASE_NUM}/"
