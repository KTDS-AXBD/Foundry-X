---
code: FX-DSGN-039
title: "Sprint 39 — Fallback 체인 + 프라이빗 프롬프트 게이트웨이 + AI-휴먼 피드백 루프 상세 설계 (F144+F149+F150)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-39
sprint: 39
phase: "Phase 5a"
references:
  - "[[FX-PLAN-039]]"
  - "[[FX-DSGN-038]]"
---

## 1. 설계 개요

### 1.1 목적

기존 Agent Evolution 인프라(6종 역할 에이전트 + ModelRouter + EvaluatorOptimizer) 위에 **운영 안정성 3종** 레이어를 추가:
- **FallbackChainService** (F144) — 모델 장애 시 priority 기반 N-level 자동 전환
- **PromptGatewayService** (F149) — LLM 전송 전 민감 정보 마스킹 + 코드 추상화
- **AgentFeedbackLoopService** (F150) — 에이전트 실패 시 피드백 수집 → 프롬프트 힌트 학습

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| **기존 인터페이스 비침습** | AgentRunner 인터페이스 변경 없음, 래퍼 패턴으로 삽입 |
| **ModelRouter 확장** | `getFallbackChain()` 메서드 추가, 기존 `getModelForTask()` 유지 |
| **미들웨어 체인** | PromptGateway는 prompt-utils.ts의 `buildUserPrompt()` 앞에 삽입 |
| **D1 활용** | 3개 테이블 추가 (0023 마이그레이션), 기존 model_routing_rules 재활용 |
| **점진적 적용** | 각 서비스는 독립 동작 가능, 전체 통합은 Orchestrator에서 조립 |

---

## 2. 아키텍처

### 2.1 실행 파이프라인

```
사용자 요청 → AgentOrchestrator.executeTask()
  │
  ├─ 1. PromptGatewayService.sanitizePrompt()     ← F149 (전처리)
  │     └─ applyRules(content) → 마스킹된 프롬프트
  │
  ├─ 2. FallbackChainService.executeWithFallback() ← F144 (실행)
  │     └─ ModelRouter.getFallbackChain(taskType)
  │         → Runner.execute(model[0])
  │         → 실패 시 Runner.execute(model[1])
  │         → 실패 시 Runner.execute(model[2])
  │         → recordFailover() 이벤트 기록
  │
  ├─ 3. 결과 반환 (성공 시)
  │
  └─ 4. AgentFeedbackLoopService.captureFailure()  ← F150 (후처리, 실패 시)
        └─ SSE 이벤트로 사용자에게 피드백 요청
        └─ submitHumanFeedback() → applyLearning()
```

### 2.2 파일 구조

```
packages/api/src/services/
├── fallback-chain.ts            # FallbackChainService
├── prompt-gateway.ts            # PromptGatewayService
├── agent-feedback-loop.ts       # AgentFeedbackLoopService
└── model-router.ts              # getFallbackChain() 메서드 추가 (기존 파일)

packages/api/src/__tests__/
├── fallback-chain.test.ts       # 15개+
├── prompt-gateway.test.ts       # 13개+
└── agent-feedback-loop.test.ts  # 12개+

packages/api/src/
├── routes/agent.ts              # 6개 엔드포인트 추가
├── schemas/agent.ts             # Fallback + Gateway + Feedback 스키마
├── services/agent-orchestrator.ts  # 파이프라인 통합
└── db/migrations/0023_fallback_gateway_feedback.sql
```

---

## 3. FallbackChainService 설계 (F144)

### 3.1 ModelRouter 확장

```typescript
// model-router.ts — 기존 클래스에 메서드 추가

/** F144: priority 순으로 모든 라우팅 규칙 반환 (폴백 체인용) */
async getFallbackChain(taskType: AgentTaskType): Promise<RoutingRule[]> {
  const { results } = await this.db
    .prepare(
      "SELECT * FROM model_routing_rules WHERE task_type = ? AND enabled = 1 ORDER BY priority ASC"
    )
    .bind(taskType)
    .all<D1RoutingRow>();

  const chain = results.map(toRoutingRule);

  // D1 규칙이 없으면 DEFAULT_MODEL_MAP 단일 항목으로 폴백
  if (chain.length === 0) {
    return [await this.getModelForTask(taskType)];
  }
  return chain;
}
```

