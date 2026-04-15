#!/usr/bin/env bash
# sf-scan 결과를 Foundry-X API에 벌크 등록 (F304)
# Usage: ./scripts/sf-scan-register.sh [--api-url URL] [--token TOKEN]
#
# 환경변수:
#   FOUNDRY_X_API_URL — API 기본 URL (기본: https://fx-gateway.ktds-axbd.workers.dev/api)
#   FOUNDRY_X_TOKEN   — 인증 JWT 토큰

set -euo pipefail

API_URL="${FOUNDRY_X_API_URL:-https://fx-gateway.ktds-axbd.workers.dev/api}"
TOKEN="${FOUNDRY_X_TOKEN:-}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url) API_URL="$2"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 [--api-url URL] [--token TOKEN]"
      echo ""
      echo "Registers skills from sf-scan output to Foundry-X API."
      echo ""
      echo "Options:"
      echo "  --api-url URL   API base URL (default: \$FOUNDRY_X_API_URL or production)"
      echo "  --token TOKEN   Auth JWT token (default: \$FOUNDRY_X_TOKEN)"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [ -z "$TOKEN" ]; then
  echo "Error: API token required. Set FOUNDRY_X_TOKEN or pass --token."
  exit 1
fi

# sf-scan JSON 생성
echo "Running sf-scan..."
SF_OUTPUT=$(npx sf-scan --json 2>/dev/null || true)
if [ -z "$SF_OUTPUT" ]; then
  echo "Error: sf-scan produced no output. Is skill-framework installed?"
  exit 1
fi

# JSON 변환 (sf-scan → API 포맷)
PAYLOAD=$(echo "$SF_OUTPUT" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const skills = (data.skills || []).map(s => ({
  skillId: s.id || s.name.toLowerCase().replace(/\\s+/g, '-'),
  name: s.name,
  description: s.description || null,
  category: mapCategory(s.category),
  tags: s.tags || [],
  sourceType: 'custom',
  sourceRef: s.path || null,
}));
function mapCategory(cat) {
  const map = {
    'pm-skills': 'bd-process',
    'ai-biz': 'analysis',
    'anthropic': 'integration',
    'ai-framework': 'general',
    'management': 'validation',
    'command': 'generation',
  };
  return map[cat] || 'general';
}
console.log(JSON.stringify({ skills }));
")

SKILL_COUNT=$(echo "$PAYLOAD" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(d.skills.length);
")

echo "Registering ${SKILL_COUNT} skills to ${API_URL}..."

# API 호출
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${API_URL}/skills/registry/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "Bulk registration successful:"
  echo "$BODY" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log('  Created: ' + d.created);
console.log('  Updated: ' + d.updated);
console.log('  Errors:  ' + d.errors.length);
console.log('  Total:   ' + d.total);
"
else
  echo "Failed (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
