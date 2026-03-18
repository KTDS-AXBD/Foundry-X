#!/usr/bin/env bash
# Foundry-X Post-Deploy Smoke Test
# Usage: API_URL=... WEB_URL=... bash scripts/smoke-test.sh
set -euo pipefail

API_URL="${API_URL:-https://foundry-x-api.ktds-axbd.workers.dev}"
WEB_URL="${WEB_URL:-https://fx.minu.best}"
PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  ✅ $name"
    ((PASS++))
  else
    echo "  ❌ $name"
    ((FAIL++))
  fi
}

echo "🔥 Foundry-X Smoke Test — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "   API: $API_URL"
echo "   Web: $WEB_URL"
echo "─────────────────────────────────────"

echo ""
echo "API Checks:"
check "GET /health"             curl -sf "$API_URL/health"
check "GET /api/requirements"   curl -sf "$API_URL/api/requirements"
check "GET /api/agents"         curl -sf "$API_URL/api/agents"

echo ""
echo "Web Checks:"
check "Landing page"            curl -sf "$WEB_URL"
check "Dashboard route"         curl -sf -o /dev/null -w '%{http_code}' "$WEB_URL/dashboard"

echo ""
echo "─────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo "⚠️  Some checks failed — investigate before proceeding"
  exit 1
fi

echo "✅ All checks passed"