### 3.2 Result Types

```typescript
interface FallbackEvent {
  id: string;
  taskType: AgentTaskType;
  fromModel: string;
  toModel: string;
  reason: "timeout" | "error" | "rate-limit" | "quality";
  latencyMs: number;
  createdAt: string;
}

interface FallbackChainResult {
  result: AgentExecutionResult;
  attemptedModels: string[];         // 시도한 모델 순서
  failoverEvents: FallbackEvent[];   // 폴백 이벤트
  finalModel: string;                // 최종 성공 모델
  totalLatencyMs: number;
}
```

### 3.3 FallbackChainService

```typescript
export class FallbackChainService {
  static readonly MAX_RETRIES = 3;

  constructor(
    private modelRouter: ModelRouter,
    private db: D1Database,
  ) {}

  async executeWithFallback(
    request: AgentExecutionRequest,
    createRunner: (rule: RoutingRule) => AgentRunner,
  ): Promise<FallbackChainResult> {
    const chain = await this.modelRouter.getFallbackChain(request.taskType);
    const maxAttempts = Math.min(chain.length, FallbackChainService.MAX_RETRIES);

    const attemptedModels: string[] = [];
    const failoverEvents: FallbackEvent[] = [];

    for (let i = 0; i < maxAttempts; i++) {
      const rule = chain[i];
      attemptedModels.push(rule.modelId);
      const runner = createRunner(rule);

      try {
        const start = Date.now();
        const result = await runner.execute(request);
        const latency = Date.now() - start;

        if (result.status === "failed" && i < maxAttempts - 1) {
          const event = await this.recordFailover(
            request.taskType, rule.modelId, chain[i + 1].modelId, "error", latency
          );
          failoverEvents.push(event);
          continue;
        }

        return {
          result,
          attemptedModels,
          failoverEvents,
          finalModel: rule.modelId,
          totalLatencyMs: /* 누적 */,
        };
      } catch (err) {
        if (i < maxAttempts - 1) {
          const reason = this.classifyError(err);
          const event = await this.recordFailover(
            request.taskType, rule.modelId, chain[i + 1].modelId, reason, 0
          );
          failoverEvents.push(event);
          continue;
        }
        throw err; // 마지막 모델도 실패하면 에러 전파
      }
    }
    // unreachable
  }

  private classifyError(err: unknown): "timeout" | "error" | "rate-limit" {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.includes("rate")) return "rate-limit";
    if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) return "timeout";
    return "error";
  }

  async recordFailover(
    taskType: AgentTaskType,
    fromModel: string,
    toModel: string,
    reason: string,
    latencyMs: number,
  ): Promise<FallbackEvent> { /* D1 INSERT into fallback_events */ }

  async listEvents(limit?: number): Promise<FallbackEvent[]> { /* D1 SELECT */ }
}
```

### 3.4 API 엔드포인트

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | /agents/fallback/chain/:taskType | - | `{ chain: RoutingRule[] }` |
| GET | /agents/fallback/events | `?limit=20` | `{ events: FallbackEvent[] }` |

---

## 4. PromptGatewayService 설계 (F149)

### 4.1 Result Types

```typescript
interface SanitizationRule {
  id: string;
  pattern: string;         // 정규식
  replacement: string;     // 치환 문자열 (예: "[API_KEY_REDACTED]")
  category: "secret" | "url" | "pii" | "custom";
  enabled: boolean;
  createdAt: string;
}

interface SanitizeResult {
  sanitizedContent: string;
  appliedRules: Array<{
    ruleId: string;
    category: string;
    matchCount: number;
  }>;
  originalLength: number;
  sanitizedLength: number;
}

interface CodeAbstraction {
  filePath: string;
  summary: string;          // 함수 시그니처 + 클래스 구조
  imports: string[];         // import 목록
  exports: string[];         // export 목록
  lineCount: number;
}
```

### 4.2 PromptGatewayService

