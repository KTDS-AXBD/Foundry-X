#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# AI Foundry MCP Skills — Foundry-X 일괄 등록
# AIF-REQ-026 Phase 1
#
# Usage:
#   ./scripts/bulk-register-aif-mcp.sh [--org LPON|Miraeasset] [--dry-run] [--cleanup]
#
# Prerequisites:
#   - AI Foundry MCP Server (production) 가동 중
#   - Foundry-X API 서버 가동 중 (로컬 또는 staging)
#
# Environment:
#   AIF_API_KEY    AI Foundry INTERNAL_API_SECRET (default: e2e-test-secret-2026)
#   FX_API_BASE    Foundry-X API base URL (default: http://localhost:8787)
#   FX_JWT_SECRET  Foundry-X JWT secret (auto-read from .dev.vars)
# ──────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Arguments ────────────────────────────────────────────────────────

ORG_ID="LPON"
DRY_RUN=false
CLEANUP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org) ORG_ID="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --cleanup) CLEANUP=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Config ───────────────────────────────────────────────────────────

AIF_MCP_BASE="https://svc-mcp-server-production.sinclair-account.workers.dev"
AIF_SKILL_BASE="https://svc-skill-production.sinclair-account.workers.dev"
AIF_API_KEY="${AIF_API_KEY:-e2e-test-secret-2026}"

FX_API_BASE="${FX_API_BASE:-http://localhost:8787}"
FX_JWT_SECRET="${FX_JWT_SECRET:-}"

REGISTERED=0
TESTED=0
FAILED=0
SKIPPED=0

# ── Helpers ──────────────────────────────────────────────────────────

green() { printf "\033[32m✅ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m❌ %s\033[0m\n" "$1"; }
info()  { printf "\033[36m→ %s\033[0m\n" "$1"; }
warn()  { printf "\033[33m⚠️  %s\033[0m\n" "$1"; }

generate_jwt() {
  if [ -z "$FX_JWT_SECRET" ]; then
    local devvars="$(dirname "$0")/../packages/api/.dev.vars"
    if [ -f "$devvars" ]; then
      FX_JWT_SECRET=$(grep 'JWT_SECRET=' "$devvars" | cut -d= -f2 | tr -d ' ')
    fi
  fi
  [ -z "$FX_JWT_SECRET" ] && FX_JWT_SECRET="dev-secret"

  node -e "
    const crypto = require('crypto');
    const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const now = Math.floor(Date.now()/1000);
    const p = Buffer.from(JSON.stringify({sub:'bulk-register',email:'bot@foundry-x.dev',role:'admin',iat:now,exp:now+3600})).toString('base64url');
    const s = crypto.createHmac('sha256','${FX_JWT_SECRET}').update(h+'.'+p).digest('base64url');
    console.log(h+'.'+p+'.'+s);
  "
}

# ── Cleanup Mode ─────────────────────────────────────────────────────

cleanup_servers() {
  info "Cleanup: AI Foundry MCP 서버 전체 삭제"
  local token
  token=$(generate_jwt)

  local servers
  servers=$(curl -sf "${FX_API_BASE}/api/mcp/servers" \
    -H "Authorization: Bearer ${token}" 2>/dev/null || echo '[]')

  local count
  count=$(echo "$servers" | jq 'length')
  info "등록된 MCP 서버: ${count}개"

  echo "$servers" | jq -r '.[] | select(.name | startswith("AIF-")) | .id' | while read -r sid; do
    local name
    name=$(echo "$servers" | jq -r ".[] | select(.id==\"${sid}\") | .name")
    curl -sf -X DELETE "${FX_API_BASE}/api/mcp/servers/${sid}" \
      -H "Authorization: Bearer ${token}" > /dev/null 2>&1
    green "삭제: ${name} (${sid})"
  done

  info "Cleanup 완료"
  exit 0
}

[ "$CLEANUP" = true ] && cleanup_servers

