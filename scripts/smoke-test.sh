#!/usr/bin/env bash
# Foundry-X Post-Deploy Smoke Test
# Usage: API_URL=... WEB_URL=... bash scripts/smoke-test.sh
set -uo pipefail

API_URL="${API_URL:-https://foundry-x-api.ktds-axbd.workers.dev}"
WEB_URL="${WEB_URL:-https://fx.minu.best}"
PASS=0
FAIL=0

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

echo "🔥 Foundry-X Smoke Test — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "   API: $API_URL"
echo "   Web: $WEB_URL"
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
check_http "Landing page"            "$WEB_URL"                GET "200"
check_http "Dashboard route"         "$WEB_URL/dashboard"      GET "200|404"  # SPA: 404.html=index.html, React Router handles path

echo ""
echo "─────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo "⚠️  Some checks failed — investigate before proceeding"
  exit 1
fi

echo "✅ All checks passed"
