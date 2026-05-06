---
code: FX-PLAN-358
title: Sprint 358 — F632 CQ 5축 + 80-20-80 검수 룰 (T3, Full 통합)
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 358
f_item: F632
req: FX-REQ-697
priority: P2
---

# Sprint 358 — F632 CQ 5축 + 80-20-80 검수 룰 (T3, Full 통합)

> SPEC.md §5 F632 row가 권위 소스.
> **시동 조건**: T2 sprint 1개 MERGED 후 (3 sprint 한도 준수). Sprint 355 ✅ MERGED 직후 시동 가능.

## §1 배경 + 사전 측정

### CQ 5축 정의 (BeSir 02 v0.3 §4.6.3)

| # | 축 | 평가 내용 | 가중치 |
|---|----|---------|--------|
| 1 | ontology_usage | 질문 의미·맥락을 온톨로지로 이해 | **25** |
| 2 | tool_selection | 적합한 API 선택 | **20** |
| 3 | code_quality | 툴 가공 코드 품질 | **15** |
| 4 | result_match | 정답 일치 | **30** |
| 5 | governance | 권한 없는 정보 차단 | **10** |
| | **합계** | | **100점** |

### 핸드오프 룰 (§4.6.4)
- **평균 ≥ 90점** → 자동화 운영 진입 (`handoff`)
- **평균 < 90점** → 사람 검수 (`human_review`, F605 HITL Console)

### 80-20-80 검수 룰 (§1.4)
1. AI 80% 생성 + 자체평가
2. 집중 검수 20% (사람)
3. 다시 80% 채움 (보강)

### F602 vs F632 두 층위 (§4.6.5)
| 차원 | F602 4대 진단 | F632 CQ 5축 |
|------|---------------|--------------|
| **단계** | 빌드 (정책 세트 정합성) | 운영 (도구 호출 결과 정합성) |
| 입력 | Policy Pack | LLM 호출 + 응답 |
| 출력 | Missing/Duplicate/Overspec/Inconsistency | 5축 점수 + 핸드오프 결정 |

→ **F602 의존 없이 F632 시동 가능** (BeSir §4.6.5 명시).

## §2 인터뷰 4회 패턴 (S336, 37회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T3 두 번째 = F632 CQ 5축 + 80-20-80 | F602 미시동도 OK (BeSir §4.6.5) |
| 2차 위치 | **A core/cq/ 신규** | BeSir 02 v0.3 §4.6 정식 명칭 |
| 3차 분량 | **Full 통합** (CQ + 80-20-80 동시) | 두 메커니즘 본질적으로 결합 |
| 4차 시동 | **T2 sprint 1개 MERGED 후** | 3 sprint 한도 |

## §3 범위 (a~l)

### (a) 신규 디렉토리
```
packages/api/src/core/cq/
├── types.ts
├── schemas/
│   └── cq.ts
├── services/
│   ├── cq-evaluator.service.ts
│   └── review-cycle.service.ts
└── routes/
    └── index.ts
```

### (b) D1 migration `0145_cq_evaluations.sql`

```sql
-- F632: CQ 5축 + 80-20-80 검수 룰 (BeSir 02 v0.3 §4.6)

CREATE TABLE cq_questions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  answer_locked_at INTEGER NOT NULL,           -- 시점 고정 (BeSir §4.6.1)
  author TEXT NOT NULL,                        -- C-Level / 경영분석실 / 도메인 PM
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX idx_cq_questions_org ON cq_questions(org_id);

CREATE TABLE cq_evaluations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  axis_scores TEXT NOT NULL,                   -- JSON: { ontology_usage, tool_selection, code_quality, result_match, governance }
  total_score INTEGER NOT NULL,                -- 0~100
  handoff_decision TEXT NOT NULL,              -- 'handoff' | 'human_review'
  trace_id TEXT,                               -- F606 chain
  llm_call_meta TEXT,                          -- JSON: 평가 LLM 호출 정보
  evaluated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),

  CHECK (handoff_decision IN ('handoff','human_review')),
  CHECK (total_score BETWEEN 0 AND 100),
  FOREIGN KEY (question_id) REFERENCES cq_questions(id)
);

CREATE INDEX idx_cq_evaluations_question ON cq_evaluations(question_id);
CREATE INDEX idx_cq_evaluations_org_score ON cq_evaluations(org_id, total_score DESC);

CREATE TABLE cq_review_cycles (
  id TEXT PRIMARY KEY,
  cq_evaluation_id TEXT,                       -- nullable (CQ 외 일반 cycle 가능)
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL,                         -- ai_initial_80 / self_eval / human_intensive_20 / ai_refinement_80
  content TEXT NOT NULL,                       -- 단계 산출물
  reviewer TEXT,                               -- human_intensive_20 단계만 채움
  status TEXT NOT NULL DEFAULT 'pending',      -- pending/in_progress/completed
  duration_ms INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  completed_at INTEGER,

  CHECK (stage IN ('ai_initial_80','self_eval','human_intensive_20','ai_refinement_80')),
  CHECK (status IN ('pending','in_progress','completed'))
);

CREATE INDEX idx_review_cycles_eval ON cq_review_cycles(cq_evaluation_id);
CREATE INDEX idx_review_cycles_stage ON cq_review_cycles(org_id, stage, status);
```

