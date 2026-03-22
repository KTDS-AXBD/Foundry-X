---
code: FX-DSGN-036
title: "Sprint 36 — 태스크별 모델 라우팅 + Evaluator-Optimizer 패턴 (F136+F137)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-36
sprint: 36
phase: "Phase 5a"
planning_doc: "[[FX-PLAN-036]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F136: 태스크별 모델 라우팅 + F137: Evaluator-Optimizer 패턴 |
| Sprint | 36 |
| Phase | Phase 5a (Agent Evolution Track A) |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 단일 모델로 모든 태스크 실행 → 비용/품질 불균형. 에이전트 출력 1-shot 의존 |
| **Solution** | D1 routing_rules + ModelRouter 자동 배정 + EvaluatorOptimizer 반복 개선 루프 |
| **Function UX Effect** | 복잡 분석=Opus, 단순 조회=Haiku 자동 분리. 코드 생성→자동 리뷰→개선 루프 |
| **Core Value** | F143 메트릭 기반 최적화 + F142 워크플로우 품질 게이트 연동 토대 |

---

## 1. Overview

### 1.1 Design Goals

- **F136**: taskType에 따라 최적 모델을 D1 규칙 기반으로 자동 선택하되, 기존 `createAgentRunner` 호환성 100% 유지
- **F137**: 생성→평가→개선 루프를 최대 반복 + 품질 임계값으로 제어하며, 평가 기준을 플러그인으로 확장 가능하게 설계
- 두 기능 모두 기존 603개 테스트에 회귀 없이, 신규 27개+ 테스트 추가

### 1.2 Design Principles

- **기존 인터페이스 존중**: `AgentRunner` 인터페이스 변경 없음. 새 기능은 팩토리/서비스 레이어에서 추가
- **D1 규칙 우선, 코드 폴백**: 런타임 규칙 변경 가능 (D1), 규칙 없으면 하드코딩된 DEFAULT_MODEL_MAP 사용
- **Open-Closed Principle**: EvaluationCriteria 인터페이스로 평가 기준 확장, 기존 코드 수정 불필요

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Routes Layer                          │
│  agent.ts                                                    │
│  ├── GET  /agents/routing-rules          (F136)              │
│  ├── PUT  /agents/routing-rules/:taskType (F136)             │
│  └── POST /agents/evaluate-optimize       (F137)             │
└─────┬───────────────────────────┬───────────────────────────┘
      │                           │
      ▼                           ▼
┌─────────────┐           ┌──────────────────┐
│ ModelRouter  │           │EvaluatorOptimizer│
│  (F136)     │           │    (F137)        │
│             │           │                  │
│ getModel()  │◄──────────│ generatorRunner  │
│ listRules() │           │ evaluatorRunner  │
│ updateRule()│           │ criteria[]       │
└──────┬──────┘           └────────┬─────────┘
       │                           │
       ▼                           ▼
┌──────────────┐         ┌──────────────────┐
│agent-runner.ts│         │evaluation-       │
│              │         │criteria.ts       │
│createRouted  │         │                  │
│Runner()      │         │ CodeReview       │
│              │         │ TestCoverage     │
│ OpenRouter   │         │ SpecCompliance   │
│ ClaudeAPI    │         └──────────────────┘
│ Mock         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     D1       │
│              │
│ model_       │
│ routing_     │
│ rules        │
└──────────────┘
```

### 2.2 Data Flow

**F136 — 모델 라우팅:**
```
API Request (taskType: "code-review")
  → ModelRouter.getModelForTask("code-review")
    → D1 SELECT WHERE task_type = ? AND enabled = 1 ORDER BY priority
    → 규칙 있으면: model_id 반환 ("anthropic/claude-sonnet-4")
    → 규칙 없으면: DEFAULT_MODEL_MAP["code-review"] 폴백
  → createRoutedRunner(env, taskType)
    → new OpenRouterRunner(apiKey, selectedModel)
  → runner.execute(request)
  → AgentExecutionResult (model 필드에 실제 사용 모델 기록)
