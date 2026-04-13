#!/usr/bin/env bash
# ─── Phase 42 Dogfood — DiscoveryGraph 실전 실행 스크립트 ───
# 용도: KOAMI 등 실제 biz_item에 대해 DiscoveryGraphService.runAll()을 호출하여
#       Phase 41+42 코드가 실제 프로덕션에서 동작하는지 검증한다.
#
# 사용법:
#   ./scripts/dogfood-graph.sh <bizItemId> [JWT_TOKEN]
#
# 환경변수:
#   FX_API_URL  — 기본값: https://foundry-x-api.ktds-axbd.workers.dev/api
#   FX_JWT      — JWT 토큰 (필수, 로그인 후 얻기)

set -eu

BIZ_ITEM_ID="${1:-bi-koami-001}"
JWT="${2:-${FX_JWT:-}}"
API_URL="${FX_API_URL:-https://foundry-x-api.ktds-axbd.workers.dev/api}"

if [ -z "$JWT" ]; then
  echo "❌ JWT 토큰이 필요해요. 환경변수 FX_JWT 또는 2번째 인자로 전달하세요."
  echo ""
  echo "JWT 얻는 방법:"
  echo "  1) 웹에서 로그인 → DevTools → Network → 아무 API 호출의 Authorization 헤더 복사"
  echo "  2) export FX_JWT='Bearer eyJ...'"
  exit 1
fi

echo "═══════════════════════════════════════════════"
echo " Phase 42 Dogfood — DiscoveryGraph runAll()"
echo "═══════════════════════════════════════════════"
echo " BizItem:  $BIZ_ITEM_ID"
echo " API:      $API_URL"
echo " Endpoint: POST /biz-items/$BIZ_ITEM_ID/discovery-graph/run-all"
echo "═══════════════════════════════════════════════"
echo ""

# Pre-flight
echo "🔍 Pre-flight: agent_run_metrics 현재 행수 기록..."
PRE_METRICS_HINT="현재 agent_run_metrics는 0건으로 추정됨 (이번 실행 후 증가해야 정상)"
echo "   $PRE_METRICS_HINT"
echo ""

# Graph 실행
echo "▶ Graph 실행 시작 (9-stage 순차 실행, 수 분 소요 예상)..."
START=$(date +%s)
RESPONSE=$(curl -sS -X POST "$API_URL/biz-items/$BIZ_ITEM_ID/discovery-graph/run-all" \
  -H "Authorization: $JWT" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 600 2>&1)
END=$(date +%s)
DURATION=$((END - START))

echo ""
echo "⏱️  실행 시간: ${DURATION}초"
echo ""
echo "📦 응답:"
echo "$RESPONSE" | head -c 2000
echo ""
echo ""

# 응답 분석
if echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ 에러 발생:"
  echo "$RESPONSE" | grep -oP '"error":"[^"]*"|"message":"[^"]*"'
  exit 2
fi

SESSION_ID=$(echo "$RESPONSE" | grep -oP '"sessionId":"[^"]*"' | head -1 | sed 's/"sessionId":"\(.*\)"/\1/')
echo "✅ sessionId: $SESSION_ID"
echo ""

echo "═══════════════════════════════════════════════"
echo " 후속 확인 명령"
echo "═══════════════════════════════════════════════"
echo ""
echo "# 1) agent_run_metrics 기록 확인 (증가했어야 정상)"
echo "cd packages/api && npx wrangler d1 execute foundry-x-db --remote \\"
echo "  --command \"SELECT COUNT(*) FROM agent_run_metrics WHERE session_id='$SESSION_ID';\""
echo ""
echo "# 2) MetaAgent 진단 실행"
echo "curl -X POST $API_URL/meta/diagnose \\"
echo "  -H 'Authorization: $JWT' -H 'Content-Type: application/json' \\"
echo "  -d '{\"sessionId\":\"$SESSION_ID\",\"agentId\":\"planner\"}'"
echo ""
echo "# 3) proposals 조회"
echo "curl $API_URL/meta/proposals -H 'Authorization: $JWT'"
