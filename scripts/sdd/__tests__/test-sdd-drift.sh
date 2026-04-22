#!/usr/bin/env bash
# TDD Red — F565 SDD Triangle drift check 동작 검증
# test(sdd): F565 red — SPEC §5 vs git commit cross-check

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

SCRIPT="scripts/sdd/check-drift.sh"

PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

c_pass='\033[32m'; c_fail='\033[31m'; c_reset='\033[0m'

assert_exit() {
  local name="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" -eq "$expected" ]; then
    printf "${c_pass}[PASS]${c_reset} %s (exit %d)\n" "$name" "$actual"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    printf "${c_fail}[FAIL]${c_reset} %s — expected exit %d, got exit %d\n" "$name" "$expected" "$actual"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# ─── Setup: fixture 파일 ───────────────────────────────────────────
TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# Fixture: F565가 등록된 SPEC.md
SPEC_WITH_F565="$TMPDIR_TEST/spec_has_f565.md"
cat > "$SPEC_WITH_F565" << 'SPEC_EOF'
## §5 F-items

| F565 | **Phase 45 · SDD Triangle 동기화 CI 게이트** | Sprint 317 | 🔧(design) | FX-REQ-608 |
| F560 | **Phase 45 · Discovery 완전 이관** | Sprint 312 | ✅ | PR #654 |
SPEC_EOF

# Fixture: F999가 없는 SPEC.md (F565만 있음)
SPEC_NO_F999="$TMPDIR_TEST/spec_no_f999.md"
cp "$SPEC_WITH_F565" "$SPEC_NO_F999"

# Mock git log: F565만 참조
MOCK_LOG_F565="$TMPDIR_TEST/mock_log_f565.txt"
printf "feat: F565 green — sdd drift check implementation\n" > "$MOCK_LOG_F565"

# Mock git log: F999 참조 (SPEC에 없는 F-item)
MOCK_LOG_F999="$TMPDIR_TEST/mock_log_f999.txt"
printf "feat: F999 green — unregistered feature\n" > "$MOCK_LOG_F999"

# Mock git log: F-item 참조 없음
MOCK_LOG_EMPTY="$TMPDIR_TEST/mock_log_empty.txt"
printf "docs: update readme\nchore: lint fix\n" > "$MOCK_LOG_EMPTY"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  SDD Drift Check Tests — F565"
echo "════════════════════════════════════════════════════════════"
echo ""

# T1: PASS — 커밋이 F565 참조, SPEC에 F565 있음 → drift 0
(
  SPEC_FILE="$SPEC_WITH_F565" \
  MOCK_GIT_LOG="$MOCK_LOG_F565" \
  bash "$SCRIPT" 2>/dev/null
)
assert_exit "T1: commit refs F565 + SPEC has F565 → no drift" 0 $?

# T2: FAIL — 커밋이 F999 참조, SPEC에 F999 없음 → drift 1건
(
  SPEC_FILE="$SPEC_NO_F999" \
  MOCK_GIT_LOG="$MOCK_LOG_F999" \
  bash "$SCRIPT" 2>/dev/null
)
assert_exit "T2: commit refs F999 + SPEC missing F999 → drift detected" 1 $?

# T3: PASS — 커밋에 F-item 참조 없음 → drift 0
(
  SPEC_FILE="$SPEC_WITH_F565" \
  MOCK_GIT_LOG="$MOCK_LOG_EMPTY" \
  bash "$SCRIPT" 2>/dev/null
)
assert_exit "T3: no F-item refs in commits → no drift" 0 $?

# T4: PASS — SPEC 파일 없음 → SKIP (exit 0)
(
  SPEC_FILE="$TMPDIR_TEST/nonexistent.md" \
  MOCK_GIT_LOG="$MOCK_LOG_F565" \
  bash "$SCRIPT" 2>/dev/null
)
assert_exit "T4: SPEC file missing → SKIP (exit 0)" 0 $?

# T5: PASS — 복수 F-item, 모두 SPEC에 있음
MOCK_LOG_MULTI="$TMPDIR_TEST/mock_log_multi.txt"
printf "feat: F565 green — drift check\nfeat: F560 hotfix — discovery\n" > "$MOCK_LOG_MULTI"
(
  SPEC_FILE="$SPEC_WITH_F565" \
  MOCK_GIT_LOG="$MOCK_LOG_MULTI" \
  bash "$SCRIPT" 2>/dev/null
)
assert_exit "T5: multiple F-items, all in SPEC → no drift" 0 $?

# T6: FAIL — 복수 F-item 중 일부 SPEC에 없음
MOCK_LOG_PARTIAL="$TMPDIR_TEST/mock_log_partial.txt"
printf "feat: F565 green — drift check\nfeat: F888 green — unregistered\n" > "$MOCK_LOG_PARTIAL"
(
  SPEC_FILE="$SPEC_WITH_F565" \
  MOCK_GIT_LOG="$MOCK_LOG_PARTIAL" \
  bash "$SCRIPT" 2>/dev/null
)
assert_exit "T6: F565 OK but F888 unregistered → drift detected" 1 $?

echo ""
echo "────────────────────────────────────────────────────────────"
printf "  결과: %d PASS / %d FAIL / %d TOTAL\n" "$PASS_COUNT" "$FAIL_COUNT" "$TOTAL"
echo "────────────────────────────────────────────────────────────"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  printf "${c_pass}ALL PASS${c_reset}\n"
  exit 0
else
  printf "${c_fail}FAIL: %d/${TOTAL}${c_reset}\n" "$FAIL_COUNT"
  exit 1
fi