### (c) `core/cq/types.ts`

```typescript
export const CQ_AXES = [
  "ontology_usage",
  "tool_selection",
  "code_quality",
  "result_match",
  "governance",
] as const;

export type CQAxis = typeof CQ_AXES[number];

export const CQ_AXIS_WEIGHTS: Record<CQAxis, number> = {
  ontology_usage: 25,
  tool_selection: 20,
  code_quality: 15,
  result_match: 30,
  governance: 10,
};

export interface AxisScore { axis: CQAxis; rawScore: number; weighted: number; reasoning: string; }

export type CQHandoffDecision = "handoff" | "human_review";

export interface CQEvaluationResult {
  id: string;
  orgId: string;
  questionId: string;
  axisScores: Record<CQAxis, AxisScore>;
  totalScore: number;
  handoffDecision: CQHandoffDecision;
  evaluatedAt: number;
}

export const REVIEW_CYCLE_STAGES = ["ai_initial_80", "self_eval", "human_intensive_20", "ai_refinement_80"] as const;
export type ReviewCycleStage = typeof REVIEW_CYCLE_STAGES[number];

export interface ReviewCycleResult {
  cycleId: string;
  orgId: string;
  stages: { stage: ReviewCycleStage; content: string; status: string; durationMs: number | null }[];
  finalContent: string;
}

export { CQEvaluator } from "./services/cq-evaluator.service.js";
export { ReviewCycle } from "./services/review-cycle.service.js";
export * from "./schemas/cq.js";
```

### (d) `core/cq/schemas/cq.ts`

```typescript
export const CQAxisSchema = z.enum(CQ_AXES);
export const HandoffDecisionSchema = z.enum(["handoff", "human_review"]);
export const ReviewCycleStageSchema = z.enum(REVIEW_CYCLE_STAGES);

export const RegisterCQSchema = z.object({
  orgId: z.string().min(1),
  questionText: z.string().min(1).max(2000),
  answerText: z.string().min(1).max(10000),
  author: z.string().min(1),
}).openapi("RegisterCQ");

export const EvaluateCQSchema = z.object({
  orgId: z.string().min(1),
  questionId: z.string().min(1),
  llmCallContext: z.object({
    sessionId: z.string(),
    response: z.string(),
    toolCalls: z.array(z.unknown()).optional(),
  }),
}).openapi("EvaluateCQ");

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
}).openapi("CQEvaluationResponse");

export const StartReviewCycleSchema = z.object({
  orgId: z.string().min(1),
  cqEvaluationId: z.string().optional(),
  initialContent: z.string().min(1),
}).openapi("StartReviewCycle");
```

### (e) `core/cq/services/cq-evaluator.service.ts`

```typescript
export class CQEvaluator {
  constructor(
    private db: D1Database,
    private llm: LLMService,
    private auditBus: AuditBus,
  ) {}

  async evaluate(input: { orgId: string; questionId: string; llmCallContext: any }): Promise<CQEvaluationResult> {
    // 1. 별도 평가 에이전트 prompt (문맥 완전 분리)
    const question = await this.fetchQuestion(input.questionId);
    const evalPrompt = buildCQEvalPrompt(question, input.llmCallContext);

    // 2. LLM 호출 (5축 채점 요청, JSON 응답)
    const llmResponse = await this.llm.complete(evalPrompt);
    const axisScores = parseAxisScores(llmResponse); // zod 검증

    // 3. 가중치 계산
    let total = 0;
    for (const axis of CQ_AXES) {
      const weighted = axisScores[axis].rawScore * (CQ_AXIS_WEIGHTS[axis] / 100);
      axisScores[axis].weighted = weighted;
      total += weighted;
    }

    // 4. 90점 핸드오프 결정
    const handoffDecision: CQHandoffDecision = total >= 90 ? "handoff" : "human_review";

    // 5. cq_evaluations INSERT
    const id = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO cq_evaluations (id, org_id, question_id, axis_scores, total_score, handoff_decision)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, input.orgId, input.questionId, JSON.stringify(axisScores), total, handoffDecision).run();

    // 6. audit-bus 발행
    await this.auditBus.emit("cq.evaluated", { id, orgId: input.orgId, totalScore: total, handoffDecision });
    if (handoffDecision === "handoff") {
      await this.auditBus.emit("cq.handoff", { evaluationId: id, orgId: input.orgId, totalScore: total });
    }

    return { id, orgId: input.orgId, questionId: input.questionId, axisScores, totalScore: total, handoffDecision, evaluatedAt: Date.now() };
  }
}
```

### (f) `core/cq/services/review-cycle.service.ts`

