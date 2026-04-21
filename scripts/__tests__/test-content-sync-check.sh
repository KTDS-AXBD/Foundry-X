#!/usr/bin/env bash
# test-content-sync-check.sh — C89 TDD: content-sync-check.sh expected 계산 버그 검증
# 실행: bash scripts/__tests__/test-content-sync-check.sh
# 종료코드: 0=전체 PASS, 1=FAIL 있음

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CHECK_SCRIPT="$SCRIPT_DIR/../content-sync-check.sh"

PASS=0
FAIL=0
ERRORS=()

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL: $1"; ERRORS+=("$1"); FAIL=$((FAIL+1)); }

# --- 픽스처 헬퍼 ---
make_fixture_dir() {
  local tmpdir
  tmpdir=$(mktemp -d)
  git -C "$tmpdir" init -q
  mkdir -p "$tmpdir/packages/web/content/landing"
  mkdir -p "$tmpdir/packages/web/src/routes"
  mkdir -p "$tmpdir/packages/web/src/components/landing"
  mkdir -p "$tmpdir/scripts"
  echo "$tmpdir"
}

make_spec() {
  local dir="$1"
  cat > "$dir/SPEC.md"
}

make_hero() {
  local dir="$1" sprint="$2" phase="$3"
  cat > "$dir/packages/web/content/landing/hero.md" <<EOF
---
value: "$sprint"
phase: "Phase $phase"
---
EOF
}

make_landing() {
  local dir="$1" sprint="$2" phase="$3"
  cat > "$dir/packages/web/src/routes/landing.tsx" <<EOF
const SITE_META = { sprint: "Sprint $sprint", phase: "Phase $phase" };
const STATS_FALLBACK = [{ value: "$sprint", label: "Sprints" }];
EOF
}

make_footer() {
  local dir="$1" sprint="$2" phase="$3"
  cat > "$dir/packages/web/src/components/landing/footer.tsx" <<EOF
// Sprint $sprint · Phase $phase
EOF
}

make_readme() {
  local dir="$1" sprint="$2" phase="$3"
  cat > "$dir/README.md" <<EOF
<!-- README_SYNC_START -->
| Phase | $phase (Sprint $sprint) |
| Sprints | $sprint 완료 |
<!-- README_SYNC_END -->
EOF
}

run_check() {
  local dir="$1"
  FOUNDRY_X_REPO_ROOT="$dir" bash "$CHECK_SCRIPT" 2>&1
}

run_check_exit() {
  local dir="$1"
  FOUNDRY_X_REPO_ROOT="$dir" bash "$CHECK_SCRIPT" >/dev/null 2>&1
  echo $?
}

# ────────────────────────────────────────────────
# Scenario A: ✅ row(Sprint 313, Phase 45) + 📋 row(Sprint 319, Phase 46)
#   → expected=313/45, actual=313/45 → exit 0 (no drift)
# ────────────────────────────────────────────────
echo ""
echo "Scenario A: ✅ max=313/45, 📋 row Sprint 319 존재 → expected=313/45, no drift"
TMPDIR_A=$(make_fixture_dir)

make_spec "$TMPDIR_A" <<'SPEC_EOF'
# SPEC

> **마지막 실측** (Sprint 313, 2026-04-21): ~11 routes — Phase 45 MSA MVP M2 달성.

## §5 F-items

| FN | 설명 | Sprint | 상태 | 비고 |
|----|------|--------|------|------|
| F562 | shared-contracts (FX-REQ-605, P0) | Sprint 313 | ✅ | PR #656 MERGED |
| F574 | wiki-sync 버그 fix (FX-REQ-624, P2) | Sprint 319 | 📋(groomed) | 계획 중 |
SPEC_EOF

make_hero "$TMPDIR_A" "313" "45"
make_landing "$TMPDIR_A" "313" "45"
make_footer "$TMPDIR_A" "313" "45"
make_readme "$TMPDIR_A" "313" "45"

OUTPUT_A=$(run_check "$TMPDIR_A" || true)
ACTUAL_EXIT_A=$(run_check_exit "$TMPDIR_A" || true)

if [ "$ACTUAL_EXIT_A" = "0" ]; then
  pass "Scenario A: exit 0 (no drift)"
else
  fail "Scenario A: exit $ACTUAL_EXIT_A (expected 0). output: $OUTPUT_A"
fi

if echo "$OUTPUT_A" | grep -q "OK"; then
  pass "Scenario A: output contains OK"
else
  fail "Scenario A: output does not contain OK. output: $OUTPUT_A"
fi

rm -rf "$TMPDIR_A"

# ────────────────────────────────────────────────
# Scenario B: ✅ row Sprint 313 + landing actual=311 → drift 감지 → exit 1
# ────────────────────────────────────────────────
echo ""
echo "Scenario B: ✅ max=313, landing=311 → drift 감지, exit 1"
TMPDIR_B=$(make_fixture_dir)