```

**F137 — Evaluator-Optimizer:**
```
POST /agents/evaluate-optimize
  → EvaluatorOptimizer.run(request, config)
    → iteration 1:
    │  generator.execute(request) → result
    │  criteria.forEach(c => c.evaluate(result)) → scores
    │  weightedAverage(scores) → 72 (< threshold 80)
    │  optimizer.improve(result, feedback) → improvedRequest
    → iteration 2:
    │  generator.execute(improvedRequest) → result2
    │  criteria.forEach(c => c.evaluate(result2)) → scores2
    │  weightedAverage(scores2) → 85 (>= threshold 80)
    │  ✅ converged!
    → EvaluationLoopResult { finalResult, finalScore: 85, iterations: 2, converged: true }
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| ModelRouter | D1, execution-types | taskType→model 매핑 규칙 관리 |
| createRoutedRunner | ModelRouter, agent-runner | taskType 기반 Runner 생성 |
| EvaluatorOptimizer | AgentRunner, EvaluationCriteria | 생성→평가→개선 루프 실행 |
| EvaluationCriteria | AgentExecutionResult, AgentExecutionRequest | 결과 품질 평가 |
| agent.ts routes | ModelRouter, EvaluatorOptimizer, schemas | HTTP 엔드포인트 |

---

## 3. Data Model

### 3.1 model_routing_rules (D1 테이블)

```sql
-- Migration: 0022_model_routing.sql
CREATE TABLE IF NOT EXISTS model_routing_rules (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  model_id TEXT NOT NULL,
  runner_type TEXT NOT NULL DEFAULT 'openrouter',
  priority INTEGER NOT NULL DEFAULT 1,
  max_cost_per_call REAL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_type, model_id)
);

-- 기본 시드: 비용/품질 최적화 기반 배정
INSERT INTO model_routing_rules (id, task_type, model_id, runner_type, priority) VALUES
  ('mrr_01', 'code-review',       'anthropic/claude-sonnet-4',    'openrouter', 1),
  ('mrr_02', 'code-generation',   'anthropic/claude-sonnet-4',    'openrouter', 1),
  ('mrr_03', 'spec-analysis',     'anthropic/claude-opus-4',      'openrouter', 1),
  ('mrr_04', 'test-generation',   'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_05', 'policy-evaluation', 'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_06', 'skill-query',       'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_07', 'ontology-lookup',   'anthropic/claude-haiku-4-5',   'openrouter', 1);
```

### 3.2 TypeScript 인터페이스

```typescript
// === F136: model-router.ts ===

import type { AgentTaskType, AgentRunnerType } from "./execution-types.js";

export interface RoutingRule {
  id: string;
  taskType: AgentTaskType;
  modelId: string;
  runnerType: AgentRunnerType;
  priority: number;
  maxCostPerCall: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** D1 규칙 없을 때 하드코딩 폴백 */
export const DEFAULT_MODEL_MAP: Record<AgentTaskType, string> = {
  "code-review":       "anthropic/claude-sonnet-4",
  "code-generation":   "anthropic/claude-sonnet-4",
  "spec-analysis":     "anthropic/claude-opus-4",
  "test-generation":   "anthropic/claude-haiku-4-5",
  "policy-evaluation": "anthropic/claude-haiku-4-5",
  "skill-query":       "anthropic/claude-haiku-4-5",
  "ontology-lookup":   "anthropic/claude-haiku-4-5",
};

// === F137: evaluator-optimizer.ts ===

import type { AgentExecutionRequest, AgentExecutionResult } from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";

export interface EvaluationScore {
  criteriaName: string;
  score: number;          // 0-100
  passed: boolean;        // score >= threshold
  feedback: string[];     // 개선 제안 목록
  details: Record<string, unknown>;
}

export interface EvaluationCriteria {
  readonly name: string;
  readonly weight: number;  // 0.0-1.0, 가중치
  evaluate(
    result: AgentExecutionResult,
    request: AgentExecutionRequest,
  ): EvaluationScore;
}

export interface EvaluatorOptimizerConfig {
  maxIterations: number;        // 기본 3, 하드 리밋 5
  qualityThreshold: number;     // 기본 80 (0-100)
  criteria: EvaluationCriteria[];
  generatorRunner: AgentRunner;
  evaluatorRunner?: AgentRunner;  // null이면 generatorRunner 재사용
}

export interface IterationRecord {
  iteration: number;
  result: AgentExecutionResult;
  scores: EvaluationScore[];
  aggregateScore: number;
  feedback: string[];
}

export interface EvaluationLoopResult {
  finalResult: AgentExecutionResult;
  finalScore: number;
  iterations: number;
  history: IterationRecord[];
  converged: boolean;
  totalTokensUsed: number;
  totalDuration: number;
}
```

