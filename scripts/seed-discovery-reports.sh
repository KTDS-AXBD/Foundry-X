#!/usr/bin/env bash
# F493: 발굴 평가결과서 v2 fixture seed script
# prod D1에 3개 아이템 리포트를 삽입한다 (idempotent — INSERT OR REPLACE)
#
# 사용법:
#   FOUNDRY_X_TOKEN=<jwt> bash scripts/seed-discovery-reports.sh
#   또는 .env에 FOUNDRY_X_TOKEN 설정 후 실행
#
# 전제 조건:
#   - Sprint 242 PR이 merge된 후 실행 (seed-fixtures 엔드포인트 존재)
#   - FOUNDRY_X_TOKEN: 로그인 후 획득한 JWT (로컬 스토리지 → Copy)

set -euo pipefail

API_BASE="${FOUNDRY_X_API:-https://foundry-x-api.ktds-axbd.workers.dev/api}"
TOKEN="${FOUNDRY_X_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ FOUNDRY_X_TOKEN이 설정되지 않았어요."
  echo "   export FOUNDRY_X_TOKEN=<your-jwt> && bash scripts/seed-discovery-reports.sh"
  exit 1
fi

echo "🌱 발굴 평가결과서 v2 fixture seed 시작..."
echo "   API: $API_BASE"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_BASE}/ax-bd/evaluation-reports/seed-fixtures" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo ""
echo "📊 응답 (HTTP $HTTP_CODE):"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "207" ]; then
  SEEDED=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('seeded', 0))" 2>/dev/null || echo "?")
  echo ""
  echo "✅ Seed 완료 — ${SEEDED}개 결과서 생성/갱신"
else
  echo ""
  echo "❌ Seed 실패 (HTTP $HTTP_CODE)"
  exit 1
fi
