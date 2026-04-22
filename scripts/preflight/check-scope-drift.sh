#!/usr/bin/env bash
#
# Scope Drift Check (C81)
#
# SPEC §5 F-item 범위 vs 실제 커밋 파일 변경 대조.
# Sprint 311 F560 dogfood 재발 방지 — autopilot이 원 범위 외 파일 변경 시 경고.
#
# Usage:
#   bash scripts/preflight/check-scope-drift.sh <SPRINT_NUM> [COMMIT_RANGE]
#   SPRINT_NUM=315 bash scripts/preflight/check-scope-drift.sh
#
# Env:
#   SPRINT_NUM       — Sprint 번호 (필수, 또는 $1)
#   COMMIT_RANGE     — git diff range (default: origin/master...HEAD, 또는 $2)
#   SPEC_FILE        — SPEC.md 경로 (default: SPEC.md)
#   MOCK_GIT_DIFF    — 테스트용: 이 파일 경로의 내용을 git diff 결과로 사용
#   DRIFT_THRESHOLD  — drift 경고 임계값 % (default: 50)
#
# Exit code:
#   0 — drift < threshold (PASS) 또는 SKIP (패턴 없음 / 파일 변경 없음 / SPRINT_NUM 없음)
#   1 — drift >= threshold (WARN — scope drift 감지)

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

SPRINT_NUM="${SPRINT_NUM:-${1:-}}"
COMMIT_RANGE="${COMMIT_RANGE:-${2:-origin/master...HEAD}}"
SPEC_FILE="${SPEC_FILE:-SPEC.md}"
MOCK_GIT_DIFF="${MOCK_GIT_DIFF:-}"
DRIFT_THRESHOLD="${DRIFT_THRESHOLD:-50}"

c_pass='\033[32m'; c_fail='\033[31m'; c_warn='\033[33m'; c_info='\033[36m'; c_reset='\033[0m'
log_pass() { printf "${c_pass}[PASS]${c_reset}  %s\n" "$*"; }
log_warn() { printf "${c_warn}[WARN]${c_reset}  %s\n" "$*"; }
log_info() { printf "${c_info}[INFO]${c_reset}  %s\n" "$*"; }
log_skip() { printf "${c_warn}[SKIP]${c_reset}  %s\n" "$*"; }

if [ -z "$SPRINT_NUM" ]; then
  log_skip "SPRINT_NUM 미설정 — scope drift check 건너뜀"
  log_skip "사용법: SPRINT_NUM=N bash $0"
  exit 0
fi

if [ ! -f "$SPEC_FILE" ]; then
  log_skip "SPEC_FILE ($SPEC_FILE) 없음 — 건너뜀"
  exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Scope Drift Check (C81) — Sprint $SPRINT_NUM"
echo "  Range: $COMMIT_RANGE"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: SPEC §5에서 Sprint N F-item 행 추출
spec_rows=$(grep "Sprint ${SPRINT_NUM}[^0-9]" "$SPEC_FILE" | grep "^|" || true)

if [ -z "$spec_rows" ]; then
  log_skip "SPEC에서 Sprint $SPRINT_NUM 항목을 찾을 수 없음 — 건너뜀"
  exit 0
fi

row_count=$(echo "$spec_rows" | wc -l)
log_info "SPEC Sprint $SPRINT_NUM 행 ${row_count}개 발견"

# Step 2: 백틱 인용 경로 패턴 추출 (슬래시 포함 항목만)
patterns=$(echo "$spec_rows" | \
  grep -o '`[^`]*`' | \
  tr -d '`' | \
  grep '/' | \
  grep -v '^http' | \
  sort -u || true)

log_info "추출된 경로 패턴 ($(echo "$patterns" | grep -c . 2>/dev/null || echo 0)개):"
if [ -n "$patterns" ]; then
  echo "$patterns" | sed 's/^/    /'
else
  echo "    (없음)"
fi
echo ""

if [ -z "$patterns" ]; then
  log_skip "SPEC 행에서 추출 가능한 경로 패턴 없음 — 건너뜀"
  exit 0
fi

# Step 3: 변경 파일 목록 취득
if [ -n "$MOCK_GIT_DIFF" ]; then
  changed_files=$(grep -v '^$' "$MOCK_GIT_DIFF" 2>/dev/null || true)
else
  changed_files=$(git diff --name-only "$COMMIT_RANGE" 2>/dev/null || true)
fi

if [ -z "$changed_files" ]; then
  log_skip "변경 파일 없음 ($COMMIT_RANGE) — 건너뜀"
  exit 0
fi

total_files=$(echo "$changed_files" | grep -c . || echo 0)
log_info "변경 파일 수: $total_files"
echo ""

# Step 4: 각 변경 파일의 패턴 매칭 여부 확인
matched=0
unmatched=0
unmatched_list=()

while IFS= read -r file; do
  [ -n "$file" ] || continue
  file_matched=false

  while IFS= read -r pattern; do
    [ -n "$pattern" ] || continue
    # glob * 제거 후 substring 매칭
    pat_clean="${pattern//\*/}"
    [ -n "$pat_clean" ] || continue
    if [[ "$file" == *"$pat_clean"* ]]; then
      file_matched=true
      break
    fi
  done <<< "$patterns"

  if $file_matched; then
    ((matched++)) || true
    printf "  ${c_pass}✓${c_reset} %s\n" "$file"
  else
    ((unmatched++)) || true
    unmatched_list+=("$file")
    printf "  ${c_warn}✗${c_reset} %s\n" "$file"
  fi
done <<< "$changed_files"

echo ""

# Step 5: drift 계산
drift_pct=$(( unmatched * 100 / total_files ))

echo "────────────────────────────────────────────────────────────"
printf "  Matched: %s / Unmatched: %s / Total: %s\n" "$matched" "$unmatched" "$total_files"
printf "  Drift: %s%% (임계값: %s%%)\n" "$drift_pct" "$DRIFT_THRESHOLD"
echo "────────────────────────────────────────────────────────────"
echo ""

if [ "$drift_pct" -ge "$DRIFT_THRESHOLD" ]; then
  log_warn "🔶 SCOPE DRIFT DETECTED — Drift ${drift_pct}% ≥ ${DRIFT_THRESHOLD}%"
  echo ""
  if [ "${#unmatched_list[@]}" -gt 0 ]; then
    echo "  범위 외 변경 파일:"
    printf '    %s\n' "${unmatched_list[@]}"
  fi
  echo ""
  echo "  권장 조치:"
  echo "    1. 변경 파일이 SPEC F-item 범위 내인지 확인하세요"
  echo "    2. 범위 외 변경이 의도적이라면: SPEC §5 해당 F-item 비고에 사유 기록"
  echo "    3. 실수라면: 변경 되돌리기 후 재구현"
  echo "    4. Gap Analysis 재실행 권장"
  exit 1
fi

log_pass "Scope Drift PASS — Drift ${drift_pct}% < ${DRIFT_THRESHOLD}%"
exit 0