### 3.3 Entity Relationships

```
[model_routing_rules] N ──── 1 [AgentTaskType enum]
                                    │
                                    ├── used by ModelRouter
                                    └── used by EvaluatorOptimizer

[EvaluationCriteria] N ──── 1 [EvaluatorOptimizer config]
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/agents/routing-rules` | 전체 라우팅 규칙 조회 | Required |
| PUT | `/agents/routing-rules/:taskType` | 특정 taskType 규칙 변경 | Required (admin) |
| POST | `/agents/evaluate-optimize` | E-O 루프 실행 | Required |

### 4.2 Detailed Specification

#### `GET /agents/routing-rules` (F136)

**Response (200):**
```json
{
  "rules": [
    {
      "id": "mrr_01",
      "taskType": "code-review",
      "modelId": "anthropic/claude-sonnet-4",
      "runnerType": "openrouter",
      "priority": 1,
      "maxCostPerCall": null,
      "enabled": true
    }
  ],
  "defaults": {
    "code-review": "anthropic/claude-sonnet-4",
    "spec-analysis": "anthropic/claude-opus-4",
    "test-generation": "anthropic/claude-haiku-4-5"
  }
}
```

#### `PUT /agents/routing-rules/:taskType` (F136)

**Request:**
```json
{
  "modelId": "anthropic/claude-opus-4",
  "priority": 1,
  "maxCostPerCall": 0.10,
  "enabled": true
}
```

**Response (200):**
```json
{
  "id": "mrr_01",
  "taskType": "code-review",
  "modelId": "anthropic/claude-opus-4",
  "priority": 1,
  "maxCostPerCall": 0.10,
  "enabled": true,
  "updatedAt": "2026-03-22T10:00:00Z"
}
```

**Error Responses:**
- `400`: 잘못된 taskType 또는 modelId
- `401`: 인증 필요
- `404`: 해당 taskType 규칙 없음 (이 경우 INSERT로 신규 생성)

#### `POST /agents/evaluate-optimize` (F137)

**Request:**
```json
{
  "taskType": "code-generation",
  "context": {
    "repoUrl": "https://github.com/KTDS-AXBD/Foundry-X",
    "branch": "master",
    "spec": {
      "title": "Add user validation",
      "description": "Validate user input on registration",
      "acceptanceCriteria": ["Email format check", "Password strength"]
    }
  },
  "config": {
    "maxIterations": 3,
    "qualityThreshold": 80,
    "criteria": ["code-review", "spec-compliance"]
  }
}
```

**Response (200):**
```json
{
  "finalResult": {
    "status": "success",
    "output": { "generatedCode": [...] },
    "tokensUsed": 1250,
    "model": "anthropic/claude-sonnet-4",
    "duration": 8500
  },
  "finalScore": 85,
  "iterations": 2,
  "converged": true,
  "totalTokensUsed": 3200,
  "totalDuration": 22000,
  "history": [
    {
      "iteration": 1,
      "aggregateScore": 72,
      "feedback": ["Missing email validation regex", "No error message for weak password"]
    },
    {
      "iteration": 2,
      "aggregateScore": 85,
      "feedback": []
    }
  ]
}
```

---

## 5. Service Implementation Details

### 5.1 ModelRouter (F136)