```typescript
export class PromptGatewayService {
  /** 기본 정규화 규칙 — D1 규칙이 없을 때 사용 */
  static readonly DEFAULT_RULES: SanitizationRule[] = [
    { id: "default_api_key", pattern: "(?:api[_-]?key|token|secret)\\s*[:=]\\s*['\"][^'\"]{8,}['\"]",
      replacement: "[REDACTED_SECRET]", category: "secret", enabled: true, createdAt: "" },
    { id: "default_password", pattern: "(?:password|passwd|pwd)\\s*[:=]\\s*['\"][^'\"]+['\"]",
      replacement: "[REDACTED_PASSWORD]", category: "secret", enabled: true, createdAt: "" },
    { id: "default_internal_url", pattern: "https?://(?:internal|staging|dev|localhost)[^\\s'\"]*",
      replacement: "[REDACTED_INTERNAL_URL]", category: "url", enabled: true, createdAt: "" },
    { id: "default_jwt", pattern: "eyJ[A-Za-z0-9_-]{20,}\\.eyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}",
      replacement: "[REDACTED_JWT]", category: "secret", enabled: true, createdAt: "" },
  ];

  constructor(private db: D1Database) {}

  /** 프롬프트 전체를 정규화 */
  async sanitizePrompt(content: string): Promise<SanitizeResult> {
    const rules = await this.loadRules();
    return this.applyRules(content, rules);
  }

  /** 코드 파일을 시그니처/구조만 추출 */
  abstractCode(fileContents: Record<string, string>): Record<string, CodeAbstraction> {
    // 정규식으로 export/import/함수 시그니처/클래스 선언만 추출
    // 구현 본문은 "// ... implementation ..." 으로 치환
  }

  /** D1에서 규칙 로드 (없으면 DEFAULT_RULES 사용) */
  private async loadRules(): Promise<SanitizationRule[]> { /* ... */ }

  /** 규칙 적용 */
  private applyRules(content: string, rules: SanitizationRule[]): SanitizeResult {
    let sanitized = content;
    const applied: SanitizeResult["appliedRules"] = [];

    for (const rule of rules.filter(r => r.enabled)) {
      const regex = new RegExp(rule.pattern, "gi");
      const matches = sanitized.match(regex);
      if (matches && matches.length > 0) {
        sanitized = sanitized.replace(regex, rule.replacement);
        applied.push({ ruleId: rule.id, category: rule.category, matchCount: matches.length });
      }
    }

    return {
      sanitizedContent: sanitized,
      appliedRules: applied,
      originalLength: content.length,
      sanitizedLength: sanitized.length,
    };
  }

  async listRules(): Promise<SanitizationRule[]> { /* D1 SELECT */ }
}
```

### 4.3 Orchestrator 통합 지점

```typescript
// agent-orchestrator.ts — executeTask() 내부, Runner 호출 전
if (this.promptGateway) {
  // 1) fileContents가 있으면 코드 추상화
  if (request.context.fileContents) {
    const abstractions = this.promptGateway.abstractCode(request.context.fileContents);
    // 추상화 결과를 instructions에 추가
  }
  // 2) 전체 프롬프트 정규화
  const userPrompt = buildUserPrompt(request);
  const sanitized = await this.promptGateway.sanitizePrompt(userPrompt);
  // sanitized.sanitizedContent를 Runner에 전달
}
```

### 4.4 API 엔드포인트

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | /agents/gateway/sanitize | `{ content: string }` | `SanitizeResult` (dry-run) |
| GET | /agents/gateway/rules | - | `{ rules: SanitizationRule[] }` |

---

## 5. AgentFeedbackLoopService 설계 (F150)

### 5.1 Result Types

```typescript
interface AgentFailureRecord {
  id: string;
  executionId: string;
  taskType: AgentTaskType;
  failureReason: string | null;
  attemptedModels: string[];      // F144 연동 — 시도한 모델들
  humanFeedback: string | null;
  promptHint: string | null;      // 학습된 프롬프트 힌트
  status: "pending" | "reviewed" | "applied";
  createdAt: string;
  updatedAt: string;
}

interface FeedbackSubmission {
  failureId: string;
  feedback: string;               // 사용자의 자유 텍스트 피드백
  expectedOutcome?: string;       // 기대했던 결과 (선택)
}

interface LearningResult {
  feedbackId: string;
  promptHint: string;             // 생성된 프롬프트 힌트
  appliedTo: AgentTaskType;
}
```

