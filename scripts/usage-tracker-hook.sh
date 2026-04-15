#!/usr/bin/env bash
# usage-tracker-hook.sh — CC PostToolUse hook: 스킬 실행 메트릭을 Foundry-X API로 전송
# F305: 스킬 실행 메트릭 수집 (D4 해소)
#
# 설치: .claude/settings.json PostToolUse hook으로 등록
#   { "type": "command", "event": "PostToolUse", "command": "./scripts/usage-tracker-hook.sh", "matcher": { "tool_name": "Skill" } }
#
# 환경변수:
#   FOUNDRY_X_API_URL — API 베이스 URL (기본: https://fx-gateway.ktds-axbd.workers.dev/api)
#   FOUNDRY_X_TOKEN   — JWT Bearer 토큰 (없으면 조용히 무시)
set -euo pipefail

API_URL="${FOUNDRY_X_API_URL:-https://fx-gateway.ktds-axbd.workers.dev/api}"
TOKEN="${FOUNDRY_X_TOKEN:-}"

# stdin에서 hook 데이터 읽기 (JSON)
HOOK_DATA=$(cat)
TOOL_NAME=$(echo "$HOOK_DATA" | jq -r '.tool_name // empty')
SKILL_NAME=$(echo "$HOOK_DATA" | jq -r '.input.skill // empty')
DURATION_MS=$(echo "$HOOK_DATA" | jq -r '.duration_ms // 0')
TOOL_STATUS=$(echo "$HOOK_DATA" | jq -r '.status // "completed"')

# Skill 도구가 아니면 무시
if [ "$TOOL_NAME" != "Skill" ] || [ -z "$SKILL_NAME" ]; then
  exit 0
fi

# 토큰 없으면 조용히 종료
if [ -z "$TOKEN" ]; then
  exit 0
fi

# status 매핑 (hook status → API enum)
case "$TOOL_STATUS" in
  success|completed) STATUS="completed" ;;
  error|failed)      STATUS="failed" ;;
  timeout)           STATUS="timeout" ;;
  *)                 STATUS="completed" ;;
esac

# 비동기 API 호출 (CC 성능 영향 최소화)
curl -s -X POST "${API_URL}/skills/metrics/record" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"skillId\": \"ax-${SKILL_NAME}\",
    \"status\": \"${STATUS}\",
    \"durationMs\": ${DURATION_MS},
    \"model\": \"claude-sonnet-4-20250514\",
    \"inputTokens\": 0,
    \"outputTokens\": 0,
    \"costUsd\": 0
  }" > /dev/null 2>&1 &

exit 0