```typescript
export class ModelRouter {
  constructor(private db: D1Database) {}

  /** taskType에 맞는 최적 모델 조회 (D1 우선, DEFAULT_MODEL_MAP 폴백) */
  async getModelForTask(taskType: AgentTaskType): Promise<RoutingRule> {
    const row = await this.db
      .prepare(
        `SELECT * FROM model_routing_rules
         WHERE task_type = ? AND enabled = 1
         ORDER BY priority ASC LIMIT 1`
      )
      .bind(taskType)
      .first();

    if (row) return toRoutingRule(row as Record<string, unknown>);

    // D1에 규칙 없으면 폴백
    return {
      id: `default_${taskType}`,
      taskType,
      modelId: DEFAULT_MODEL_MAP[taskType],
      runnerType: "openrouter",
      priority: 999,
      maxCostPerCall: null,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /** 전체 규칙 조회 */
  async listRules(): Promise<RoutingRule[]> { /* SELECT * ORDER BY task_type, priority */ }

  /** 규칙 생성 또는 갱신 (UPSERT) */
  async upsertRule(
    taskType: AgentTaskType,
    patch: { modelId: string; priority?: number; maxCostPerCall?: number | null; enabled?: boolean }
  ): Promise<RoutingRule> { /* INSERT OR REPLACE */ }
}
```

### 5.2 createRoutedRunner (F136 — agent-runner.ts 확장)

```typescript
/**
 * taskType 기반 Runner 생성 — ModelRouter가 D1에서 최적 모델 선택
 * 기존 createAgentRunner()는 하위 호환을 위해 유지
 */
export async function createRoutedRunner(
  env: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_DEFAULT_MODEL?: string;
    ANTHROPIC_API_KEY?: string;
  },
  taskType: AgentTaskType,
  db?: D1Database,
): Promise<AgentRunner> {
  // D1 규칙 조회 (db 제공 시)
  if (db) {
    const router = new ModelRouter(db);
    const rule = await router.getModelForTask(taskType);

    if (rule.runnerType === "openrouter" && env.OPENROUTER_API_KEY) {
      return new OpenRouterRunner(env.OPENROUTER_API_KEY, rule.modelId);
    }
    if (rule.runnerType === "claude" && env.ANTHROPIC_API_KEY) {
      return new ClaudeApiRunner(env.ANTHROPIC_API_KEY, rule.modelId);
    }
  }

  // D1 없으면 기존 로직 폴백
  return createAgentRunner(env);
}
```

### 5.3 EvaluatorOptimizer (F137)