### 5.2 AgentFeedbackLoopService

```typescript
export class AgentFeedbackLoopService {
  constructor(private db: D1Database) {}

  /** 에이전트 실패 자동 기록 */
  async captureFailure(
    executionId: string,
    taskType: AgentTaskType,
    result: AgentExecutionResult,
    attemptedModels?: string[],
  ): Promise<AgentFailureRecord> {
    const id = `afb-${crypto.randomUUID()}`;
    const failureReason = result.status === "failed"
      ? (result.output.analysis ?? "Unknown failure")
      : result.status === "partial"
        ? "Partial result — incomplete output"
        : null;

    await this.db.prepare(
      `INSERT INTO agent_feedback (id, execution_id, task_type, failure_reason, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).bind(id, executionId, taskType, failureReason).run();

    return { /* ... */ };
  }

  /** 사용자 피드백 제출 */
  async submitHumanFeedback(
    failureId: string,
    feedback: string,
    expectedOutcome?: string,
  ): Promise<AgentFailureRecord> {
    await this.db.prepare(
      `UPDATE agent_feedback
       SET human_feedback = ?, status = 'reviewed', updated_at = datetime('now')
       WHERE id = ?`
    ).bind(feedback, failureId).run();
    // ...
  }

  /** 피드백 → 프롬프트 힌트 변환 + 저장 */
  async applyLearning(feedbackId: string): Promise<LearningResult> {
    const record = await this.getById(feedbackId);
    if (!record || !record.humanFeedback) throw new Error("No feedback to learn from");

    // 피드백에서 프롬프트 힌트 추출 (규칙 기반)
    const promptHint = this.extractPromptHint(record.humanFeedback, record.taskType);

    await this.db.prepare(
      `UPDATE agent_feedback
       SET prompt_hint = ?, status = 'applied', updated_at = datetime('now')
       WHERE id = ?`
    ).bind(promptHint, feedbackId).run();

    return { feedbackId, promptHint, appliedTo: record.taskType };
  }

  /** 프롬프트 힌트 추출 — 피드백 키워드 → 프롬프트 suffix */
  private extractPromptHint(feedback: string, taskType: AgentTaskType): string {
    // 규칙 기반: 피드백 내용을 "When performing {taskType}, note: {feedback summary}" 형태로 변환
    return `When performing ${taskType}, note: ${feedback.slice(0, 200)}`;
  }

  /** 특정 taskType의 적용된 힌트 목록 — Runner에서 프롬프트에 추가 */
  async getAppliedHints(taskType: AgentTaskType): Promise<string[]> {
    const { results } = await this.db.prepare(
      `SELECT prompt_hint FROM agent_feedback
       WHERE task_type = ? AND status = 'applied' AND prompt_hint IS NOT NULL
       ORDER BY updated_at DESC LIMIT 5`
    ).bind(taskType).all<{ prompt_hint: string }>();

    return results.map(r => r.prompt_hint);
  }

  async getById(id: string): Promise<AgentFailureRecord | null> { /* ... */ }

  async listByExecution(executionId: string): Promise<AgentFailureRecord[]> { /* ... */ }
}
```

### 5.3 Orchestrator 통합 지점

```typescript
// agent-orchestrator.ts — executeTask() 결과 처리 부분

// 1) 실행 전: 학습된 힌트를 프롬프트에 추가
if (this.feedbackLoop) {
  const hints = await this.feedbackLoop.getAppliedHints(request.taskType);
  if (hints.length > 0) {
    request.context.instructions =
      (request.context.instructions ?? "") + "\n\n## Learned Notes\n" + hints.join("\n");
  }
}

