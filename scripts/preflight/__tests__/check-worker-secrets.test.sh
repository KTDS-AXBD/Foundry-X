#!/usr/bin/env bash
# TDD Red — C83 check-worker-secrets.sh 동작 검증
# test(preflight): C83 red — check-worker-secrets behavior

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

SCRIPT="scripts/preflight/check-worker-secrets.sh"

PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

assert_exit() {
  local label="$1"
  local expected_exit="$2"
  shift 2
  local actual_exit=0
  "$@" >/dev/null 2>&1 || actual_exit=$?
  ((TOTAL++))
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    printf '\033[32m[PASS]\033[0m %s (exit %s)\n' "$label" "$actual_exit"
    ((PASS_COUNT++))
  else
    printf '\033[31m[FAIL]\033[0m %s — expected exit %s, got %s\n' "$label" "$expected_exit" "$actual_exit"
    ((FAIL_COUNT++))
  fi
}

assert_output_contains() {
  local label="$1"
  local expected_text="$2"
  shift 2
  local output
  output=$("$@" 2>&1) || true
  ((TOTAL++))
  if echo "$output" | grep -q "$expected_text"; then
    printf '\033[32m[PASS]\033[0m %s (output contains "%s")\n' "$label" "$expected_text"
    ((PASS_COUNT++))
  else
    printf '\033[31m[FAIL]\033[0m %s — output missing "%s"\n' "$label" "$expected_text"
    printf '       actual: %s\n' "$(echo "$output" | head -5)"
    ((FAIL_COUNT++))
  fi
}

# ─── Setup: mock wrangler binaries ───────────────────────────────────
TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

MOCK_MATRIX="$TMPDIR_TEST/required-secrets.json"
cat > "$MOCK_MATRIX" <<'EOF'
{
  "fx-offering": ["JWT_SECRET"],
  "fx-discovery": ["JWT_SECRET"],
  "fx-gateway": []
}
EOF

MOCK_WRANGLER_FULL="$TMPDIR_TEST/wrangler-full"
cat > "$MOCK_WRANGLER_FULL" <<'MOCKEOF'
#!/usr/bin/env bash
echo '[{"name":"JWT_SECRET","type":"secret_text"}]'
MOCKEOF
chmod +x "$MOCK_WRANGLER_FULL"

MOCK_WRANGLER_EMPTY="$TMPDIR_TEST/wrangler-empty"
cat > "$MOCK_WRANGLER_EMPTY" <<'MOCKEOF'
#!/usr/bin/env bash
echo '[]'
MOCKEOF
chmod +x "$MOCK_WRANGLER_EMPTY"

MOCK_MATRIX_GW_ONLY="$TMPDIR_TEST/matrix-gw.json"
cat > "$MOCK_MATRIX_GW_ONLY" <<'EOF'
{"fx-gateway": []}
EOF

# ─── Tests ───────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  C83 check-worker-secrets.sh tests"
echo "════════════════════════════════════════════════════════════"

# T1: 모든 secret 존재 → exit 0
assert_exit "T1: all secrets present → exit 0" 0 \
  env WRANGLER_BIN="$MOCK_WRANGLER_FULL" MATRIX_FILE="$MOCK_MATRIX" bash "$SCRIPT"

# T2: secret 누락 → exit 1
assert_exit "T2: missing secret → exit 1" 1 \
  env WRANGLER_BIN="$MOCK_WRANGLER_EMPTY" MATRIX_FILE="$MOCK_MATRIX" bash "$SCRIPT"

# T3: 누락 시 출력에 MISSING + worker 이름 포함
assert_output_contains "T3: missing → output shows MISSING" "MISSING" \
  env WRANGLER_BIN="$MOCK_WRANGLER_EMPTY" MATRIX_FILE="$MOCK_MATRIX" bash "$SCRIPT"

assert_output_contains "T4: missing → output shows worker name" "fx-offering" \
  env WRANGLER_BIN="$MOCK_WRANGLER_EMPTY" MATRIX_FILE="$MOCK_MATRIX" bash "$SCRIPT"

# T5: required list가 빈 worker(fx-gateway) → exit 0
assert_exit "T5: empty required list → exit 0" 0 \
  env WRANGLER_BIN="$MOCK_WRANGLER_EMPTY" MATRIX_FILE="$MOCK_MATRIX_GW_ONLY" bash "$SCRIPT"

# T6: wrangler binary 없음 → exit 1
assert_exit "T6: missing wrangler binary → exit 1" 1 \
  env WRANGLER_BIN="/nonexistent/wrangler" MATRIX_FILE="$MOCK_MATRIX" bash "$SCRIPT"

# T7: matrix file 없음 → exit 1
assert_exit "T7: missing matrix file → exit 1" 1 \
  env WRANGLER_BIN="$MOCK_WRANGLER_FULL" MATRIX_FILE="/nonexistent/matrix.json" bash "$SCRIPT"

# ─── Summary ─────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
printf "  결과: PASS=%s / FAIL=%s / TOTAL=%s\n" "$PASS_COUNT" "$FAIL_COUNT" "$TOTAL"
echo "════════════════════════════════════════════════════════════"

[ "$FAIL_COUNT" -eq 0 ]