```typescript
export class EvaluatorOptimizer {
  private static readonly HARD_MAX_ITERATIONS = 5;

  constructor(private config: EvaluatorOptimizerConfig) {
    // 하드 리밋 강제
    this.config.maxIterations = Math.min(
      config.maxIterations,
      EvaluatorOptimizer.HARD_MAX_ITERATIONS,
    );
  }

  async run(request: AgentExecutionRequest): Promise<EvaluationLoopResult> {
    const history: IterationRecord[] = [];
    let currentRequest = request;
    let totalTokens = 0;
    const startTime = Date.now();

    for (let i = 1; i <= this.config.maxIterations; i++) {
      // Step 1: Generate
      const result = await this.config.generatorRunner.execute(currentRequest);
      totalTokens += result.tokensUsed;

      // Step 2: Evaluate
      const scores = this.config.criteria.map((c) => c.evaluate(result, currentRequest));
      const aggregateScore = this.weightedAverage(scores);
      const allFeedback = scores.flatMap((s) => s.feedback);

      history.push({ iteration: i, result, scores, aggregateScore, feedback: allFeedback });

      // Step 3: Check convergence
      if (aggregateScore >= this.config.qualityThreshold) {
        return this.buildResult(result, aggregateScore, i, history, true, totalTokens, startTime);
      }

      // Step 4: Improve (prepare next iteration)
      if (i < this.config.maxIterations) {
        currentRequest = this.buildImprovedRequest(currentRequest, result, allFeedback);
      }
    }

    // maxIterations 도달 — 최고 점수 결과 반환
    const best = history.reduce((a, b) => (a.aggregateScore > b.aggregateScore ? a : b));
    return this.buildResult(
      best.result, best.aggregateScore, history.length,
      history, false, totalTokens, startTime,
    );
  }

  /** 가중 평균 계산 */
  private weightedAverage(scores: EvaluationScore[]): number {
    const totalWeight = this.config.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return 0;
    return this.config.criteria.reduce(
      (sum, c, i) => sum + (scores[i].score * c.weight) / totalWeight,
      0,
    );
  }

  /** 피드백을 instructions에 주입하여 개선 요청 생성 */
  private buildImprovedRequest(
    original: AgentExecutionRequest,
    lastResult: AgentExecutionResult,
    feedback: string[],
  ): AgentExecutionRequest {
    const improvementInstructions = [
      original.context.instructions ?? "",
      "\n\n--- Improvement Feedback (iteration) ---",
      ...feedback.map((f, i) => `${i + 1}. ${f}`),
      "\nPlease address the above feedback and improve your output.",
    ].join("\n");

    return {
      ...original,
      context: {
        ...original.context,
        instructions: improvementInstructions,
        // 이전 생성 결과를 fileContents에 포함 (컨텍스트 유지)
        fileContents: {
          ...original.context.fileContents,
          ...Object.fromEntries(
            (lastResult.output.generatedCode ?? []).map((c) => [c.path, c.content]),
          ),
        },
      },
    };
  }

  private buildResult(
    finalResult: AgentExecutionResult,
    finalScore: number,
    iterations: number,
    history: IterationRecord[],
    converged: boolean,
    totalTokens: number,
    startTime: number,
  ): EvaluationLoopResult {
    return {
      finalResult, finalScore, iterations, history, converged,
      totalTokensUsed: totalTokens,
      totalDuration: Date.now() - startTime,
    };
  }
}
```

### 5.4 EvaluationCriteria 플러그인 (F137)

```typescript
// evaluation-criteria.ts

/** 코드 리뷰 기준 — reviewComments 기반 점수 */
export class CodeReviewCriteria implements EvaluationCriteria {
  readonly name = "code-review";
  readonly weight = 0.4;

  evaluate(result: AgentExecutionResult, _request: AgentExecutionRequest): EvaluationScore {
    const comments = result.output.reviewComments ?? [];
    const errors = comments.filter((c) => c.severity === "error").length;
    const warnings = comments.filter((c) => c.severity === "warning").length;

    // 에러 0 + 경고 ≤2 = 100점, 에러마다 -20, 경고마다 -5
    const score = Math.max(0, 100 - errors * 20 - warnings * 5);
    const feedback = comments
      .filter((c) => c.severity === "error")
      .map((c) => `[${c.file}:${c.line}] ${c.comment}`);

    return {
      criteriaName: this.name,
      score,
      passed: score >= 80,
      feedback,
      details: { errors, warnings, totalComments: comments.length },
    };
  }
}

/** 테스트 커버리지 기준 — generatedCode에 테스트 파일 포함 여부 */
export class TestCoverageCriteria implements EvaluationCriteria {
  readonly name = "test-coverage";
  readonly weight = 0.3;

  evaluate(result: AgentExecutionResult, request: AgentExecutionRequest): EvaluationScore {
    const code = result.output.generatedCode ?? [];
    const testFiles = code.filter((c) => c.path.includes(".test.") || c.path.includes("__tests__"));
    const srcFiles = code.filter((c) => !c.path.includes(".test.") && !c.path.includes("__tests__"));

    const ratio = srcFiles.length > 0 ? (testFiles.length / srcFiles.length) * 100 : 0;
    const score = Math.min(100, ratio);
    const feedback: string[] = [];

    if (testFiles.length === 0 && srcFiles.length > 0) {
      feedback.push("No test files generated. Add unit tests for the implementation.");
    }
    if (ratio < 80) {
      feedback.push(`Test-to-source ratio is ${ratio.toFixed(0)}%. Target: >= 80%.`);
    }

    return {
      criteriaName: this.name,
      score,
      passed: score >= 80,
      feedback,
      details: { testFiles: testFiles.length, srcFiles: srcFiles.length, ratio },
    };
  }
}

/** 스펙 충족도 기준 — acceptanceCriteria 언급 여부 */
export class SpecComplianceCriteria implements EvaluationCriteria {
  readonly name = "spec-compliance";
  readonly weight = 0.3;

  evaluate(result: AgentExecutionResult, request: AgentExecutionRequest): EvaluationScore {
    const criteria = request.context.spec?.acceptanceCriteria ?? [];
    if (criteria.length === 0) {
      return { criteriaName: this.name, score: 100, passed: true, feedback: [], details: {} };
    }

    const output = JSON.stringify(result.output).toLowerCase();
    const met = criteria.filter((c) => output.includes(c.toLowerCase()));
    const score = (met.length / criteria.length) * 100;
    const missed = criteria.filter((c) => !output.includes(c.toLowerCase()));
    const feedback = missed.map((c) => `Acceptance criteria not addressed: "${c}"`);

    return {
      criteriaName: this.name,
      score,
      passed: score >= 80,
      feedback,
      details: { total: criteria.length, met: met.length, missed: missed.length },
    };
  }
}
```

