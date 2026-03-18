#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# AI Foundry MCP Server — Foundry-X 왕복 검증 스크립트
# Phase 1-1 PoC: AIF-REQ-026
#
# Usage:
#   ./scripts/test-aif-mcp-roundtrip.sh [--local|--staging]
#
# Prerequisites:
#   - AI Foundry MCP Server (production) 가동 중
#   - Foundry-X API 서버 (로컬 또는 staging) 가동 중
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────

AIF_MCP_BASE="https://svc-mcp-server-production.sinclair-account.workers.dev"
AIF_API_KEY="e2e-test-secret-2026"
AIF_SKILL_ID="${AIF_SKILL_ID:-6a0fb6d5-9ace-49ed-ae4a-c45bf6e63bf0}"

FX_API_BASE="${FX_API_BASE:-http://localhost:8787}"
FX_JWT_SECRET="${FX_JWT_SECRET:-}"

PASS=0
FAIL=0

# ── Helpers ──────────────────────────────────────────────────────────

green() { printf "\033[32m✅ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m❌ %s\033[0m\n" "$1"; }
info()  { printf "\033[36m→ %s\033[0m\n" "$1"; }

check() {
  local label="$1" actual="$2" expected="$3"
  if echo "$actual" | grep -q "$expected"; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label (expected: $expected, got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

generate_jwt() {
  # Read JWT_SECRET from .dev.vars if not provided
  if [ -z "$FX_JWT_SECRET" ]; then
    local devvars="$(dirname "$0")/../packages/api/.dev.vars"
    if [ -f "$devvars" ]; then
      FX_JWT_SECRET=$(grep 'JWT_SECRET=' "$devvars" | cut -d= -f2 | tr -d ' ')
    fi
  fi
  if [ -z "$FX_JWT_SECRET" ]; then
    FX_JWT_SECRET="dev-secret"
  fi

  node -e "
    const crypto = require('crypto');
    const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const now = Math.floor(Date.now()/1000);
    const p = Buffer.from(JSON.stringify({sub:'poc-user',email:'poc@test.com',role:'admin',iat:now,exp:now+3600})).toString('base64url');
    const s = crypto.createHmac('sha256','${FX_JWT_SECRET}').update(h+'.'+p).digest('base64url');
    console.log(h+'.'+p+'.'+s);
  "
}

# ── Phase A: AI Foundry MCP 직접 검증 ───────────────────────────────

echo ""
echo "══════════════════════════════════════════════════════════════"
echo " Phase A: AI Foundry MCP 서버 직접 검증"
echo "══════════════════════════════════════════════════════════════"

info "A1: Health Check"
HEALTH=$(curl -sf "${AIF_MCP_BASE}/health" 2>/dev/null || echo '{}')
check "A1 MCP Health" "$HEALTH" '"status":"ok"'

info "A2: MCP initialize"
INIT=$(curl -sf \
  -H "Authorization: Bearer ${AIF_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"fx-poc","version":"1.0"}},"id":1}' \
  "${AIF_MCP_BASE}/mcp/${AIF_SKILL_ID}" 2>/dev/null || echo '{}')
check "A2 initialize → protocolVersion" "$INIT" '"protocolVersion":"2024-11-05"'

info "A3: MCP tools/list"
TOOLS=$(curl -sf \
  -H "Authorization: Bearer ${AIF_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' \
  "${AIF_MCP_BASE}/mcp/${AIF_SKILL_ID}" 2>/dev/null || echo '{}')
check "A3 tools/list → tool name" "$TOOLS" '"name":"pol-pension-ct-406"'

info "A4: MCP tools/call (정책 평가)"
CALL=$(curl -sf \
  -H "Authorization: Bearer ${AIF_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pol-pension-ct-406","arguments":{"context":"사용자가 자동충전을 1만원으로 설정하려 합니다."}},"id":3}' \
  "${AIF_MCP_BASE}/mcp/${AIF_SKILL_ID}" 2>/dev/null || echo '{}')
check "A4 tools/call → 정책 평가 결과" "$CALL" '정책 평가 결과'

# ── Phase B: Foundry-X 경유 검증 ────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════════════════════"
echo " Phase B: Foundry-X 경유 왕복 검증"
echo "══════════════════════════════════════════════════════════════"

FX_TOKEN=$(generate_jwt)

info "B1: Foundry-X API Health"
FX_TOKEN=$(generate_jwt)
FX_HEALTH=$(curl -s -H "Authorization: Bearer ${FX_TOKEN}" "${FX_API_BASE}/api/health" 2>/dev/null || echo '{}')
check "B1 Foundry-X Health" "$FX_HEALTH" '"overall"'

info "B2: MCP 서버 등록"
REGISTER=$(curl -sf -X POST "${FX_API_BASE}/api/mcp/servers" \
  -H "Authorization: Bearer ${FX_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"AI Foundry PoC - giftvoucher charging\",
    \"serverUrl\": \"${AIF_MCP_BASE}/mcp/${AIF_SKILL_ID}\",
    \"transportType\": \"http\",
    \"apiKey\": \"${AIF_API_KEY}\"
  }" 2>/dev/null || echo '{}')
FX_SERVER_ID=$(echo "$REGISTER" | jq -r '.id // empty')
check "B2 서버 등록" "$REGISTER" '"transportType":"http"'
info "  Server ID: ${FX_SERVER_ID:-UNKNOWN}"

if [ -n "$FX_SERVER_ID" ]; then
  info "B3: 연결 테스트 (tools/list)"
  TEST=$(curl -sf -X POST "${FX_API_BASE}/api/mcp/servers/${FX_SERVER_ID}/test" \
    -H "Authorization: Bearer ${FX_TOKEN}" 2>/dev/null || echo '{}')
  check "B3 연결 테스트 → connected" "$TEST" '"status":"connected"'
  TOOL_COUNT=$(echo "$TEST" | jq -r '.toolCount // 0')
  info "  Tool Count: ${TOOL_COUNT}"

  info "B4: 도구 목록 조회 (캐시)"
  CACHED=$(curl -sf "${FX_API_BASE}/api/mcp/servers/${FX_SERVER_ID}/tools" \
    -H "Authorization: Bearer ${FX_TOKEN}" 2>/dev/null || echo '{}')
  check "B4 도구 캐시 조회" "$CACHED" '"pol-pension-ct-406"'

  info "B5: 서버 정리 (삭제)"
  DELETE=$(curl -sf -X DELETE "${FX_API_BASE}/api/mcp/servers/${FX_SERVER_ID}" \
    -H "Authorization: Bearer ${FX_TOKEN}" 2>/dev/null || echo '{}')
  check "B5 서버 삭제" "$DELETE" '"deleted":true'
fi

# ── Summary ──────────────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════════════════════"
echo " 결과: ${PASS} PASS / ${FAIL} FAIL (총 $((PASS + FAIL)))"
echo "══════════════════════════════════════════════════════════════"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
