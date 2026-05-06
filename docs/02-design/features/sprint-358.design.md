---
code: FX-DESIGN-358
title: Sprint 358 — F632 CQ 5축 + 80-20-80 검수 룰 Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 358
f_item: F632
req: FX-REQ-697
priority: P2
---

# Sprint 358 — F632 CQ 5축 + 80-20-80 검수 룰 Design

> Plan: `docs/01-plan/features/sprint-358.plan.md`

## §1 아키텍처 결정

### 1.1 디렉토리 구조 (Plan §3 (a) 확정)

```
packages/api/src/core/cq/
├── types.ts              ← CQAxis / AxisScore / CQEvaluationResult / CQHandoffDecision / ReviewCycle* + re-exports
├── schemas/
│   └── cq.ts             ← Zod 스키마 5종
├── services/
│   ├── cq-evaluator.service.ts   ← CQEvaluator class
│   └── review-cycle.service.ts   ← ReviewCycle class
└── routes/
    └── index.ts          ← cqApp (Hono sub-app), 4 endpoints
```

### 1.2 app.ts 마운트 (Plan §3 (j))

```typescript
// app.ts 마운트 — docsApp 패턴과 동일 (import + app.route)
import { cqApp } from "./core/cq/routes/index.js";
app.route("/api/cq", cqApp);
```

### 1.3 AuditBus 시그니처 보정

Plan §3 (h)는 2인자 `auditBus.emit("cq.evaluated", {...})` 형태로 기술했지만,
실제 AuditBus.emit()은 3인자 `(eventType, payload, ctx: TraceContext)`.
→ 서비스 내부에서 `generateTraceId() / generateSpanId()`로 ctx를 생성하여 주입한다.

```typescript
// 실제 호출 패턴
import { generateTraceId, generateSpanId } from "../../infra/types.js";
const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
await this.auditBus.emit("cq.evaluated", payload, ctx);
```

### 1.4 LLMService.generate() 래핑

`CQEvaluator`는 `LLMService.generate(systemPrompt, userPrompt)` 호출 후
응답 JSON을 Zod로 파싱한다. LLM이 invalid JSON 반환 시 → 기본값(50점)으로 fallback.

## §2 파일별 상세 설계

### 2.1 `core/cq/types.ts`

```typescript
// CQ_AXES constant array + CQAxis type
export const CQ_AXES = ["ontology_usage","tool_selection","code_quality","result_match","governance"] as const;
export type CQAxis = typeof CQ_AXES[number];

// 가중치 맵 (합계 100)
export const CQ_AXIS_WEIGHTS: Record<CQAxis, number> = {
  ontology_usage: 25, tool_selection: 20, code_quality: 15, result_match: 30, governance: 10,
};

// AxisScore: 단일 축 채점 결과
export interface AxisScore {
  axis: CQAxis;
  rawScore: number;   // 0~100
  weighted: number;  // rawScore * (weight/100)
  reasoning: string;
}

// CQEvaluationResult: evaluate() 반환 타입
export interface CQEvaluationResult {
  id: string;
  orgId: string;
  questionId: string;
  axisScores: Record<CQAxis, AxisScore>;
  totalScore: number;
  handoffDecision: CQHandoffDecision;
  evaluatedAt: number;
}

export type CQHandoffDecision = "handoff" | "human_review";

// ReviewCycle 관련
export const REVIEW_CYCLE_STAGES = ["ai_initial_80","self_eval","human_intensive_20","ai_refinement_80"] as const;
export type ReviewCycleStage = typeof REVIEW_CYCLE_STAGES[number];
export interface ReviewCycleResult {
  cycleId: string;
  orgId: string;
  stages: { stage: ReviewCycleStage; content: string; status: string; durationMs: number | null }[];
  finalContent: string;
}

// re-exports
export { CQEvaluator } from "./services/cq-evaluator.service.js";
export { ReviewCycle } from "./services/review-cycle.service.js";
export * from "./schemas/cq.js";
```