### 5.5 WorkflowEngine 통합 (F137)

```typescript
// workflow-engine.ts — executeNode() 확장

case "evaluate_optimize": {
  const eoConfig = node.data.config as {
    maxIterations?: number;
    qualityThreshold?: number;
    criteria?: string[];
  };
  // EvaluatorOptimizer 실행은 현재 placeholder
  // 실제 Runner 연결은 Agent Orchestrator 통합 시 (리더 Step)
  ctx.lastResult = {
    actionType: "evaluate_optimize",
    processed: true,
    config: eoConfig,
  };
  break;
}
```

---

## 6. Zod Schemas (agent.ts 확장)

### 6.1 F136 Schemas

```typescript
// ─── Sprint 36: Model Routing Schemas (F136) ───

export const RoutingRuleSchema = z
  .object({
    id: z.string(),
    taskType: z.enum([
      "code-review", "code-generation", "spec-analysis",
      "test-generation", "policy-evaluation", "skill-query", "ontology-lookup",
    ]),
    modelId: z.string(),
    runnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]),
    priority: z.number().int().min(1),
    maxCostPerCall: z.number().nullable(),
    enabled: z.boolean(),
  })
  .openapi("RoutingRule");

export const UpdateRoutingRuleRequestSchema = z
  .object({
    modelId: z.string().describe("OpenRouter 모델 ID (e.g., anthropic/claude-sonnet-4)"),
    priority: z.number().int().min(1).default(1).optional(),
    maxCostPerCall: z.number().nullable().optional(),
    enabled: z.boolean().default(true).optional(),
  })
  .openapi("UpdateRoutingRuleRequest");

export const RoutingRulesResponseSchema = z
  .object({
    rules: z.array(RoutingRuleSchema),
    defaults: z.record(z.string()),
  })
  .openapi("RoutingRulesResponse");
```

### 6.2 F137 Schemas

