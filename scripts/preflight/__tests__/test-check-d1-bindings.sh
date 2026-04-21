#!/usr/bin/env bash
# TDD Red — C90 check-d1-bindings.sh 동작 검증
# test(preflight): C90 red — D1 binding preflight behavior

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

SCRIPT="scripts/preflight/check-d1-bindings.sh"

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
    printf '       actual output head:\n'
    echo "$output" | head -8 | sed 's/^/         /'
    ((FAIL_COUNT++))
  fi
}

# ─── Setup: fixture dirs ──────────────────────────────────────────────
TMPDIR_TEST=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TEST"' EXIT

# Fixture packages with real-looking wrangler.toml files
PACKAGES_DIR="$TMPDIR_TEST/packages"

mkdir -p "$PACKAGES_DIR/pkg-a"
cat > "$PACKAGES_DIR/pkg-a/wrangler.toml" << 'EOF'
name = "test-worker-a"
account_id = "b6c06059b413892a92f150e5ca496236"

[[d1_databases]]
binding = "DB"
database_name = "test-db"
database_id = "aaaaaaaa-0000-0000-0000-000000000001"

[[d1_databases]]
binding = "SECONDARY_DB"
database_name = "secondary-db"
database_id = "bbbbbbbb-0000-0000-0000-000000000002"
EOF

mkdir -p "$PACKAGES_DIR/pkg-b"
cat > "$PACKAGES_DIR/pkg-b/wrangler.toml" << 'EOF'
name = "test-worker-b"
account_id = "b6c06059b413892a92f150e5ca496236"

[[d1_databases]]
binding = "DB"
database_name = "test-db"
database_id = "aaaaaaaa-0000-0000-0000-000000000001"

[[env.dev.d1_databases]]
binding = "DB"
database_name = "test-db-dev"
database_id = "cccccccc-0000-0000-0000-000000000003"
EOF

mkdir -p "$PACKAGES_DIR/pkg-tbd"
cat > "$PACKAGES_DIR/pkg-tbd/wrangler.toml" << 'EOF'
name = "test-worker-tbd"
account_id = "b6c06059b413892a92f150e5ca496236"

[[d1_databases]]
binding = "DB"
database_name = "future-db"
database_id = "TBD"
EOF

# Fixture for TBD-only scenario
PACKAGES_TBD="$TMPDIR_TEST/packages-tbd"
mkdir -p "$PACKAGES_TBD/pkg-tbd"
cp "$PACKAGES_DIR/pkg-tbd/wrangler.toml" "$PACKAGES_TBD/pkg-tbd/"

# ─── Mock CF API response directories ────────────────────────────────
# Scenario A: all DBs exist
RESP_ALL_EXIST="$TMPDIR_TEST/resp-all"
mkdir -p "$RESP_ALL_EXIST"
echo '{"result":{"uuid":"aaaaaaaa-0000-0000-0000-000000000001","name":"test-db"},"success":true,"errors":[]}' \
  > "$RESP_ALL_EXIST/aaaaaaaa-0000-0000-0000-000000000001.json"
echo '{"result":{"uuid":"bbbbbbbb-0000-0000-0000-000000000002","name":"secondary-db"},"success":true,"errors":[]}' \
  > "$RESP_ALL_EXIST/bbbbbbbb-0000-0000-0000-000000000002.json"

# Scenario B: bbbbbbbb missing (file absent → script returns not-found response)
RESP_MISSING="$TMPDIR_TEST/resp-missing"
mkdir -p "$RESP_MISSING"
echo '{"result":{"uuid":"aaaaaaaa-0000-0000-0000-000000000001","name":"test-db"},"success":true,"errors":[]}' \
  > "$RESP_MISSING/aaaaaaaa-0000-0000-0000-000000000001.json"
# bbbbbbbb intentionally absent

# Scenario C: CF API auth failure (code 10000)
RESP_AUTH_FAIL="$TMPDIR_TEST/resp-auth"
mkdir -p "$RESP_AUTH_FAIL"
printf '{"result":null,"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}\n' \
  > "$RESP_AUTH_FAIL/aaaaaaaa-0000-0000-0000-000000000001.json"
printf '{"result":null,"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}\n' \
  > "$RESP_AUTH_FAIL/bbbbbbbb-0000-0000-0000-000000000002.json"

# ─── Tests ───────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
echo "  C90 check-d1-bindings.sh tests"
echo "════════════════════════════════════════════════════════════"

# Scenario A: 모든 DB 존재 → exit 0
assert_exit "A: all DBs exist → exit 0" 0 \
  env PACKAGES_DIR="$PACKAGES_DIR" \
      CF_ACCOUNT_ID="test-account" \
      CF_API_TOKEN="test-token" \
      CF_MOCK_RESP_DIR="$RESP_ALL_EXIST" \
      bash "$SCRIPT"

# Scenario B: 1개 DB 누락 → exit 1
assert_exit "B: missing DB → exit 1" 1 \
  env PACKAGES_DIR="$PACKAGES_DIR" \
      CF_ACCOUNT_ID="test-account" \
      CF_API_TOKEN="test-token" \
      CF_MOCK_RESP_DIR="$RESP_MISSING" \
      bash "$SCRIPT"

# Scenario B2: 누락 DB ID가 출력에 포함
assert_output_contains "B2: missing → output shows DB ID" "bbbbbbbb-0000-0000-0000-000000000002" \
  env PACKAGES_DIR="$PACKAGES_DIR" \
      CF_ACCOUNT_ID="test-account" \
      CF_API_TOKEN="test-token" \
      CF_MOCK_RESP_DIR="$RESP_MISSING" \
      bash "$SCRIPT"

# Scenario C: CF API 인증 실패 → exit 2
assert_exit "C: auth failure → exit 2" 2 \
  env PACKAGES_DIR="$PACKAGES_DIR" \
      CF_ACCOUNT_ID="test-account" \
      CF_API_TOKEN="test-token" \
      CF_MOCK_RESP_DIR="$RESP_AUTH_FAIL" \
      bash "$SCRIPT"

# Scenario D: TBD database_id만 있는 경우 → SKIP → exit 0
assert_exit "D: TBD db_id skipped → exit 0" 0 \
  env PACKAGES_DIR="$PACKAGES_TBD" \
      CF_ACCOUNT_ID="test-account" \
      CF_API_TOKEN="test-token" \
      CF_MOCK_RESP_DIR="$RESP_ALL_EXIST" \
      bash "$SCRIPT"

# Scenario E: env.dev 블록은 체크 안 함
# pkg-b의 cccccccc (env.dev)는 mock에 없지만 exit 0이어야 함
assert_exit "E: env.dev bindings not checked → exit 0" 0 \
  env PACKAGES_DIR="$PACKAGES_DIR" \
      CF_ACCOUNT_ID="test-account" \
      CF_API_TOKEN="test-token" \
      CF_MOCK_RESP_DIR="$RESP_ALL_EXIST" \
      bash "$SCRIPT"

# Scenario F: CF_API_TOKEN 없으면 exit 1
assert_exit "F: missing CF_API_TOKEN → exit 1" 1 \
  env PACKAGES_DIR="$PACKAGES_DIR" \
      CF_ACCOUNT_ID="test-account" \
      CF_MOCK_RESP_DIR="$RESP_ALL_EXIST" \
      bash "$SCRIPT"

# ─── Summary ─────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
printf "  결과: PASS=%s / FAIL=%s / TOTAL=%s\n" "$PASS_COUNT" "$FAIL_COUNT" "$TOTAL"
echo "════════════════════════════════════════════════════════════"

[ "$FAIL_COUNT" -eq 0 ]
