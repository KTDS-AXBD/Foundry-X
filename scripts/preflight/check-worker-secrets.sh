#!/usr/bin/env bash
#
# MSA Worker Secret Preflight (C83)
#
# S303 사고(fx-offering JWT_SECRET 미주입 → 401 루프) 재발 방지.
# deploy 전에 각 worker의 필수 secret 존재를 확인한다.
#
# Usage:
#   bash scripts/preflight/check-worker-secrets.sh
#
# Env:
#   CLOUDFLARE_API_TOKEN — wrangler auth (CI: secrets.CLOUDFLARE_API_TOKEN)
#   WRANGLER_BIN        — wrangler 경로 (default: packages/api/node_modules/.bin/wrangler)
#   MATRIX_FILE         — required-secrets.json 경로 (default: scripts/preflight/required-secrets.json)
#
# Exit code:
#   0 — 모든 worker 필수 secret PASS (또는 required list 비어있어 skip)
#   1 — 하나 이상 MISSING 또는 환경 오류

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

WRANGLER_BIN="${WRANGLER_BIN:-packages/api/node_modules/.bin/wrangler}"
MATRIX_FILE="${MATRIX_FILE:-scripts/preflight/required-secrets.json}"

FAIL_COUNT=0
PASS_COUNT=0
SKIP_COUNT=0

log_pass() { printf '\033[32m[PASS]\033[0m  %s\n' "$*"; ((PASS_COUNT++)); }
log_fail() { printf '\033[31m[FAIL]\033[0m  %s\n' "$*"; ((FAIL_COUNT++)); }
log_skip() { printf '\033[33m[SKIP]\033[0m  %s\n' "$*"; ((SKIP_COUNT++)); }
log_info() { printf '\033[36m[INFO]\033[0m  %s\n' "$*"; }

check_prerequisites() {
  local ok=true

  if [ ! -f "$WRANGLER_BIN" ]; then
    log_fail "wrangler not found: $WRANGLER_BIN — pnpm install 후 재시도"
    ok=false
  fi

  if [ ! -f "$MATRIX_FILE" ]; then
    log_fail "Required secrets matrix not found: $MATRIX_FILE"
    ok=false
  fi

  if ! command -v jq &>/dev/null; then
    log_fail "jq is required but not installed"
    ok=false
  fi

  $ok || exit 1
}

# wrangler secret list JSON에서 secret 이름 목록 추출
parse_secret_names() {
  local raw="$1"
  # wrangler가 JSON 앞에 프리앰블 텍스트를 출력할 수 있으므로 '[' 위치부터 파싱
  echo "$raw" | jq -r '.[].name' 2>/dev/null || echo ""
}

check_worker() {
  local worker_name="$1"
  local required_list="$2"  # space-separated secret names

  if [ -z "$required_list" ]; then
    log_skip "[$worker_name] required secrets 없음 (service binding only)"
    return 0
  fi

  log_info "[$worker_name] wrangler secret list 조회 중..."

  local raw_output
  if ! raw_output=$("$WRANGLER_BIN" secret list --name "$worker_name" 2>&1); then
    log_fail "[$worker_name] wrangler secret list 실패: $(echo "$raw_output" | head -3)"
    return 1
  fi

  local present_names
  present_names=$(parse_secret_names "$raw_output")

  local worker_ok=true
  for secret in $required_list; do
    if echo "$present_names" | grep -qx "$secret"; then
      : # present
    else
      log_fail "[$worker_name] MISSING secret: $secret"
      worker_ok=false
    fi
  done

  if $worker_ok; then
    log_pass "[$worker_name] 모든 필수 secret 존재"
    return 0
  fi
  return 1
}

main() {
  echo "════════════════════════════════════════════════════════════"
  echo "  MSA Worker Secret Preflight (C83)"
  echo "  Matrix: $MATRIX_FILE"
  echo "════════════════════════════════════════════════════════════"
  echo ""

  check_prerequisites

  local workers
  workers=$(jq -r 'keys[]' "$MATRIX_FILE")

  for worker in $workers; do
    local required_list
    required_list=$(jq -r --arg w "$worker" '.[$w] | if length > 0 then .[] else empty end' "$MATRIX_FILE" 2>/dev/null | tr '\n' ' ')
    check_worker "$worker" "$required_list" || true
  done

  echo ""
  echo "════════════════════════════════════════════════════════════"
  printf "  결과: PASS=%s / FAIL=%s / SKIP=%s\n" "$PASS_COUNT" "$FAIL_COUNT" "$SKIP_COUNT"
  echo "════════════════════════════════════════════════════════════"

  if [ "$FAIL_COUNT" -gt 0 ]; then
    echo ""
    echo "❌ Secret Preflight FAIL — 누락 secret을 주입 후 재배포"
    echo "   주입: wrangler secret put <KEY> --name <WORKER>"
    exit 1
  fi

  echo ""
  echo "✅ Secret Preflight PASS — 모든 worker 필수 secret 확인 완료"
  exit 0
}

main "$@"
