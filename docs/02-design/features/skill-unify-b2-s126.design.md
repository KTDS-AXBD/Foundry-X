---
code: FX-DSGN-S126
title: "Sprint 126 Design — F305 스킬 실행 메트릭 수집"
version: 1.0
status: Active
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
refs:
  - "[[FX-PLAN-S126]]"
---

# Sprint 126 Design — F305 스킬 실행 메트릭 수집

## 1. API 확장

### 1.1 Zod 스키마

`packages/api/src/schemas/skill-metrics.ts`에 추가:

```typescript
export const recordSkillExecutionSchema = z.object({
  skillId: z.string().min(1).max(100),
  version: z.coerce.number().int().min(1).optional().default(1),
  bizItemId: z.string().optional(),
  artifactId: z.string().optional(),
  model: z.string().min(1).max(100).default("claude-sonnet-4-20250514"),
  status: z.enum(["completed", "failed", "timeout", "cancelled"]),
  inputTokens: z.coerce.number().int().min(0).default(0),
  outputTokens: z.coerce.number().int().min(0).default(0),
  costUsd: z.coerce.number().min(0).default(0),
  durationMs: z.coerce.number().int().min(0),
  errorMessage: z.string().max(2000).optional(),
});

export type RecordSkillExecutionInput = z.infer<typeof recordSkillExecutionSchema>;
```

### 1.2 라우트

`packages/api/src/routes/skill-metrics.ts`에 추가 (기존 GET 라우트들 위에):

```typescript
// POST /skills/metrics/record — 스킬 실행 기록 (F305)
skillMetricsRoute.post("/skills/metrics/record", async (c) => {
  const body = await c.req.json();
  const parsed = recordSkillExecutionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillMetricsService(c.env.DB);
  const result = await svc.recordExecution({
    tenantId: c.get("orgId"),
    skillId: parsed.data.skillId,
    version: parsed.data.version,
    bizItemId: parsed.data.bizItemId,
    artifactId: parsed.data.artifactId,
    model: parsed.data.model,
    status: parsed.data.status,
    inputTokens: parsed.data.inputTokens,
    outputTokens: parsed.data.outputTokens,
    costUsd: parsed.data.costUsd,
    durationMs: parsed.data.durationMs,
    executedBy: c.get("userId"),
    errorMessage: parsed.data.errorMessage,
  });

  return c.json(result, 201);
});
```

**주의**: `/skills/metrics/record`는 `/skills/:skillId/metrics`보다 **먼저** 등록 (Sprint 125 패턴과 동일).

### 1.3 인증

기존 tenant 미들웨어 인증 활용. 추가 service token 인증은 Phase 12 범위 밖.
usage-tracker-hook에서는 사용자의 JWT 토큰으로 호출.

## 2. usage-tracker Hook

`scripts/usage-tracker-hook.sh` — CC PostToolUse 이벤트로 스킬 실행 메트릭 수집:

```bash
#!/usr/bin/env bash
# usage-tracker-hook.sh — CC 스킬 실행 메트릭을 Foundry-X API로 전송
# PostToolUse hook으로 등록: Skill 도구 실행 완료 시 호출
set -euo pipefail

# 환경변수
API_URL="${FOUNDRY_X_API_URL:-https://foundry-x-api.ktds-axbd.workers.dev/api}"
TOKEN="${FOUNDRY_X_TOKEN:-}"

# stdin에서 hook 데이터 읽기 (JSON)
HOOK_DATA=$(cat)
TOOL_NAME=$(echo "$HOOK_DATA" | jq -r '.tool_name // empty')
SKILL_NAME=$(echo "$HOOK_DATA" | jq -r '.input.skill // empty')
DURATION_MS=$(echo "$HOOK_DATA" | jq -r '.duration_ms // 0')
STATUS=$(echo "$HOOK_DATA" | jq -r '.status // "completed"')

# Skill 도구가 아니면 무시
if [ "$TOOL_NAME" != "Skill" ] || [ -z "$SKILL_NAME" ]; then
  exit 0
fi

# 토큰 없으면 조용히 종료
if [ -z "$TOKEN" ]; then
  exit 0
fi

# 비동기 API 호출 (성능 영향 최소화)
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
```

## 3. 테스트

### 3.1 API 테스트

`packages/api/src/__tests__/skill-metrics-record.test.ts`:

| 테스트 | 검증 |
|--------|------|
| POST 성공 | 201 + id 반환 |
| 필수 필드 누락 | 400 |
| 미인증 | 401 |
| 잘못된 status enum | 400 |
| durationMs = 0 허용 | 201 |

## 4. 구현 순서 (autopilot용)

```
1. recordSkillExecutionSchema Zod 스키마 추가
2. POST /skills/metrics/record 라우트 추가
3. skill-metrics-record.test.ts 테스���
4. usage-tracker-hook.sh 스크립트 작성
5. typecheck + lint + test 전체 통과 확인
```
