#!/usr/bin/env bash
# C67 — record-sprint.sh signal fallback 테스트
# TDD Red→Green: 3가지 케이스 검증
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECORD="$SCRIPT_DIR/velocity/record-sprint.sh"
PASS=0
FAIL=0

ok()   { echo "  ✅ $*"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL: $*"; FAIL=$((FAIL+1)); }

assert_eq() {
  local label="$1" got="$2" want="$3"
  if [ "$got" = "$want" ]; then ok "$label = $want"
  else fail "$label: got='$got' want='$want'"; fi
}

assert_ne() {
  local label="$1" got="$2" unwant="$3"
  if [ "$got" != "$unwant" ]; then ok "$label != '$unwant' (got '$got')"
  else fail "$label: should not be '$unwant'"; fi
}

# --- 공통 임시 환경 설정 ---
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

SIG_DIR="$TMP_DIR/sprint-signals"
mkdir -p "$SIG_DIR"
OUT_DIR="$TMP_DIR/docs/metrics/velocity"
mkdir -p "$OUT_DIR"

# 테스트용 git repo (duration_minutes 계산용)
git -C "$TMP_DIR" init -q
git -C "$TMP_DIR" config user.email "test@test.com"
git -C "$TMP_DIR" config user.name "Test"
touch "$TMP_DIR/README.md"
git -C "$TMP_DIR" add README.md
git -C "$TMP_DIR" commit -q -m "init"

run_record() {
  local sprint_num="$1"
  cd "$TMP_DIR"
  SIGNAL_DIR="$SIG_DIR" bash "$RECORD" "$sprint_num" 2>&1 || true
}

read_json() {
  local file="$1" key="$2"
  (grep -oP "\"${key}\"\\s*:\\s*\\K(\"[^\"]*\"|null|[0-9]+)" "$file" 2>/dev/null || echo "") | head -1 | tr -d '"'
}

# ========================================================
# Case 1: .sprint-context 없고 signal만 있을 때
# ========================================================
echo ""
echo "Case 1: signal 파일만 있을 때 → signal 값 반영"

cat > "$SIG_DIR/Foundry-X-900.signal" <<SIG
STATUS=MERGED
SPRINT_NUM=900
PROJECT=Foundry-X
F_ITEMS=F900
BRANCH=sprint/900
MATCH_RATE=92
TEST_RESULT=pass
TIMESTAMP=2026-04-01T10:00:00+09:00
MERGED_AT=2026-04-01T01:00:00Z
SIG

run_record 900 >/dev/null

JSON900="$OUT_DIR/sprint-900.json"
assert_eq "f_items"    "$(read_json "$JSON900" f_items)"    "F900"
assert_eq "match_rate" "$(read_json "$JSON900" match_rate)" "92"
assert_eq "test_result" "$(read_json "$JSON900" test_result)" "pass"
assert_ne "created"    "$(read_json "$JSON900" created)"    ""

# ========================================================
# Case 2: .sprint-context 우선 (.sprint-context + signal 둘 다)
# ========================================================
echo ""
echo "Case 2: .sprint-context 있으면 우선 적용"

cat > "$SIG_DIR/Foundry-X-901.signal" <<SIG
STATUS=MERGED
SPRINT_NUM=901
F_ITEMS=F_SIGNAL
MATCH_RATE=50
TEST_RESULT=fail
TIMESTAMP=2026-04-02T10:00:00+09:00
SIG

cat > "$TMP_DIR/.sprint-context" <<CTX
SPRINT_NUM=901
F_ITEMS=F_CTX
MATCH_RATE=99
TEST_RESULT=pass
CREATED=2026-04-02T08:00:00+09:00
CTX

run_record 901 >/dev/null

JSON901="$OUT_DIR/sprint-901.json"
assert_eq "f_items (ctx wins)"    "$(read_json "$JSON901" f_items)"    "F_CTX"
assert_eq "match_rate (ctx wins)" "$(read_json "$JSON901" match_rate)" "99"
assert_eq "test_result (ctx wins)" "$(read_json "$JSON901" test_result)" "pass"

rm "$TMP_DIR/.sprint-context"

# ========================================================
# Case 3: 둘 다 없으면 empty/unknown (기존 동작 보존)
# ========================================================
echo ""
echo "Case 3: .sprint-context도 signal도 없으면 empty/unknown"

run_record 902 >/dev/null

JSON902="$OUT_DIR/sprint-902.json"
assert_eq "f_items empty"      "$(read_json "$JSON902" f_items)"    ""
assert_eq "test_result unknown" "$(read_json "$JSON902" test_result)" "unknown"

# ========================================================
# 결과 요약
# ========================================================
echo ""
echo "========================================"
echo "결과: PASS=$PASS  FAIL=$FAIL"
echo "========================================"
[ "$FAIL" -eq 0 ]