```typescript
// ─── Sprint 36: Evaluator-Optimizer Schemas (F137) ───

export const EvaluationScoreSchema = z
  .object({
    criteriaName: z.string(),
    score: z.number().min(0).max(100),
    passed: z.boolean(),
    feedback: z.array(z.string()),
    details: z.record(z.unknown()),
  })
  .openapi("EvaluationScore");

export const EvaluateOptimizeRequestSchema = z
  .object({
    taskType: z.enum([
      "code-review", "code-generation", "spec-analysis",
      "test-generation", "policy-evaluation", "skill-query", "ontology-lookup",
    ]),
    context: z.object({
      repoUrl: z.string().default("https://github.com/KTDS-AXBD/Foundry-X"),
      branch: z.string().default("master"),
      targetFiles: z.array(z.string()).optional(),
      spec: z.object({
        title: z.string(),
        description: z.string(),
        acceptanceCriteria: z.array(z.string()),
      }).optional(),
      instructions: z.string().max(2000).optional(),
    }),
    config: z.object({
      maxIterations: z.number().int().min(1).max(5).default(3),
      qualityThreshold: z.number().min(0).max(100).default(80),
      criteria: z.array(z.enum(["code-review", "test-coverage", "spec-compliance"])),
    }),
  })
  .openapi("EvaluateOptimizeRequest");

export const EvaluationLoopResultSchema = z
  .object({
    finalResult: AgentExecutionResultSchema,
    finalScore: z.number(),
    iterations: z.number(),
    converged: z.boolean(),
    totalTokensUsed: z.number(),
    totalDuration: z.number(),
    history: z.array(z.object({
      iteration: z.number(),
      aggregateScore: z.number(),
      feedback: z.array(z.string()),
    })),
  })
  .openapi("EvaluationLoopResult");
```

---

## 7. Error Handling

### 7.1 Error Codes

| Code | Context | Cause | Handling |
|------|---------|-------|----------|
| 400 | PUT routing-rules | 잘못된 taskType 또는 modelId 형식 | Zod validation |
| 400 | POST evaluate-optimize | 잘못된 criteria 이름 또는 config | Zod validation |
| 401 | 모든 엔드포인트 | 인증 토큰 없음 | authGuard 미들웨어 |
| 404 | PUT routing-rules | 기존 규칙 없음 | UPSERT로 자동 생성 (실질적 404 없음) |
| 500 | evaluate-optimize | Runner 실행 실패 | 현재 iteration까지의 history와 함께 partial result 반환 |

### 7.2 E-O 루프 에러 전략

```typescript
// Runner 실패 시: 해당 iteration을 failed로 기록하고 다음 iteration으로 계속
// maxIterations 모두 실패 시: 마지막 성공 결과 반환 (없으면 failed result)
try {
  const result = await runner.execute(request);
  // ... 평가
} catch (err) {
  history.push({
    iteration: i,
    result: { status: "failed", output: { analysis: String(err) }, tokensUsed: 0, model: "unknown", duration: 0 },
    scores: [],
    aggregateScore: 0,
    feedback: [`Execution failed: ${err}`],
  });
  continue; // 다음 iteration 시도
}
```

---

## 8. Security Considerations

- [x] Input validation: Zod 스키마로 모든 입력 검증 (taskType enum, modelId 문자열, 숫자 범위)
- [x] Authentication: authGuard 미들웨어 (기존 패턴)
- [x] maxIterations 하드 리밋: 5회 초과 불가 (리소스 남용 방지)
- [x] D1 SQL injection: prepared statement 사용 (기존 패턴)
- [ ] Rate limiting: 후속 Sprint에서 추가 (현재 Workers 레벨 제한만)

---

## 9. Test Plan

### 9.1 Test Scope

| Type | Target | Count | Tool |
|------|--------|:-----:|------|
| Unit | ModelRouter 서비스 | 7 | vitest + D1 mock |
| Unit | EvaluatorOptimizer 서비스 | 6 | vitest + MockRunner |
| Unit | EvaluationCriteria 3종 | 3 | vitest |
| API | routing-rules 엔드포인트 | 5 | vitest + Hono app.request() |
| API | evaluate-optimize 엔드포인트 | 3 | vitest + Hono app.request() |
| Integration | createRoutedRunner 팩토리 | 2 | vitest |
| Integration | WorkflowEngine e-o 액션 | 1 | vitest |

### 9.2 Test File Mapping

| File | Feature | Tests |
|------|---------|:-----:|
| `model-router.test.ts` | F136 | 15+ |
| `evaluator-optimizer.test.ts` | F137 | 12+ |

### 9.3 Key Test Cases

**F136:**
- [x] D1 규칙 존재 → 최우선 모델 반환
- [x] D1 규칙 없음 → DEFAULT_MODEL_MAP 폴백
- [x] disabled 규칙 건너뜀
- [x] createRoutedRunner → OpenRouter키+규칙 → 올바른 모델 Runner
- [x] 기존 createAgentRunner 하위호환

