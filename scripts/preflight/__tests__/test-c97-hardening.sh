#!/usr/bin/env bash
# TDD Red — C97 하드닝 4축 검증
# test(preflight): C97 red — shared build + wrangler auth + lint gate + run-all

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

assert_true() {
  local label="$1"
  shift
  ((TOTAL++))
  local actual_exit=0
  "$@" >/dev/null 2>&1 || actual_exit=$?
  if [ "$actual_exit" -eq 0 ]; then
    printf '\033[32m[PASS]\033[0m %s\n' "$label"
    ((PASS_COUNT++))
  else
    printf '\033[31m[FAIL]\033[0m %s\n' "$label"
    ((FAIL_COUNT++))
  fi
}

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
    printf '\033[32m[PASS]\033[0m %s (contains "%s")\n' "$label" "$expected_text"
    ((PASS_COUNT++))
  else
    printf '\033[31m[FAIL]\033[0m %s — missing "%s"\n' "$label" "$expected_text"
    printf '       actual head:\n'
    echo "$output" | head -5 | sed 's/^/         /'
    ((FAIL_COUNT++))
  fi
}

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  C97 하드닝 테스트 (shared build + wrangler auth + lint + run-all)"
echo "════════════════════════════════════════════════════════════"

# ─── (a) deploy.yml test 잡 shared build 일관성 ──────────────────────────
echo ""
echo "─── (a) shared 선빌드 일관성 ───"

# A1: deploy.yml test 잡에 '@foundry-x/shared build' 스텝 존재 (bash -c for pipeline)
# Note: awk '/^  test:/{found=1;next} ...' — 시작 라인 자체가 end pattern 매칭하지 않도록 skip
assert_true "A1: deploy.yml test job has pnpm --filter @foundry-x/shared build" \
  bash -c "awk '/^  test:/{found=1;next} found && /^  [a-z]/{exit} found' .github/workflows/deploy.yml | grep -q '@foundry-x/shared build'"

# A2: deploy.yml test 잡 shared-contracts build도 유지 (regression)
assert_true "A2: deploy.yml test job still has shared-contracts build" \
  bash -c "awk '/^  test:/{found=1;next} found && /^  [a-z]/{exit} found' .github/workflows/deploy.yml | grep -q '@foundry-x/shared-contracts build'"

# ─── (b) wrangler check preflight ────────────────────────────────────────
echo ""
echo "─── (b) wrangler check preflight ───"

# B1: check-wrangler-auth.sh 파일 존재
assert_true "B1: scripts/preflight/check-wrangler-auth.sh exists" \
  test -f "scripts/preflight/check-wrangler-auth.sh"

# B2: deploy-gate-x.yml deploy 잡에 D1 바인딩 체크 존재
assert_true "B2: deploy-gate-x.yml deploy job has check-d1-bindings.sh" \
  bash -c "awk '/^  deploy:/{found=1;next} found && /^  [a-z]/{exit} found' .github/workflows/deploy-gate-x.yml | grep -q 'check-d1-bindings.sh'"

# B3: check-wrangler-auth.sh — CF_API_TOKEN 없으면 exit 1
assert_exit "B3: check-wrangler-auth.sh fails without token (exit 1)" 1 \
  env CF_API_TOKEN="" CLOUDFLARE_API_TOKEN="" \
  WRANGLER_AUTH_MOCK_STATUS="skip" \
  bash scripts/preflight/check-wrangler-auth.sh

# B4: check-wrangler-auth.sh — mock PASS → exit 0
assert_exit "B4: check-wrangler-auth.sh passes with mock PASS (exit 0)" 0 \
  env CLOUDFLARE_API_TOKEN="test-token" \
  WRANGLER_AUTH_MOCK_STATUS="pass" \
  bash scripts/preflight/check-wrangler-auth.sh

# B5: check-wrangler-auth.sh — mock FAIL → exit 1
assert_exit "B5: check-wrangler-auth.sh fails with mock FAIL (exit 1)" 1 \
  env CLOUDFLARE_API_TOKEN="test-token" \
  WRANGLER_AUTH_MOCK_STATUS="fail" \
  bash scripts/preflight/check-wrangler-auth.sh

# ─── (c) lint pre-check ───────────────────────────────────────────────────
echo ""
echo "─── (c) lint pre-check ───"

# C1: check-lint.sh 파일 존재
assert_true "C1: scripts/preflight/check-lint.sh exists" \
  test -f "scripts/preflight/check-lint.sh"

# C2: check-lint.sh — LINT_SKIP=1 환경에서 exit 0 (dry-run)
assert_exit "C2: check-lint.sh with LINT_SKIP=1 exits 0" 0 \
  env LINT_SKIP=1 \
  bash scripts/preflight/check-lint.sh

# C3: check-lint.sh — LINT_MOCK_FAIL=1 → exit 1
assert_exit "C3: check-lint.sh with LINT_MOCK_FAIL=1 exits 1" 1 \
  env LINT_MOCK_FAIL=1 \
  bash scripts/preflight/check-lint.sh

# ─── (d) run-all.sh + lib.sh ────────────────────────────────────────────
echo ""
echo "─── (d) run-all.sh + lib.sh ───"

# D1: run-all.sh 파일 존재
assert_true "D1: scripts/preflight/run-all.sh exists" \
  test -f "scripts/preflight/run-all.sh"

# D2: lib.sh 파일 존재
assert_true "D2: scripts/preflight/lib.sh exists" \
  test -f "scripts/preflight/lib.sh"

# D3: run-all.sh — DRY_RUN=1 → check-*.sh 개수 출력 포함
assert_output_contains "D3: run-all.sh DRY_RUN=1 lists check scripts" "check-" \
  env DRY_RUN=1 bash scripts/preflight/run-all.sh

# D4: lib.sh source 가능 (syntax 오류 없음)
assert_exit "D4: lib.sh sources without errors" 0 \
  bash -c "source scripts/preflight/lib.sh"

# ─── Summary ─────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════"
printf "  결과: PASS=%s / FAIL=%s / TOTAL=%s\n" "$PASS_COUNT" "$FAIL_COUNT" "$TOTAL"
echo "════════════════════════════════════════════════════════════"

[ "$FAIL_COUNT" -eq 0 ]
