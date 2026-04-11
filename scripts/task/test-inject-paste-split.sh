#!/usr/bin/env bash
# test-inject-paste-split.sh — C31 inject bracket paste workaround 검증
# shellcheck: SC2034 변수 미사용 허용 (test assertion 변수)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/task-start.sh"

PASS=0
FAIL=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✅ PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $desc"
    echo "     expected=$expected  actual=$actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_zero() {
  local desc="$1" actual="$2"
  assert_eq "$desc" "0" "$actual"
}

assert_nonzero() {
  local desc="$1" actual="$2"
  if [ "$actual" -ne 0 ]; then
    echo "  ✅ PASS: $desc (count=$actual)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $desc — expected >0 but got 0"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== test-inject-paste-split.sh ==="
echo ""
echo "Target: $TARGET"
echo ""

# --- Test 1: INJECT_SCRIPT heredoc 내부 send-keys 총 호출 수 (4회 이상) ---
# 분리 후: /rename(text) /rename(Enter) /ax:session-start(text) /ax:session-start(Enter) = 최소 4회
# + boot 단계의 ccs 실행 1회 = 5회 이상 (4회 검사는 분리분만 세므로 ≥4이면 OK)
SENDKEYS_IN_HEREDOC=$(
  awk '/cat > "\$INJECT_SCRIPT" << INJECT_EOF/,/^INJECT_EOF$/' "$TARGET" \
    | grep -c 'tmux send-keys' || true
)
echo "--- Test 1: INJECT heredoc send-keys 총 호출 수 ---"
assert_nonzero "INJECT heredoc 내 send-keys 호출이 4회 이상" "$SENDKEYS_IN_HEREDOC"
# 정확히 5회: ccs(1) + /rename text(1) + /rename Enter(1) + /ax:session-start text(1) + /ax:session-start Enter(1)
assert_eq "INJECT heredoc 내 send-keys 정확히 5회" "5" "$SENDKEYS_IN_HEREDOC"

echo ""

# --- Test 2: /rename 이 Enter 와 같은 send-keys 호출에 없는지 ---
# 분리 후 패턴: send-keys 라인에 /rename 포함 AND Enter 포함은 없어야 함
RENAME_COMBINED=$(
  awk '/cat > "\$INJECT_SCRIPT" << INJECT_EOF/,/^INJECT_EOF$/' "$TARGET" \
    | grep 'tmux send-keys' \
    | grep '/rename' \
    | grep -c 'Enter' || true
)
echo "--- Test 2: /rename + Enter 동일 send-keys 호출 부재 ---"
assert_zero "/rename과 Enter가 같은 send-keys 호출에 없음" "$RENAME_COMBINED"

echo ""

# --- Test 3: /ax:session-start 가 Enter 와 같은 send-keys 호출에 없는지 ---
SESSION_START_COMBINED=$(
  awk '/cat > "\$INJECT_SCRIPT" << INJECT_EOF/,/^INJECT_EOF$/' "$TARGET" \
    | grep 'tmux send-keys' \
    | grep 'session-start' \
    | grep -c 'Enter' || true
)
echo "--- Test 3: /ax:session-start + Enter 동일 send-keys 호출 부재 ---"
assert_zero "/ax:session-start와 Enter가 같은 send-keys 호출에 없음" "$SESSION_START_COMBINED"

echo ""

# --- Test 4: /rename 용 sleep 0.3 존재 ---
RENAME_SLEEP=$(
  awk '/# Step 3: \/rename/,/sleep 1/' "$TARGET" \
    | grep -c 'sleep 0\.3' || true
)
echo "--- Test 4: /rename 분리 후 sleep 0.3 존재 ---"
assert_nonzero "sleep 0.3 (rename 분리 gap)" "$RENAME_SLEEP"

echo ""

# --- Test 5: /ax:session-start 용 sleep 0.5 존재 ---
SESSION_SLEEP=$(
  awk '/# Step 4: \/ax:session-start/,/echo \[inject\]/' "$TARGET" \
    | grep -c 'sleep 0\.5' || true
)
echo "--- Test 5: /ax:session-start 분리 후 sleep 0.5 존재 ---"
assert_nonzero "sleep 0.5 (session-start 분리 gap)" "$SESSION_SLEEP"

echo ""

# --- Test 6: C31 fix 주석 갱신 확인 ---
C31_COMMENT=$(grep -c 'S260 C31 fix: text/Enter 분리로 bracket paste workaround' "$TARGET" || true)
echo "--- Test 6: C31 fix 주석 포함 ---"
assert_nonzero "C31 fix 주석 존재" "$C31_COMMENT"

echo ""

# --- Test 7: bash syntax check ---
echo "--- Test 7: bash 문법 검사 ---"
if bash -n "$TARGET" 2>/dev/null; then
  echo "  ✅ PASS: bash -n syntax OK"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL: bash syntax error"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== 결과: PASS=$PASS  FAIL=$FAIL ==="

if [ "$FAIL" -eq 0 ]; then
  echo "✅ ALL TESTS PASSED"
  exit 0
else
  echo "❌ SOME TESTS FAILED"
  exit 1
fi
