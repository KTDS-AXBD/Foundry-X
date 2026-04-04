#!/usr/bin/env bash
# Skill Unification 데모 데이터 시딩
# Usage: ./scripts/skill-demo-seed.sh [API_URL] [TOKEN]
set -euo pipefail

API_URL="${1:-https://foundry-x-api.ktds-axbd.workers.dev/api}"
TOKEN="${2:-${FOUNDRY_X_TOKEN:-}}"

if [ -z "$TOKEN" ]; then
  echo "❌ TOKEN이 필요해요. 인자 또는 FOUNDRY_X_TOKEN 환경변수를 설정하세요."
  exit 1
fi

AUTH="Authorization: Bearer ${TOKEN}"
CT="Content-Type: application/json"

echo "📦 1/2: 샘플 스킬 벌크 등록 (10건)..."
curl -s -X POST "${API_URL}/skills/registry/bulk" \
  -H "$CT" -H "$AUTH" \
  -d '{
  "skills": [
    {"skillId":"cost-model","name":"AI 비용 모델 분석","category":"analysis","tags":["ai-biz","cost"],"sourceType":"marketplace"},
    {"skillId":"feasibility-study","name":"실현 가능성 검토","category":"analysis","tags":["ai-biz","feasibility"],"sourceType":"marketplace"},
    {"skillId":"market-sizing","name":"시장 규모 추정","category":"analysis","tags":["pm-skills","market"],"sourceType":"marketplace"},
    {"skillId":"competitor-analysis","name":"경쟁사 분석","category":"analysis","tags":["pm-skills","competitor"],"sourceType":"marketplace"},
    {"skillId":"value-proposition","name":"가치 제안 설계","category":"bd-process","tags":["pm-skills","value"],"sourceType":"marketplace"},
    {"skillId":"bmc-canvas","name":"BMC 캔버스 작성","category":"bd-process","tags":["pm-skills","bmc"],"sourceType":"marketplace"},
    {"skillId":"risk-assessment","name":"리스크 평가","category":"validation","tags":["management","risk"],"sourceType":"marketplace"},
    {"skillId":"roi-calculator","name":"ROI 계산기","category":"analysis","tags":["ai-biz","roi"],"sourceType":"marketplace"},
    {"skillId":"pitch-deck","name":"피치 덱 생성","category":"generation","tags":["pm-skills","pitch"],"sourceType":"marketplace"},
    {"skillId":"tech-review","name":"기술 검토 스킬","category":"validation","tags":["ai-framework","review"],"sourceType":"marketplace"}
  ]
}' | jq -r '.message // .error // "done"' 2>/dev/null || echo "done"

echo "📊 2/2: 메트릭 시딩 (5개 스킬 × 3건)..."
for skill in cost-model feasibility-study market-sizing competitor-analysis value-proposition; do
  for i in 1 2 3; do
    DURATION=$((RANDOM % 5000 + 1000))
    curl -s -X POST "${API_URL}/skills/metrics/record" \
      -H "$CT" -H "$AUTH" \
      -d "{
        \"skillId\": \"${skill}\",
        \"status\": \"completed\",
        \"durationMs\": ${DURATION},
        \"model\": \"claude-sonnet-4-20250514\",
        \"inputTokens\": $((RANDOM % 2000 + 500)),
        \"outputTokens\": $((RANDOM % 3000 + 1000)),
        \"costUsd\": 0.$(printf '%02d' $((RANDOM % 10 + 1)))
      }" > /dev/null 2>&1
  done
done

echo "✅ Demo seed complete: 10 skills + 15 execution records"