**F137:**
- [x] 1회만에 threshold 통과 → converged=true, iterations=1
- [x] 3회 반복 → threshold 도달
- [x] maxIterations 도달 → converged=false, 최고 점수 결과
- [x] Runner 실패 → 다음 iteration 계속
- [x] CodeReview/TestCoverage/SpecCompliance 각각 점수 계산

---

## 10. Implementation Order (Worker Assignments)

### Worker 1 (F136): 태스크별 모델 라우팅

| Step | 파일 | 작업 | 예상 |
|:----:|------|------|:----:|
| 1 | `migrations/0022_model_routing.sql` | 테이블 + 시드 | 5min |
| 2 | `services/model-router.ts` | ModelRouter 서비스 전체 | 15min |
| 3 | `services/agent-runner.ts` | createRoutedRunner() 추가 | 10min |
| 4 | `schemas/agent.ts` | RoutingRule 관련 스키마 3개 | 5min |
| 5 | `routes/agent.ts` | GET/PUT routing-rules | 10min |
| 6 | `__tests__/model-router.test.ts` | 15개+ 테스트 | 15min |

**수정 허용 파일 (W1):**
- `packages/api/src/db/migrations/0022_model_routing.sql` (신규)
- `packages/api/src/services/model-router.ts` (신규)
- `packages/api/src/services/agent-runner.ts` (수정)
- `packages/api/src/schemas/agent.ts` (수정)
- `packages/api/src/routes/agent.ts` (수정)
- `packages/api/src/__tests__/model-router.test.ts` (신규)

### Worker 2 (F137): Evaluator-Optimizer 패턴

| Step | 파일 | 작업 | 예상 |
|:----:|------|------|:----:|
| 1 | `services/evaluation-criteria.ts` | 3종 평가 기준 플러그인 | 15min |
| 2 | `services/evaluator-optimizer.ts` | E-O 루프 서비스 | 20min |
| 3 | `schemas/agent.ts` | Evaluation 관련 스키마 3개 | 5min |
| 4 | `routes/agent.ts` | POST evaluate-optimize | 10min |
| 5 | `services/workflow-engine.ts` | evaluate_optimize 액션 | 5min |
| 6 | `__tests__/evaluator-optimizer.test.ts` | 12개+ 테스트 | 15min |

**수정 허용 파일 (W2):**
- `packages/api/src/services/evaluation-criteria.ts` (신규)
- `packages/api/src/services/evaluator-optimizer.ts` (신규)
- `packages/api/src/schemas/agent.ts` (수정 — ⚠️ W1과 공유, 서로 다른 위치)
- `packages/api/src/routes/agent.ts` (수정 — ⚠️ W1과 공유, 서로 다른 엔드포인트)
- `packages/api/src/services/workflow-engine.ts` (수정)
- `packages/api/src/__tests__/evaluator-optimizer.test.ts` (신규)

### 리더 통합 Step

| Step | 작업 |
|:----:|------|
| 1 | W1+W2 완료 확인, agent.ts routes/schemas merge 충돌 해결 |
| 2 | Agent Orchestrator에서 `createRoutedRunner` 연결 (기존 `createAgentRunner` 호출 부분) |
| 3 | typecheck + lint + 전체 테스트 실행 |
| 4 | PDCA 분석 (gap-detector) |

---

## 11. Coding Convention Reference

### 11.1 This Feature's Conventions

| Item | Convention |
|------|-----------|
| 서비스 클래스 | PascalCase (`ModelRouter`, `EvaluatorOptimizer`) |
| 팩토리 함수 | camelCase (`createRoutedRunner`) |
| D1 테이블명 | snake_case (`model_routing_rules`) |
| 스키마 | PascalCase + Schema 접미사 (`RoutingRuleSchema`) |
| 테스트 파일 | `{feature}.test.ts` (kebab-case) |
| 타입 import | `import type` 분리 (기존 프로젝트 컨벤션) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-22 | Initial design | Sinclair Seo |