```typescript
export class ReviewCycle {
  constructor(private db: D1Database, private llm: LLMService, private auditBus: AuditBus) {}

  async startCycle(input: { orgId: string; cqEvaluationId?: string; initialContent: string }): Promise<ReviewCycleResult> {
    const cycleId = crypto.randomUUID();
    const stages: ReviewCycleResult["stages"] = [];

    // Stage 1: AI initial 80%
    const ai80 = await this.aiGenerate(input.initialContent, "initial");
    await this.recordStage(cycleId, input.orgId, input.cqEvaluationId, "ai_initial_80", ai80);
    stages.push({ stage: "ai_initial_80", content: ai80, status: "completed", durationMs: 0 });

    // Stage 2: self-evaluation
    const selfEval = await this.aiGenerate(ai80, "self_evaluate"); // 자체 평가 (할루시네이션/충실도)
    await this.recordStage(cycleId, input.orgId, input.cqEvaluationId, "self_eval", selfEval);
    stages.push({ stage: "self_eval", content: selfEval, status: "completed", durationMs: 0 });

    // Stage 3: human intensive 20% — pending 상태로 큐
    await this.recordStage(cycleId, input.orgId, input.cqEvaluationId, "human_intensive_20", selfEval, "pending");
    stages.push({ stage: "human_intensive_20", content: selfEval, status: "pending", durationMs: null });

    await this.auditBus.emit("review_cycle.stage_completed", { cycleId, stage: "self_eval", awaitingHuman: true });

    return { cycleId, orgId: input.orgId, stages, finalContent: selfEval };
  }

  async submitHumanReview(cycleId: string, reviewerId: string, reviewedContent: string): Promise<void> {
    // human_intensive_20 stage 완료 + ai_refinement_80 stage 시작
    // ...
  }
}
```

### (g) `core/cq/routes/index.ts`
```typescript
// POST /cq/register
// POST /cq/evaluate
// POST /cq/review-cycle/start
// GET /cq/handoff-stats
export const cqApp = new OpenAPIHono<{ Bindings: Env }>();
```

### (h) audit-bus 통합
- `cq.evaluated` (모든 평가 완료 시)
- `cq.handoff` (90점 통과 시)
- `review_cycle.stage_completed` (각 stage 완료 시)

### (i) LLM wrapper 활용 (F627)
- 별도 평가 에이전트 prompt (문맥 완전 분리)
- zod JSON 응답 파싱

### (j) `app.ts` mount
```typescript
app.route("/api/cq", cqApp);
```

### (k) test mock 3건
- Test 1: 90점 이상 → handoff_decision='handoff' + audit emit 2 (evaluated + handoff)
- Test 2: 70점 → handoff_decision='human_review' + audit emit 1 (evaluated only)
- Test 3: ReviewCycle.startCycle → 4 stage 진행 (단, human_intensive_20는 pending)

### (l) typecheck + tests GREEN
회귀 0 확증.

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 0145 적용 + 3 테이블 | wrangler PRAGMA | questions + evaluations + review_cycles |
| P-b | core/cq/ 6+ files | find | types/schemas/services 2/routes 모두 |
| P-c | types.ts 6 export | grep | CQAxis + AxisScore + CQEvaluationResult + CQHandoffDecision + ReviewCycleStage + ReviewCycleResult |
| P-d | schemas 5 등록 | grep | CQAxis + Handoff + Stage + Register + Evaluate + Response + StartReviewCycle |
| P-e | CQEvaluator + ReviewCycle 2 class | grep | export 2 |
| P-f | routes 4 endpoints | grep | register + evaluate + review-cycle/start + handoff-stats |
| P-g | audit-bus 3 이벤트 mock 검증 | mock | 3 emits |
| P-h | app.ts /api/cq mount | grep | 1 line |
| P-i | typecheck + 3 tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-j | dual_ai_reviews sprint 358 자동 INSERT | D1 query | ≥ 1건 (hook 33 sprint 연속, 누적 ≥ 44건) |
| P-k | F606/F614/F627/F628/F629/F631 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-l | API smoke `/api/cq/evaluate` mock LLM | curl POST | 5축 점수 + handoff_decision |

## §5 전제

- F606 audit-bus ✅ MERGED
- F627 llm wrapper ✅ MERGED
- F602와 독립 (BeSir §4.6.5 두 층위 분리)
- T2 sprint 1개 MERGED 후 시동 (Sprint 355 ✅ 직후 또는 354/356 직후)

## §6 예상 시간

- autopilot **~25~30분** (Full 통합, 2 service class + D1 3 tables + 4 endpoints + 3 tests)

## §7 다음 사이클 후보 (F632 후속, T3 진행)

- **Sprint 359 — F607** AI 투명성 + 윤리 임계 (T3, F606 ✅)
- Sprint 360 — F615 Guard-X Solo (T4, F606+F601 의존)
- Sprint 361 — F616 Launch-X Solo (T4)
- F619 Multi-Evidence Integration (T6, Decode-X 의존)
