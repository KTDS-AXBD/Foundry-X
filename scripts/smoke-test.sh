#!/usr/bin/env bash
# Foundry-X Post-Deploy Smoke Test
# Usage: API_URL=... WEB_URL=... [WEB_URL_FALLBACK=...] bash scripts/smoke-test.sh
#
# WEB_URL_FALLBACK: 1차 WEB_URL 응답 실패 시 재시도할 URL (Pages 기본 도메인 등).
#   custom domain 다운(C99) 시에도 CI green 유지하기 위함. fallback 경유 시 ⚠️ 표시.
set -uo pipefail

API_URL="${API_URL:-https://foundry-x-api.ktds-axbd.workers.dev}"
WEB_URL="${WEB_URL:-https://fx.minu.best}"
WEB_URL_FALLBACK="${WEB_URL_FALLBACK:-https://foundry-x-web.pages.dev}"
PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name"
    FAIL=$((FAIL + 1))
  fi
}

# Check HTTP status is in expected range
check_http() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local expected="${4:-200}"
  local code
  code=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 10 -X "$method" "$url" 2>/dev/null || echo "000")
  if echo "$expected" | grep -q "$code"; then
    echo "  ✅ $name (HTTP $code)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name (HTTP $code, expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

# curl wrapper — 항상 3자리 HTTP 코드만 반환 (네트워크 실패 시 "000")
http_code() {
  local code
  code=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 10 "$1" 2>/dev/null) || code="000"
  [ -z "$code" ] && code="000"
  echo "$code"
}

# Check Web HTTP with fallback URL (custom domain 다운 대응)
check_web() {
  local name="$1"
  local path="$2"
  local expected="${3:-200}"
  local primary="${WEB_URL}${path}"
  local fallback="${WEB_URL_FALLBACK}${path}"
  local code

  code=$(http_code "$primary")
  if echo "$expected" | grep -q "$code"; then
    echo "  ✅ $name (HTTP $code)"
    PASS=$((PASS + 1))
    return
  fi

  # Primary fail → fallback 시도 (단, fallback URL이 다를 때만)
  if [ -n "$WEB_URL_FALLBACK" ] && [ "$WEB_URL_FALLBACK" != "$WEB_URL" ]; then
    local fb_code
    fb_code=$(http_code "$fallback")
    if echo "$expected" | grep -q "$fb_code"; then
      echo "  ⚠️  $name (HTTP $fb_code via fallback — primary $WEB_URL HTTP $code)"
      PASS=$((PASS + 1))
      WARN=$((WARN + 1))
      return
    fi
    echo "  ❌ $name (primary HTTP $code, fallback HTTP $fb_code)"
  else
    echo "  ❌ $name (HTTP $code, expected $expected)"
  fi
  FAIL=$((FAIL + 1))
}

echo "🔥 Foundry-X Smoke Test — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "   API: $API_URL"
echo "   Web: $WEB_URL  (fallback: $WEB_URL_FALLBACK)"
echo "─────────────────────────────────────"

echo ""
echo "API Checks (public):"
check_http "GET / (root health)"     "$API_URL/"               GET "200"
check_http "GET /api/openapi.json"   "$API_URL/api/openapi.json" GET "200"
check_http "GET /api/docs"           "$API_URL/api/docs"       GET "200"

echo ""
echo "Auth Checks (reachable):"
check_http "POST /api/auth/login"    "$API_URL/api/auth/login" POST "400|401|422"

echo ""
echo "Protected API (auth required):"
check_http "GET /api/health (401)"   "$API_URL/api/health"     GET "401"

echo ""
echo "Web Checks:"
check_web "Landing page"             ""                                      "200"
check_web "Dashboard route"          "/dashboard"                            "200|404"  # SPA: 404.html=index.html

echo ""
echo "─────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed, $WARN warning(s)"

if [ "$FAIL" -gt 0 ]; then
  echo "⚠️  Some checks failed — investigate before proceeding"
  exit 1
fi

if [ "$WARN" -gt 0 ]; then
  echo "⚠️  $WARN check(s) passed via fallback — primary URL($WEB_URL) 복구 필요"
fi

echo "✅ All checks passed"
