---
id: sprint-292-design
type: design
sprint: 292
features: [F544]
status: active
created: 2026-04-14
---

# Sprint 292 Design — F544: F536 auto-trigger 저장 경로 복구

## §1 목표

`autoTriggerMetaAgent`의 세 가지 버그를 수정하여 Graph 완료 후 proposals 저장을 보장한다.

## §2 현재 vs 목표 상태

### 현재 상태 (버그)

```typescript
// discovery-stage-runner.ts — run-all route
void autoTriggerMetaAgent(c.env.DB, sessionId, apiKey, bizItemId).catch(...)
return c.json(...)

// autoTriggerMetaAgent 함수 내부
const approvalService = new MetaApprovalService(db);
for (const proposal of proposals) {
  await approvalService.save({
    id: proposal.id,
    sessionId: proposal.sessionId,
    // ... bare fields, rubricScore 없음
  });
}
```

### 목표 상태 (수정)

```typescript
// discovery-stage-runner.ts — run-all route
const triggerTask = autoTriggerMetaAgent(c.env.DB, sessionId, apiKey, c.env.ANTHROPIC_API_KEY ?? "", bizItemId, c.env.META_AGENT_MODEL).catch(
  (e) => console.error("[F544] MetaAgent auto-trigger failed:", e)
);
try {
  c.executionCtx.waitUntil(triggerTask);
} catch {
  // non-Worker 환경 (테스트) fallback
}
return c.json(...)

// autoTriggerMetaAgent 함수 내부
const rubric = new ProposalRubric();
const approvalService = new MetaApprovalService(db);
for (const proposal of proposals) {
  const rubricScore = rubric.score(proposal);
  await approvalService.save({ ...proposal, rubricScore, status: "pending" });
}
```

## §3 변경 사항 상세

### 변경 A: `autoTriggerMetaAgent` 함수 시그니처 확장

```typescript
export async function autoTriggerMetaAgent(
  db: D1Database,
  sessionId: string,
  apiKey: string,
  bizItemId?: string,
  metaAgentModel?: string,   // NEW: F542 META_AGENT_MODEL 통일
): Promise<void>
```

### 변경 B: MetaAgent 모델 통일

```typescript
// 변경 전
const metaAgent = new MetaAgent({ apiKey });

// 변경 후
const model = metaAgentModel ?? "claude-sonnet-4-6";
const metaAgent = new MetaAgent({ apiKey, model });
```

### 변경 C: save 경로 단일화 (rubric 포함)

```typescript
// 변경 전
for (const proposal of proposals) {
  await approvalService.save({
    id: proposal.id,
    sessionId: proposal.sessionId,
    agentId: proposal.agentId,
    type: proposal.type,
    title: proposal.title,
    reasoning: proposal.reasoning,
    yamlDiff: proposal.yamlDiff,
    status: "pending",
  });
}

// 변경 후
const rubric = new ProposalRubric();
for (const proposal of proposals) {
  const rubricScore = rubric.score(proposal);
  await approvalService.save({ ...proposal, rubricScore, status: "pending" });
}
```

### 변경 D: waitUntil 적용

```typescript
// discovery-stage-runner.ts route 핸들러 내부
const triggerTask = autoTriggerMetaAgent(
  c.env.DB,
  sessionId,
  apiKey,
  bizItemId,
  c.env.META_AGENT_MODEL,
).catch((e) => console.error("[F544] auto-trigger failed:", e));

try {
  c.executionCtx.waitUntil(triggerTask);
} catch {
  // non-Worker env fallback (테스트)
}
```

### 변경 E: 구조 로깅

```typescript
// collectByBizItem 후
console.log("[F544] autoTrigger start", {
  sessionId,
  bizItemId: bizItemId ?? "none",
  reportRows: report.scores.length,  // 항상 6 (6축)
  overallScore: report.overallScore,
});

// diagnose 후
console.log("[F544] autoTrigger diagnose result", {
  proposalsCount: proposals.length,
});

// save 완료 후
console.log("[F544] autoTrigger saved", {
  saved: proposals.length,
  sessionId,
});
```

## §4 TDD Red Target

| 테스트 | 기대 결과 |
|--------|----------|
| `autoTriggerMetaAgent — bizItemId 기반 집계 + rubricScore 포함 저장` | proposals 저장, `rubric_score IS NOT NULL` |
| `autoTriggerMetaAgent — metaAgentModel 파라미터 전달 시 MetaAgent에 전달` | fetch mock에서 model 검증 |
| `integration: Graph run → proposals saved` | `agent_improvement_proposals` COUNT > 0 |

## §5 파일 매핑 (D1 체크리스트)

| 파일 | 변경 타입 | 내용 |
|------|----------|------|
| `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | 수정 | A+B+C+D+E |
| `packages/api/src/__tests__/services/meta-agent-auto-trigger.test.ts` | 수정 | 신규 테스트 케이스 추가 (bizItemId + rubricScore) |
| `packages/api/src/__tests__/integration/meta-agent-full-loop.test.ts` | 수정 | Graph run → proposals > 0 integration test |

**D1 체크리스트**:
- [x] D1: 주입 사이트 전수 검증 — `autoTriggerMetaAgent` 호출처: `discovery-stage-runner.ts` 1곳 (run-all route)
- [x] D2: 식별자 계약 — bizItemId 기반 collectByBizItem은 F537에서 이미 검증됨. 변경 없음
- [x] D3: Breaking change — 함수 시그니처에 optional 파라미터 추가. 기존 테스트 호환
- [x] D4: TDD Red 파일 목록 위에 기술됨

## §6 import 추가 필요

```typescript
// discovery-stage-runner.ts에 추가
import { ProposalRubric } from "../../agent/services/proposal-rubric.js";
```
