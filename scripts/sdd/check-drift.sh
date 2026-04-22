#!/usr/bin/env bash
#
# SDD Triangle Drift Check (F565)
#
# SPEC.md §5 F-item 등록 vs git commit 메시지 교차 검증.
# 커밋이 참조하는 F-item이 SPEC §5에 없으면 "drift" — PR fail.
#
# Usage:
#   bash scripts/sdd/check-drift.sh
#   SPEC_FILE=SPEC.md COMMIT_RANGE=origin/master...HEAD bash scripts/sdd/check-drift.sh
#
# Env:
#   SPEC_FILE      — SPEC.md 경로 (default: SPEC.md)
#   COMMIT_RANGE   — git log range (default: origin/master...HEAD)
#   SINCE_DATE     — git --since= 인자 (주간 모드, COMMIT_RANGE보다 우선)
#   REPORT_MODE    — true 시 전체 리포트 출력 (default: false)
#   MOCK_GIT_LOG   — 테스트용: 이 파일 경로의 내용을 git log 결과로 사용
#
# Exit code:
#   0 — drift 0건 (PASS) 또는 SKIP
#   1 — drift ≥ 1건 (PR FAIL)

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

SPEC_FILE="${SPEC_FILE:-SPEC.md}"
COMMIT_RANGE="${COMMIT_RANGE:-origin/master...HEAD}"
SINCE_DATE="${SINCE_DATE:-}"
REPORT_MODE="${REPORT_MODE:-false}"
MOCK_GIT_LOG="${MOCK_GIT_LOG:-}"

c_pass='\033[32m'; c_fail='\033[31m'; c_warn='\033[33m'; c_info='\033[36m'; c_reset='\033[0m'
log_pass() { printf "${c_pass}[PASS]${c_reset}  %s\n" "$*"; }
log_fail() { printf "${c_fail}[FAIL]${c_reset}  %s\n" "$*"; }
log_info() { printf "${c_info}[INFO]${c_reset}  %s\n" "$*"; }
log_skip() { printf "${c_warn}[SKIP]${c_reset}  %s\n" "$*"; }

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  SDD Triangle Drift Check (F565)"
if [ -n "$SINCE_DATE" ]; then
  echo "  Mode: weekly (--since=$SINCE_DATE)"
else
  echo "  Range: $COMMIT_RANGE"
fi
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: SPEC.md 존재 확인
if [ ! -f "$SPEC_FILE" ]; then
  log_skip "SPEC_FILE ($SPEC_FILE) 없음 — SDD drift check 건너뜀"
  exit 0
fi

# Step 2: SPEC §5 F-item 번호 추출 (| F\d{3,} | 패턴)
spec_f_items=$(grep -E "^\| F[0-9]{3,}" "$SPEC_FILE" | \
  grep -oE "\bF[0-9]{3,}\b" | \
  sort -u || true)

spec_count=$(echo "$spec_f_items" | grep -c "[A-Z]" 2>/dev/null || echo "0")
spec_count="${spec_count%%[^0-9]*}"
log_info "SPEC §5 등록 F-item: ${spec_count}개"

# Step 3: git commit F-item 번호 추출
commit_f_items=""
if [ -n "$MOCK_GIT_LOG" ] && [ -f "$MOCK_GIT_LOG" ]; then
  commit_f_items=$(grep -oE "\bF[0-9]{3,}\b" "$MOCK_GIT_LOG" | sort -u || true)
elif [ -n "$SINCE_DATE" ]; then
  # Subject만 스캔 — body에는 테스트/문서 설명에 F-번호가 포함될 수 있음
  commit_f_items=$(git log --since="$SINCE_DATE" --format="%s" 2>/dev/null | \
    grep -oE "\bF[0-9]{3,}\b" | sort -u || true)
else
  # Subject만 스캔 — body에는 테스트/문서 설명에 F-번호가 포함될 수 있음
  commit_f_items=$(git log "$COMMIT_RANGE" --format="%s" 2>/dev/null | \
    grep -oE "\bF[0-9]{3,}\b" | sort -u || true)
fi

commit_count=$(echo "$commit_f_items" | grep -c "[A-Z]" 2>/dev/null || echo "0")
commit_count="${commit_count%%[^0-9]*}"
log_info "커밋 참조 F-item: ${commit_count}개"

if [ -z "$commit_f_items" ] || [ "${commit_count:-0}" -eq 0 ]; then
  log_skip "커밋에서 F-item 참조 없음 — drift 없음"
  echo ""
  log_pass "SDD Drift: 0건 (PASS)"
  exit 0
fi

# Step 4: Drift Type A — 커밋 참조 but SPEC 미등록
drift_items=""
while IFS= read -r fnum; do
  [ -z "$fnum" ] && continue
  if ! echo "$spec_f_items" | grep -q "^${fnum}$"; then
    drift_items="${drift_items}${fnum}\n"
  fi
done <<< "$commit_f_items"

drift_count=$(printf "%b" "$drift_items" | grep -c "[A-Z]" 2>/dev/null || echo "0")
drift_count="${drift_count%%[^0-9]*}"

# Step 5: 결과 출력
echo ""
if [ "$drift_count" -gt 0 ]; then
  log_fail "SDD Drift ${drift_count}건 감지 — SPEC §5 등록 누락:"
  printf "%b" "$drift_items" | grep "." | while IFS= read -r item; do
    printf "    ${c_fail}✗${c_reset}  %s — SPEC §5에 없음\n" "$item"
  done
  echo ""
  printf "  ${c_warn}해결 방법${c_reset}: SPEC.md §5에 위 F-item row를 추가하고 커밋하세요.\n"
  echo ""

  if [ "$REPORT_MODE" = "true" ]; then
    REPORT_DATE=$(date +%Y%m%d)
    REPORT_FILE="drift-report-${REPORT_DATE}.md"
    {
      echo "# SDD Drift Report — ${REPORT_DATE}"
      echo ""
      echo "## 감지된 Drift"
      echo ""
      printf "%b" "$drift_items" | grep "." | while IFS= read -r item; do
        echo "- **${item}**: 커밋에서 참조되었으나 SPEC §5에 미등록"
      done
      echo ""
      echo "## 통계"
      echo ""
      echo "| 항목 | 수치 |"
      echo "|------|------|"
      echo "| SPEC §5 등록 F-item | ${spec_count}개 |"
      echo "| 커밋 참조 F-item | ${commit_count}개 |"
      echo "| Drift (미등록) | ${drift_count}건 |"
    } > "$REPORT_FILE"
    log_info "리포트 생성: $REPORT_FILE"
  fi

  exit 1
else
  log_pass "SDD Drift: 0건 (PASS)"
  echo ""

  if [ "$REPORT_MODE" = "true" ]; then
    REPORT_DATE=$(date +%Y%m%d)
    REPORT_FILE="drift-report-${REPORT_DATE}.md"
    {
      echo "# SDD Drift Report — ${REPORT_DATE}"
      echo ""
      echo "## 결과: PASS (drift 0건)"
      echo ""
      echo "## 통계"
      echo ""
      echo "| 항목 | 수치 |"
      echo "|------|------|"
      echo "| SPEC §5 등록 F-item | ${spec_count}개 |"
      echo "| 커밋 참조 F-item | ${commit_count}개 |"
      echo "| Drift (미등록) | 0건 |"
    } > "$REPORT_FILE"
    log_info "리포트 생성: $REPORT_FILE"
  fi

  exit 0
fi
