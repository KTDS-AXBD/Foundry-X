#!/usr/bin/env bash
#
# Wrangler Auth Check (C97/C78)
#
# S307 F561 사고(PoC 계정 D1 → prod 계정 wrangler.toml 불일치 → code 10181) 재발 방지.
# deploy 전에 CF API 토큰 유효성 + 계정 접근 가능 여부를 선검증.
# 실패 시 fail-fast로 이후 wrangler deploy 단계 진행 차단.
#
# Usage:
#   bash scripts/preflight/check-wrangler-auth.sh
#
# Env:
#   CF_API_TOKEN / CLOUDFLARE_API_TOKEN  — Cloudflare API token (둘 중 하나)
#   CF_ACCOUNT_ID                        — 계정 ID (없으면 wrangler.toml에서 자동 추출)
#   WRANGLER_AUTH_MOCK_STATUS            — 테스트용: "pass"|"fail" (설정 시 CF API 호출 건너뜀)
#
# Exit code:
#   0 — 토큰 유효, 계정 접근 PASS
#   1 — 토큰 누락 / 유효하지 않음 / 계정 접근 불가

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

CF_API_TOKEN="${CF_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
CF_ACCOUNT_ID="${CF_ACCOUNT_ID:-}"
WRANGLER_AUTH_MOCK_STATUS="${WRANGLER_AUTH_MOCK_STATUS:-}"

log_pass() { printf '\033[32m[PASS]\033[0m  %s\n' "$*"; }
log_fail() { printf '\033[31m[FAIL]\033[0m  %s\n' "$*"; }
log_info() { printf '\033[36m[INFO]\033[0m  %s\n' "$*"; }

# ─── Token 존재 확인 ─────────────────────────────────────────────────
if [ -z "$CF_API_TOKEN" ]; then
  log_fail "CF_API_TOKEN / CLOUDFLARE_API_TOKEN 미설정 — wrangler 인증 불가"
  exit 1
fi

# ─── Mock 모드 (테스트용) ─────────────────────────────────────────────
if [ -n "$WRANGLER_AUTH_MOCK_STATUS" ]; then
  if [ "$WRANGLER_AUTH_MOCK_STATUS" = "pass" ]; then
    log_pass "Wrangler auth PASS (mock mode)"
    exit 0
  else
    log_fail "Wrangler auth FAIL (mock mode: $WRANGLER_AUTH_MOCK_STATUS)"
    exit 1
  fi
fi

# ─── account_id 추출 (wrangler.toml) ────────────────────────────────
if [ -z "$CF_ACCOUNT_ID" ]; then
  CF_ACCOUNT_ID=$(grep -rh "^account_id" packages/*/wrangler.toml 2>/dev/null \
    | head -1 \
    | sed 's/.*= *"//;s/".*//' \
    | tr -d ' ')
fi

if [ -z "$CF_ACCOUNT_ID" ]; then
  log_fail "account_id 감지 실패 — wrangler.toml에 account_id 필드 확인 필요"
  exit 1
fi

log_info "account_id: $CF_ACCOUNT_ID"

# ─── CF API 계정 접근 확인 ───────────────────────────────────────────
HTTP_CODE=$(curl -s -o /tmp/wrangler-auth-resp.json -w "%{http_code}" \
  --max-time 15 \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID" 2>/dev/null || echo "ERR")

if [ "$HTTP_CODE" = "200" ]; then
  ACCOUNT_NAME=$(python3 -c "
import json, sys
try:
    d = json.load(open('/tmp/wrangler-auth-resp.json'))
    print(d.get('result', {}).get('name', 'unknown'))
except Exception:
    print('unknown')
" 2>/dev/null || echo "unknown")
  log_pass "Wrangler auth PASS — account: \"$ACCOUNT_NAME\" (id: $CF_ACCOUNT_ID)"
  exit 0
elif [ "$HTTP_CODE" = "401" ]; then
  log_fail "Wrangler auth FAIL — API token invalid or expired (HTTP 401)"
  log_fail "Rotate token via Cloudflare dashboard and update CI secret"
  exit 1
elif [ "$HTTP_CODE" = "403" ]; then
  log_fail "Wrangler auth FAIL — API token lacks account access (HTTP 403)"
  log_fail "Verify token has 'Account: Cloudflare Workers' permission"
  exit 1
elif [ "$HTTP_CODE" = "ERR" ] || [ "$HTTP_CODE" = "000" ]; then
  log_fail "Wrangler auth FAIL — CF API unreachable (network error)"
  exit 1
else
  log_fail "Wrangler auth FAIL — unexpected HTTP $HTTP_CODE (account: $CF_ACCOUNT_ID)"
  exit 1
fi