// 2) 실행 후: 실패 시 자동 캡처
if (result.status === "failed" || result.status === "partial") {
  if (this.feedbackLoop) {
    await this.feedbackLoop.captureFailure(
      request.taskId,
      request.taskType,
      result,
      fallbackResult?.attemptedModels, // F144 연동
    );
  }
}
```

### 5.4 API 엔드포인트

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | /agents/feedback | `{ failureId, feedback, expectedOutcome? }` | `AgentFailureRecord` |
| GET | /agents/feedback/:executionId | - | `{ feedback: AgentFailureRecord[] }` |

---

## 6. D1 마이그레이션 (0023)

```sql
-- 0023_fallback_gateway_feedback.sql

-- F144: 폴백 이벤트 로그
CREATE TABLE IF NOT EXISTS fallback_events (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  from_model TEXT NOT NULL,
  to_model TEXT NOT NULL,
  reason TEXT NOT NULL,
  latency_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fallback_events_task_type ON fallback_events(task_type);
CREATE INDEX IF NOT EXISTS idx_fallback_events_created_at ON fallback_events(created_at);

-- F149: 프롬프트 정규화 규칙
CREATE TABLE IF NOT EXISTS prompt_sanitization_rules (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  replacement TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('secret', 'url', 'pii', 'custom')),
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- F150: 에이전트 피드백
CREATE TABLE IF NOT EXISTS agent_feedback (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  failure_reason TEXT,
  human_feedback TEXT,
  prompt_hint TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'applied')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_execution ON agent_feedback(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_task_type ON agent_feedback(task_type, status);
```

---

## 7. Zod 스키마

```typescript
// schemas/agent.ts — 추가분

// F144
export const FallbackChainResponseSchema = z.object({
  chain: z.array(z.object({
    id: z.string(),
    taskType: z.string(),
    modelId: z.string(),
    runnerType: z.string(),
    priority: z.number(),
  })),
});

export const FallbackEventsResponseSchema = z.object({
  events: z.array(z.object({
    id: z.string(),
    taskType: z.string(),
    fromModel: z.string(),
    toModel: z.string(),
    reason: z.string(),
    latencyMs: z.number(),
    createdAt: z.string(),
  })),
});

// F149
export const SanitizeRequestSchema = z.object({
  content: z.string().min(1).max(100_000),
});

export const SanitizeResponseSchema = z.object({
  sanitizedContent: z.string(),
  appliedRules: z.array(z.object({
    ruleId: z.string(),
    category: z.string(),
    matchCount: z.number(),
  })),
  originalLength: z.number(),
  sanitizedLength: z.number(),
});

export const SanitizationRulesResponseSchema = z.object({
  rules: z.array(z.object({
    id: z.string(),
    pattern: z.string(),
    replacement: z.string(),
    category: z.enum(["secret", "url", "pii", "custom"]),
    enabled: z.boolean(),
  })),
});

// F150
export const FeedbackSubmitSchema = z.object({
  failureId: z.string(),
  feedback: z.string().min(1).max(2000),
  expectedOutcome: z.string().max(1000).optional(),
});

export const FeedbackResponseSchema = z.object({
  feedback: z.array(z.object({
    id: z.string(),
    executionId: z.string(),
    taskType: z.string(),
    failureReason: z.string().nullable(),
    humanFeedback: z.string().nullable(),
    promptHint: z.string().nullable(),
    status: z.enum(["pending", "reviewed", "applied"]),
    createdAt: z.string(),
  })),
});
```

---

## 8. 테스트 전략

### 8.1 FallbackChain 테스트 (15개+)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | 첫 번째 모델 성공 시 즉시 반환 | attemptedModels.length === 1 |
| 2 | 첫 번째 실패 → 두 번째 성공 | failoverEvents.length === 1 |
| 3 | 3회 모두 실패 시 에러 throw | MAX_RETRIES 초과 |
| 4 | 체인 1개만 있을 때 | 폴백 없이 단일 시도 |
| 5 | classifyError: rate-limit | "429" 포함 시 "rate-limit" |
| 6 | classifyError: timeout | "timeout" 포함 시 "timeout" |
| 7 | classifyError: 일반 에러 | 기타 → "error" |
| 8 | recordFailover D1 저장 | fallback_events 테이블 확인 |
| 9 | listEvents 조회 | limit 파라미터 동작 |
| 10 | getFallbackChain: D1 규칙 있을 때 | priority 순 정렬 |
| 11 | getFallbackChain: D1 규칙 없을 때 | DEFAULT_MODEL_MAP 폴백 |
| 12 | 동일 모델 중복 방지 | 체인에 같은 modelId 없음 |
| 13 | partial 결과 시 다음 모델 시도 | status === "failed" 조건 |
| 14 | API: GET /agents/fallback/chain/:taskType | 200 + chain 배열 |
| 15 | API: GET /agents/fallback/events | 200 + events 배열 |

### 8.2 PromptGateway 테스트 (13개+)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | API 키 패턴 마스킹 | `api_key = "xxx"` → `[REDACTED_SECRET]` |
| 2 | 비밀번호 패턴 마스킹 | `password: "xxx"` → `[REDACTED_PASSWORD]` |
| 3 | 내부 URL 마스킹 | `http://internal.xxx` → `[REDACTED_INTERNAL_URL]` |
| 4 | JWT 토큰 마스킹 | `eyJxxx.eyJxxx.xxx` → `[REDACTED_JWT]` |
| 5 | 매칭 없을 때 원본 유지 | appliedRules 빈 배열 |
| 6 | 복수 규칙 동시 적용 | 2종 이상 동시 매칭 |
| 7 | D1 커스텀 규칙 로딩 | loadRules() |
| 8 | D1 규칙 없을 때 DEFAULT_RULES | 폴백 동작 |
| 9 | abstractCode: 함수 시그니처 추출 | export function 보존, 본문 제거 |
| 10 | abstractCode: import/export 보존 | 구조 정보 유지 |
| 11 | disabled 규칙 무시 | enabled: false |
| 12 | API: POST /agents/gateway/sanitize | dry-run 동작 |
| 13 | API: GET /agents/gateway/rules | 규칙 목록 반환 |

### 8.3 AgentFeedbackLoop 테스트 (12개+)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | captureFailure: failed 결과 | status "pending", failureReason 저장 |
| 2 | captureFailure: partial 결과 | "Partial result" 메시지 |
| 3 | submitHumanFeedback | status → "reviewed" |
| 4 | applyLearning | promptHint 생성, status → "applied" |
| 5 | applyLearning: 피드백 없는 경우 | 에러 throw |
| 6 | getAppliedHints | 최근 5개 반환 |
| 7 | getAppliedHints: 빈 결과 | 빈 배열 |
| 8 | extractPromptHint 형식 | "When performing {taskType}, note: ..." |
| 9 | extractPromptHint: 200자 제한 | 긴 피드백 잘림 |
| 10 | listByExecution | executionId 필터 |
| 11 | API: POST /agents/feedback | 201 + 피드백 레코드 |
| 12 | API: GET /agents/feedback/:executionId | 200 + 피드백 배열 |

---

## 9. 구현 순서

| # | 작업 | 의존성 | 파일 |
|---|------|--------|------|
| 1 | D1 마이그레이션 0023 | 없음 | `db/migrations/0023_*.sql` |
| 2 | ModelRouter.getFallbackChain() | 0023 | `model-router.ts` |
| 3 | FallbackChainService | ModelRouter | `fallback-chain.ts` |
| 4 | FallbackChain 테스트 | FallbackChainService | `fallback-chain.test.ts` |
| 5 | PromptGatewayService | 0023 | `prompt-gateway.ts` |
| 6 | PromptGateway 테스트 | PromptGatewayService | `prompt-gateway.test.ts` |
| 7 | AgentFeedbackLoopService | 0023 | `agent-feedback-loop.ts` |
| 8 | AgentFeedbackLoop 테스트 | AgentFeedbackLoopService | `agent-feedback-loop.test.ts` |
| 9 | Zod 스키마 추가 | 없음 | `schemas/agent.ts` |
| 10 | Routes 6개 추가 | 스키마 + 서비스 | `routes/agent.ts` |
| 11 | Orchestrator 파이프라인 통합 | 3서비스 모두 | `agent-orchestrator.ts` |
| 12 | 통합 테스트 | 전체 | 기존 테스트 파일 확장 |