# ── Main ─────────────────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════════════════════"
echo " AI Foundry MCP Skills → Foundry-X 일괄 등록"
echo " Org: ${ORG_ID}  |  Dry Run: ${DRY_RUN}"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Step 1: Fetch bundled skills from AI Foundry
info "Step 1: AI Foundry bundled skills 조회 (org=${ORG_ID})"
SKILLS_JSON=$(curl -sf \
  -H "X-Internal-Secret: ${AIF_API_KEY}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  "${AIF_SKILL_BASE}/skills?status=bundled&limit=50" 2>/dev/null || echo '{"data":{"skills":[]}}')

SKILL_COUNT=$(echo "$SKILLS_JSON" | jq '.data.skills | length')
info "Bundled skills: ${SKILL_COUNT}개"

if [ "$SKILL_COUNT" -eq 0 ]; then
  warn "등록할 bundled skills가 없어요"
  exit 0
fi

echo ""

# Step 2: Generate JWT
FX_TOKEN=$(generate_jwt)

# Step 3: Check existing registrations
EXISTING=$(curl -sf "${FX_API_BASE}/api/mcp/servers" \
  -H "Authorization: Bearer ${FX_TOKEN}" 2>/dev/null || echo '[]')

# Step 4: Register each skill
echo "$SKILLS_JSON" | jq -c '.data.skills[]' | while read -r skill; do
  SKILL_ID=$(echo "$skill" | jq -r '.skillId')
  SUBDOMAIN=$(echo "$skill" | jq -r '.metadata.subdomain // "unknown"')
  POLICY_COUNT=$(echo "$skill" | jq -r '.policyCount')
  DOMAIN=$(echo "$skill" | jq -r '.metadata.domain // "unknown"')

  SERVER_NAME="AIF-${ORG_ID}-${SUBDOMAIN}"
  SERVER_URL="${AIF_MCP_BASE}/mcp/${SKILL_ID}"

  # Check if already registered
  ALREADY=$(echo "$EXISTING" | jq -r ".[] | select(.name==\"${SERVER_NAME}\") | .id")
  if [ -n "$ALREADY" ]; then
    warn "SKIP: ${SERVER_NAME} (이미 등록됨: ${ALREADY})"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [ "$DRY_RUN" = true ]; then
    info "[DRY] ${SERVER_NAME}: ${DOMAIN}/${SUBDOMAIN} (${POLICY_COUNT} policies) → ${SERVER_URL}"
    continue
  fi

  # Register
  RESULT=$(curl -sf -X POST "${FX_API_BASE}/api/mcp/servers" \
    -H "Authorization: Bearer ${FX_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"${SERVER_NAME}\",
      \"serverUrl\": \"${SERVER_URL}\",
      \"transportType\": \"http\",
      \"apiKey\": \"${AIF_API_KEY}\"
    }" 2>/dev/null || echo '{}')

  NEW_ID=$(echo "$RESULT" | jq -r '.id // empty')
  if [ -z "$NEW_ID" ]; then
    red "FAIL: ${SERVER_NAME} 등록 실패"
    FAILED=$((FAILED + 1))
    continue
  fi

  REGISTERED=$((REGISTERED + 1))

  # Test connection
  TEST=$(curl -sf -X POST "${FX_API_BASE}/api/mcp/servers/${NEW_ID}/test" \
    -H "Authorization: Bearer ${FX_TOKEN}" 2>/dev/null || echo '{}')
  TEST_STATUS=$(echo "$TEST" | jq -r '.status // "error"')
  TOOL_COUNT=$(echo "$TEST" | jq -r '.toolCount // 0')

  if [ "$TEST_STATUS" = "connected" ]; then
    green "${SERVER_NAME}: ${POLICY_COUNT} policies → ${TOOL_COUNT} tools (connected)"
    TESTED=$((TESTED + 1))
  else
    TEST_ERR=$(echo "$TEST" | jq -r '.error // "unknown"')
    warn "${SERVER_NAME}: 등록 완료, 연결 실패 — ${TEST_ERR}"
  fi
done

# ── Summary ──────────────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════════════════════════"
if [ "$DRY_RUN" = true ]; then
  echo " [DRY RUN] 실제 등록 없음"
else
  echo " 결과: ${REGISTERED} 등록 / ${TESTED} 연결 성공 / ${SKIPPED} 스킵 / ${FAILED} 실패"
fi
echo "══════════════════════════════════════════════════════════════"

[ "$FAILED" -eq 0 ] && exit 0 || exit 1