make_spec "$TMPDIR_B" <<'SPEC_EOF'
# SPEC

> **마지막 실측** (Sprint 313, 2026-04-21): ~11 routes — Phase 45 달성.

## §5 F-items

| FN | 설명 | Sprint | 상태 | 비고 |
|----|------|--------|------|------|
| F562 | shared-contracts (FX-REQ-605, P0) | Sprint 313 | ✅ | PR #656 MERGED |
SPEC_EOF

make_hero "$TMPDIR_B" "311" "45"
make_landing "$TMPDIR_B" "311" "45"
make_footer "$TMPDIR_B" "311" "45"
make_readme "$TMPDIR_B" "311" "45"

OUTPUT_B=$(run_check "$TMPDIR_B" || true)
ACTUAL_EXIT_B=$(run_check_exit "$TMPDIR_B" || true)

if [ "$ACTUAL_EXIT_B" = "1" ]; then
  pass "Scenario B: exit 1 (drift detected)"
else
  fail "Scenario B: exit $ACTUAL_EXIT_B (expected 1). output: $OUTPUT_B"
fi

if echo "$OUTPUT_B" | grep -q "DRIFT"; then
  pass "Scenario B: output contains DRIFT"
else
  fail "Scenario B: output does not contain DRIFT. output: $OUTPUT_B"
fi

rm -rf "$TMPDIR_B"

# ────────────────────────────────────────────────
# Scenario C: ✅ row 없음 (전부 📋) → gracefully skip (exit 0)
# ────────────────────────────────────────────────
echo ""
echo "Scenario C: ✅ row 없음 → graceful skip (no crash)"
TMPDIR_C=$(make_fixture_dir)

make_spec "$TMPDIR_C" <<'SPEC_EOF'
# SPEC

> **마지막 실측** (Sprint 313, 2026-04-21): ~11 routes — Phase 45 달성.

## §5 F-items

| FN | 설명 | Sprint | 상태 | 비고 |
|----|------|--------|------|------|
| F574 | wiki-sync 버그 fix (FX-REQ-624, P2) | Sprint 319 | 📋(groomed) | 계획 중 |
SPEC_EOF

make_hero "$TMPDIR_C" "313" "45"
make_landing "$TMPDIR_C" "313" "45"
make_footer "$TMPDIR_C" "313" "45"
make_readme "$TMPDIR_C" "313" "45"

OUTPUT_C=$(run_check "$TMPDIR_C" || true)
ACTUAL_EXIT_C=$(run_check_exit "$TMPDIR_C" || true)

if [ "$ACTUAL_EXIT_C" -le "1" ]; then
  pass "Scenario C: graceful exit $ACTUAL_EXIT_C (no crash)"
else
  fail "Scenario C: unexpected exit $ACTUAL_EXIT_C. output: $OUTPUT_C"
fi

rm -rf "$TMPDIR_C"

# ────────────────────────────────────────────────
# Scenario D: mixed ✅ rows → highest ✅ Sprint wins (not highest PLANNED)
# ────────────────────────────────────────────────
echo ""
echo "Scenario D: ✅ Sprint 312 + ✅ Sprint 313 + 📋 Sprint 319 → expected=313"
TMPDIR_D=$(make_fixture_dir)

make_spec "$TMPDIR_D" <<'SPEC_EOF'
# SPEC

> **마지막 실측** (Sprint 313, 2026-04-21): ~11 routes — Phase 45 MSA MVP M2 달성.

## §5 F-items

| FN | 설명 | Sprint | 상태 | 비고 |
|----|------|--------|------|------|
| F560 | Discovery 이관 (FX-REQ-603, P0) | Sprint 312 | ✅ | PR #654 MERGED |
| F562 | shared-contracts (FX-REQ-605, P0) | Sprint 313 | ✅ | PR #656 MERGED |
| F574 | wiki-sync 버그 fix (FX-REQ-624, P2) | Sprint 319 | 📋(groomed) | 계획 중 |
SPEC_EOF

make_hero "$TMPDIR_D" "313" "45"
make_landing "$TMPDIR_D" "313" "45"
make_footer "$TMPDIR_D" "313" "45"
make_readme "$TMPDIR_D" "313" "45"

OUTPUT_D=$(run_check "$TMPDIR_D" || true)
ACTUAL_EXIT_D=$(run_check_exit "$TMPDIR_D" || true)

if [ "$ACTUAL_EXIT_D" = "0" ]; then
  pass "Scenario D: exit 0 (✅ max=313 wins over 📋 319)"
else
  fail "Scenario D: exit $ACTUAL_EXIT_D. output: $OUTPUT_D"
fi

rm -rf "$TMPDIR_D"

# ────────────────────────────────────────────────
# 결과 요약
# ────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "결과: PASS=$PASS / FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "FAIL 목록:"
  for e in "${ERRORS[@]}"; do
    echo "  - $e"
  done
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