### 2.2 `core/cq/schemas/cq.ts`

```typescript
import { z } from "zod";
import { CQ_AXES, REVIEW_CYCLE_STAGES } from "../types.js";

export const CQAxisSchema = z.enum(CQ_AXES);
export const HandoffDecisionSchema = z.enum(["handoff", "human_review"]);
export const ReviewCycleStageSchema = z.enum(REVIEW_CYCLE_STAGES);

export const RegisterCQSchema = z.object({
  orgId: z.string().min(1),
  questionText: z.string().min(1).max(2000),
  answerText: z.string().min(1).max(10000),
  author: z.string().min(1),
});

export const EvaluateCQSchema = z.object({
  orgId: z.string().min(1),
  questionId: z.string().min(1),
  llmCallContext: z.object({
    sessionId: z.string(),
    response: z.string(),
    toolCalls: z.array(z.unknown()).optional(),
  }),
});

export const CQEvaluationResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  questionId: z.string(),
  axisScores: z.record(CQAxisSchema, z.object({
    axis: CQAxisSchema,
    rawScore: z.number(),
    weighted: z.number(),
    reasoning: z.string(),
  })),
  totalScore: z.number(),
  handoffDecision: HandoffDecisionSchema,
  evaluatedAt: z.number(),
});

export const StartReviewCycleSchema = z.object({
  orgId: z.string().min(1),
  cqEvaluationId: z.string().optional(),
  initialContent: z.string().min(1),
});
```

### 2.3 `core/cq/services/cq-evaluator.service.ts`

```
의존성:
  - D1Database (D1 INSERT cq_evaluations + cq_questions 조회)
  - LLMService (5축 채점 LLM 호출)
  - Pick<AuditBus, "emit"> (3 이벤트: cq.evaluated, cq.handoff)

핵심 로직:
  evaluate(input) {
    1. SELECT cq_questions WHERE id = questionId
    2. buildCQEvalPrompt(question, llmCallContext) → LLM call
    3. JSON 파싱 → AxisScore[] (실패 시 fallback 50점/axis)
    4. 가중치 합산 → totalScore = Σ(rawScore * weight/100)
    5. handoffDecision = totalScore >= 90 ? "handoff" : "human_review"
    6. INSERT cq_evaluations
    7. emit("cq.evaluated", ..., ctx)  [항상]
    8. if handoff → emit("cq.handoff", ..., ctx)
  }
```

### 2.4 `core/cq/services/review-cycle.service.ts`

```
의존성:
  - D1Database (cq_review_cycles INSERT)
  - LLMService (ai_initial_80 + self_eval stage 생성)
  - Pick<AuditBus, "emit"> (review_cycle.stage_completed)

핵심 로직:
  startCycle(input) {
    cycleId = UUID
    Stage 1 ai_initial_80: LLM generate("initial") → INSERT completed
    Stage 2 self_eval: LLM generate("self_evaluate") → INSERT completed
    Stage 3 human_intensive_20: INSERT pending (인간 개입 대기)
    emit("review_cycle.stage_completed", {cycleId, stage:"self_eval", awaitingHuman:true}, ctx)
    return {cycleId, orgId, stages: [3건], finalContent: selfEval}
  }
  submitHumanReview(cycleId, reviewerId, content) {
    UPDATE human_intensive_20 → completed
    Stage 4 ai_refinement_80: LLM generate("refine") → INSERT completed
  }
```

### 2.5 `core/cq/routes/index.ts`

```
endpoints:
  POST /register      → RegisterCQSchema → INSERT cq_questions → 201 {id}
  POST /evaluate      → EvaluateCQSchema → CQEvaluator.evaluate() → 200 CQEvaluationResponseSchema
  POST /review-cycle/start → StartReviewCycleSchema → ReviewCycle.startCycle() → 201 {cycleId, ...}
  GET  /handoff-stats → GROUP BY handoff_decision → 200 {handoff: N, human_review: N}
```

### 2.6 D1 migration `0144_cq_evaluations.sql`

마지막 migration은 `0143_automation_policy.sql` → **0144** 사용.

```sql
-- F632: CQ 5축 + 80-20-80 검수 룰
CREATE TABLE IF NOT EXISTS cq_questions ( ... );
CREATE TABLE IF NOT EXISTS cq_evaluations ( ... );
CREATE TABLE IF NOT EXISTS cq_review_cycles ( ... );
-- (Plan §3 (b) SQL 그대로 사용)
```

> ⚠️ Plan §3 (b)에서 파일명을 `0145_cq_evaluations.sql`로 기술했지만,
> 실제 마지막 migration은 0143 → **0144**가 올바른 번호. Design에서 수정.

## §3 TDD 계약 (Red Target)

### Test 1 — CQEvaluator 90점 이상 handoff
```
입력: orgId="org-1", questionId="q-1", llmCallContext={sessionId:"s1", response:"good"}
LLM mock 응답: 5축 각 rawScore=95 → totalScore=95
기대:
  - result.handoffDecision === "handoff"
  - result.totalScore === 95
  - auditBus.emit 2회 호출 ("cq.evaluated" + "cq.handoff")
  - D1 prepare INSERT called once
```

### Test 2 — CQEvaluator 70점 human_review
```
입력: 동일 구조
LLM mock 응답: 5축 각 rawScore=70 → totalScore=70
기대:
  - result.handoffDecision === "human_review"
  - result.totalScore === 70
  - auditBus.emit 1회 호출 ("cq.evaluated"만, handoff 없음)
```

### Test 3 — ReviewCycle.startCycle 4 stage 검증
```
입력: orgId="org-1", cqEvaluationId=undefined, initialContent="초기 내용"
LLM mock: generate() → "generated content"
기대:
  - result.stages.length === 3 (4번째 ai_refinement_80은 submitHumanReview에서 추가)
  - stages[0].stage === "ai_initial_80" && status === "completed"
  - stages[1].stage === "self_eval" && status === "completed"
  - stages[2].stage === "human_intensive_20" && status === "pending"
  - auditBus.emit 1회 호출 ("review_cycle.stage_completed")
  - D1 prepare called 3회 (3 INSERT)
```

## §4 파일 매핑 (Gap Analysis 기준)

| 파일 | 상태 | 내용 |
|------|------|------|
| `packages/api/src/db/migrations/0144_cq_evaluations.sql` | 신규 | 3 테이블 + 인덱스 |
| `packages/api/src/core/cq/types.ts` | 신규 | CQAxis + 6 타입 + re-exports |
| `packages/api/src/core/cq/schemas/cq.ts` | 신규 | 5 Zod 스키마 |
| `packages/api/src/core/cq/services/cq-evaluator.service.ts` | 신규 | CQEvaluator class |
| `packages/api/src/core/cq/services/review-cycle.service.ts` | 신규 | ReviewCycle class |
| `packages/api/src/core/cq/routes/index.ts` | 신규 | cqApp, 4 endpoints |
| `packages/api/src/core/cq/cq-evaluator.test.ts` | 신규 | Test 1~3 |
| `packages/api/src/app.ts` | 수정 | import cqApp + app.route("/api/cq", cqApp) |

### D1 체크리스트 (Stage 3 Exit)

| # | 항목 | 확인 |
|---|------|------|
| D1 | 신규 인터페이스 주입 사이트 전수 검증 | CQEvaluator/ReviewCycle 생성자가 routes/index.ts에서만 호출 — 단일 주입 지점 ✓ |
| D2 | 식별자 계약 | questionId = `cq_questions.id` (UUID), cqEvaluationId = `cq_evaluations.id` (UUID) — 동일 포맷 ✓ |
| D3 | Breaking change | 신규 도메인 추가, 기존 도메인 미수정 — 영향 없음 ✓ |
| D4 | TDD Red 파일 | `core/cq/cq-evaluator.test.ts` (Red 커밋 후 기록) |
