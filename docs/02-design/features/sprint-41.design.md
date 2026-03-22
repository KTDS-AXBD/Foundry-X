---
code: FX-DSGN-041
title: "Sprint 41 — 에이전트 역할 커스터마이징 + 멀티모델 앙상블 투표 상세 설계 (F146+F147)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-41
sprint: 41
phase: "Phase 5a"
references:
  - "[[FX-PLAN-041]]"
  - "[[FX-DSGN-040]]"
---

## 1. 설계 개요

### 1.1 목적

기존 Agent Evolution 인프라(7종 역할 에이전트 + ModelRouter + EvaluatorOptimizer + FallbackChain + SelfReflection) 위에 **플랫폼 확장 2종** 레이어를 추가:
- **CustomRoleManager** (F146) — D1 기반 사용자 정의 에이전트 역할 CRUD + Orchestrator 동적 위임
- **EnsembleVoting** (F147) — N개 모델 병렬 실행 + 투표/점수 기반 최적 결과 선택

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| **기존 AgentRunner 인터페이스 비침습** | systemPromptOverride 필드로 커스텀 프롬프트 주입 — Runner 클래스 수정 최소화 |
| **Open-Closed Principle** | `custom:*` taskType 패턴으로 기존 AgentTaskType 유니온 변경 없이 확장 |
| **createRoutedRunner 재활용** | EnsembleVoting도 기존 팩토리 패턴으로 모델별 Runner 생성 |
| **D1 기반 역할 저장** | 코드 변경 없이 API로 역할 추가/수정/삭제 가능 |
| **Promise.allSettled 기반 내결함성** | 앙상블 실행 중 일부 모델 실패해도 나머지 결과로 투표 |

---

## 2. 아키텍처

### 2.1 CustomRoleManager 실행 흐름

```
사용자 → POST /agents/roles { name:"code-optimizer", systemPrompt:"...", taskType:"code-review" }
  │
  └─ CustomRoleManager.createRole() → D1 INSERT → { id: "role-abc123" }

이후 실행:
  사용자 → POST /agents/execute { taskType:"custom:role-abc123", ... }
    │
    ├─ AgentOrchestrator.executeTask()
    │     └─ taskType.startsWith("custom:") 감지
    │     └─ CustomRoleManager.getRole("role-abc123")
    │           └─ D1 SELECT → { systemPrompt, preferredModel, allowedTools }
    │
    ├─ createRunnerForCustomRole(env, role)
    │     └─ OpenRouterRunner(apiKey, role.preferredModel)
    │
    └─ runner.execute({ ...request, systemPromptOverride: role.systemPrompt })
         └─ prompt-utils에서 override 우선 사용
         └─ 결과 반환
```

### 2.2 EnsembleVoting 실행 흐름

```
사용자 → POST /agents/ensemble {
  request: { taskType:"code-review", context:{...} },
  models: ["anthropic/claude-sonnet-4", "google/gemini-2.5-pro", "openai/gpt-4o"],
  strategy: "quality-score"
}
  │
  ├─ EnsembleVoting.executeEnsemble()
  │     │
  │     ├─ 모델별 Runner 생성
  │     │   runners = models.map(m => new OpenRouterRunner(apiKey, m))
  │     │
  │     ├─ Promise.allSettled(runners.map(r => r.execute(request)))
  │     │   → settled: [
  │     │       { status:"fulfilled", value: result1 },
  │     │       { status:"rejected",  reason: timeout },
  │     │       { status:"fulfilled", value: result3 },
  │     │     ]
  │     │
  │     ├─ 성공 결과만 수집 → [result1, result3]
  │     │
  │     └─ selectBest([result1, result3], "quality-score")
  │           └─ 평가 Runner로 각 결과 점수 매기기
  │           └─ 최고 점수 결과 선택
  │
  └─ 반환: EnsembleResult {
       winner: result1,
       allResults: [{ model, result, score }],
       votingDetails: { strategy, modelCount, failedCount, ... }
     }
```

---

## 3. 상세 설계 — F146 CustomRoleManager

### 3.1 타입 정의

```typescript
// ── custom-role-manager.ts ────────────────────────────────

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];       // 메타데이터 (실행 권한 검증은 Phase 5b)
  preferredModel: string | null; // e.g. "anthropic/claude-sonnet-4"
  preferredRunnerType: AgentRunnerType;
  taskType: AgentTaskType;       // 베이스 taskType (프롬프트 폴백 + 모델 라우팅 기준)
  orgId: string | null;          // null = 글로벌
  isBuiltin: boolean;            // true = 삭제/수정 불가
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  systemPrompt: string;
  allowedTools?: string[];
  preferredModel?: string;
  preferredRunnerType?: AgentRunnerType;
  taskType: AgentTaskType;      // 베이스 taskType
  orgId?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  preferredModel?: string | null;
  preferredRunnerType?: AgentRunnerType;
  taskType?: AgentTaskType;
  enabled?: boolean;
}

// D1 row shape
interface CustomRoleRow {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  allowed_tools: string;         // JSON array string
  preferred_model: string | null;
  preferred_runner_type: string;
  task_type: string;
  org_id: string | null;
  is_builtin: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}
```

### 3.2 CustomRoleManager 클래스

```typescript
export class CustomRoleManager {
  constructor(private db: D1Database) {}

  /**
   * 커스텀 역할 생성
   * - name 중복 체크 (UNIQUE 제약)
   * - id는 "role-" + UUID 8자
   */
  async createRole(input: CreateRoleInput): Promise<CustomRole> {
    const id = `role-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await this.db.prepare(
      `INSERT INTO custom_agent_roles
       (id, name, description, system_prompt, allowed_tools,
        preferred_model, preferred_runner_type, task_type,
        org_id, is_builtin, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`
    ).bind(
      id,
      input.name,
      input.description ?? "",
      input.systemPrompt,
      JSON.stringify(input.allowedTools ?? []),
      input.preferredModel ?? null,
      input.preferredRunnerType ?? "openrouter",
      input.taskType,
      input.orgId ?? null,
      now, now
    ).run();

    return this.getRole(id);
  }

  /**
   * 역할 단일 조회
   * - roleId로 조회, 없으면 null
   */
  async getRole(roleId: string): Promise<CustomRole | null>;

  /**
   * 역할 목록 조회
   * - orgId 필터 (null이면 글로벌만, 값이면 글로벌+해당 org)
   * - enabled 필터 옵션
   */
  async listRoles(orgId?: string, includeDisabled?: boolean): Promise<CustomRole[]>;

  /**
   * 역할 수정
   * - is_builtin=1이면 에러 (내장 역할 수정 불가)
   * - partial update (제공된 필드만 갱신)
   */
  async updateRole(roleId: string, input: UpdateRoleInput): Promise<CustomRole>;

  /**
   * 역할 삭제
   * - is_builtin=1이면 에러 (내장 역할 삭제 불가)
   */
  async deleteRole(roleId: string): Promise<void>;
}
```

### 3.3 systemPromptOverride 메커니즘

기존 `prompt-utils.ts`에 최소 변경으로 커스텀 프롬프트를 지원:

```typescript
// prompt-utils.ts 변경 (1줄 추가)

// 기존:
// const systemPrompt = TASK_SYSTEM_PROMPTS[request.taskType];

// 변경 후:
export function getSystemPrompt(request: AgentExecutionRequest): string {
  return request.context.systemPromptOverride
    ?? TASK_SYSTEM_PROMPTS[request.taskType]
    ?? `You are an AI agent for the Foundry-X project. ${request.taskType} task.`;
}
```

`AgentExecutionRequest.context`에 `systemPromptOverride` 필드 추가:

```typescript
// execution-types.ts — context 확장
export interface AgentExecutionRequest {
  // ... 기존 필드 유지 ...
  context: {
    repoUrl: string;
    branch: string;
    targetFiles?: string[];
    spec?: { title: string; description: string; acceptanceCriteria: string[] };
    instructions?: string;
    fileContents?: Record<string, string>;
    systemPromptOverride?: string;  // F146 NEW: 커스텀 역할 프롬프트 오버라이드
  };
  constraints: AgentConstraintRule[];
}
```

`OpenRouterRunner.execute()` 변경:

```typescript
// openrouter-runner.ts 변경 (1줄)
// 기존: const systemPrompt = TASK_SYSTEM_PROMPTS[request.taskType];
// 변경:
const systemPrompt = getSystemPrompt(request);
```

**이 패턴의 장점:**
- Runner 클래스 변경 최소화 (1줄)
- 모든 Runner 타입(OpenRouter, Claude API, MCP)에 일관 적용
- 커스텀 역할 외에도 범용적으로 프롬프트 오버라이드 가능

### 3.4 Orchestrator 위임 — custom:* 패턴

```typescript
// agent-orchestrator.ts — executeTask() 내 위임 블록 (기존 역할 위임 이전에 삽입)

// F146: 커스텀 역할 위임
if (typeof taskType === "string" && taskType.startsWith("custom:") && this.customRoleManager) {
  const roleId = taskType.slice("custom:".length);
  const role = await this.customRoleManager.getRole(roleId);

  if (!role) {
    return {
      status: "failed",
      output: { analysis: `Custom role not found: ${roleId}` },
      tokensUsed: 0, model: "none", duration: 0,
    };
  }

  if (!role.enabled) {
    return {
      status: "failed",
      output: { analysis: `Custom role is disabled: ${role.name}` },
      tokensUsed: 0, model: "none", duration: 0,
    };
  }

  // role.taskType 기반으로 Runner 생성 (모델 라우팅 활용)
  const runner = role.preferredModel
    ? new OpenRouterRunner(env.OPENROUTER_API_KEY!, role.preferredModel)
    : await createRoutedRunner(env, role.taskType, this.db);

  // systemPromptOverride로 커스텀 프롬프트 주입
  const customRequest: AgentExecutionRequest = {
    ...delegateRequest,
    context: {
      ...delegateRequest.context,
      systemPromptOverride: role.systemPrompt,
    },
  };

  const result = await runner.execute(customRequest);
  await this.recordTaskResult(taskId, sessionId, agentId, result);
  return result;
}
```

### 3.5 내장 역할 목록 (코드 기반, D1 미저장)

`listRoles()`가 호출되면 하드코딩 7종을 먼저 반환하고, D1 커스텀 역할을 이어서 반환:

```typescript
const BUILTIN_ROLES: CustomRole[] = [
  { id: "builtin-reviewer", name: "Reviewer", taskType: "code-review", isBuiltin: true, ... },
  { id: "builtin-planner", name: "Planner", taskType: "spec-analysis", isBuiltin: true, ... },
  { id: "builtin-architect", name: "Architect", taskType: "spec-analysis", isBuiltin: true, ... },
  { id: "builtin-test", name: "Test", taskType: "test-generation", isBuiltin: true, ... },
  { id: "builtin-security", name: "Security", taskType: "security-review", isBuiltin: true, ... },
  { id: "builtin-qa", name: "QA", taskType: "qa-testing", isBuiltin: true, ... },
  { id: "builtin-infra", name: "Infra", taskType: "infra-analysis", isBuiltin: true, ... },
];

async listRoles(orgId?: string, includeDisabled = false): Promise<CustomRole[]> {
  // 1. 내장 역할 (항상 포함)
  const builtins = BUILTIN_ROLES;

  // 2. D1 커스텀 역할
  let query = "SELECT * FROM custom_agent_roles WHERE (org_id IS NULL";
  if (orgId) query += ` OR org_id = '${orgId}'`; // parameterized in actual code
  query += ")";
  if (!includeDisabled) query += " AND enabled = 1";
  query += " ORDER BY name";

  const { results } = await this.db.prepare(query).all<CustomRoleRow>();
  const customs = results.map(toCustomRole);

  return [...builtins, ...customs];
}
```

### 3.6 D1 마이그레이션 0024

```sql
-- 0024_custom_agent_roles.sql

CREATE TABLE IF NOT EXISTS custom_agent_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL,
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  preferred_model TEXT,
  preferred_runner_type TEXT NOT NULL DEFAULT 'openrouter',
  task_type TEXT NOT NULL,
  org_id TEXT,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_org ON custom_agent_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_task ON custom_agent_roles(task_type);
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON custom_agent_roles(name);
```

### 3.7 API 스키마 (schemas/agent.ts 추가)

```typescript
// F146: CustomRole 스키마
export const CreateCustomRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(10).max(10000),
  allowedTools: z.array(z.string()).max(20).optional(),
  preferredModel: z.string().max(100).optional(),
  preferredRunnerType: z.enum(["openrouter", "claude-api", "mcp"]).optional(),
  taskType: z.enum([
    "code-review", "code-generation", "spec-analysis",
    "test-generation", "security-review", "qa-testing",
    "infra-analysis", "policy-evaluation", "skill-query", "ontology-lookup",
  ]),
  orgId: z.string().optional(),
});

export const UpdateCustomRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(10).max(10000).optional(),
  allowedTools: z.array(z.string()).max(20).optional(),
  preferredModel: z.string().max(100).nullable().optional(),
  preferredRunnerType: z.enum(["openrouter", "claude-api", "mcp"]).optional(),
  taskType: z.enum([
    "code-review", "code-generation", "spec-analysis",
    "test-generation", "security-review", "qa-testing",
    "infra-analysis", "policy-evaluation", "skill-query", "ontology-lookup",
  ]).optional(),
  enabled: z.boolean().optional(),
});

export const CustomRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  allowedTools: z.array(z.string()),
  preferredModel: z.string().nullable(),
  preferredRunnerType: z.string(),
  taskType: z.string(),
  orgId: z.string().nullable(),
  isBuiltin: z.boolean(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

### 3.8 API 엔드포인트 상세

#### POST /agents/roles
```typescript
// Request: CreateCustomRoleSchema
// Response 201: CustomRoleSchema
// Error 409: name 중복
```

#### GET /agents/roles
```typescript
// Query params: orgId? (string), includeDisabled? (boolean)
// Response 200: z.array(CustomRoleSchema)
// 내장 7종 + D1 커스텀 역할 합산 반환
```

#### GET /agents/roles/:id
```typescript
// Response 200: CustomRoleSchema
// Error 404: 역할 미존재
```

#### PUT /agents/roles/:id
```typescript
// Request: UpdateCustomRoleSchema
// Response 200: CustomRoleSchema
// Error 404: 역할 미존재
// Error 403: is_builtin=1 수정 시도
```

#### DELETE /agents/roles/:id
```typescript
// Response 204: 삭제 성공
// Error 404: 역할 미존재
// Error 403: is_builtin=1 삭제 시도
```

---

## 4. 상세 설계 — F147 EnsembleVoting

### 4.1 타입 정의

```typescript
// ── ensemble-voting.ts ────────────────────────────────────

export type VotingStrategy = "majority" | "quality-score" | "weighted";

export interface EnsembleConfig {
  models: string[];                    // 최소 2개, 최대 5개
  strategy: VotingStrategy;
  weights?: Record<string, number>;    // "weighted" 전략용 (모델별 가중치)
  evaluationModel?: string;            // "quality-score" 전략용 평가 모델
  timeoutMs?: number;                  // 개별 모델 타임아웃 (기본 30s)
}

export interface ModelResult {
  model: string;
  result: AgentExecutionResult | null;  // null = 실패
  score: number;                         // 투표 점수 (0-100)
  latencyMs: number;
  error?: string;                        // 실패 사유
}

export interface EnsembleResult {
  winner: AgentExecutionResult;
  winnerModel: string;
  winnerScore: number;
  allResults: ModelResult[];
  votingDetails: {
    strategy: VotingStrategy;
    modelCount: number;
    succeededCount: number;
    failedCount: number;
    totalLatencyMs: number;             // 병렬이므로 max(개별 latency)
    totalTokensUsed: number;
  };
}

// 투표 전략 설명 (GET /agents/ensemble/strategies 응답용)
export interface StrategyInfo {
  name: VotingStrategy;
  description: string;
  costMultiplier: string;               // "1x", "1.3x" 등
  bestFor: string;
}
```

### 4.2 EnsembleVoting 클래스

```typescript
export class EnsembleVoting {
  static readonly MIN_MODELS = 2;
  static readonly MAX_MODELS = 5;
  static readonly DEFAULT_TIMEOUT_MS = 30_000;

  constructor(
    private env: {
      OPENROUTER_API_KEY?: string;
      OPENROUTER_DEFAULT_MODEL?: string;
      ANTHROPIC_API_KEY?: string;
    },
  ) {}

  /**
   * N개 모델로 병렬 실행 + 투표 전략 적용
   * - models 수 검증 (2~5개)
   * - Promise.allSettled 기반 병렬 실행
   * - 실패 모델 제외, 성공 결과로 투표
   * - 모든 모델 실패 시 에러 반환
   */
  async executeEnsemble(
    request: AgentExecutionRequest,
    config: EnsembleConfig,
  ): Promise<EnsembleResult> {
    this.validateConfig(config);

    const runners = config.models.map(model =>
      new OpenRouterRunner(this.env.OPENROUTER_API_KEY!, model)
    );

    const startTime = Date.now();

    // 병렬 실행
    const settled = await Promise.allSettled(
      runners.map(async (runner, i) => {
        const modelStart = Date.now();
        const result = await runner.execute(request);
        return {
          model: config.models[i]!,
          result,
          latencyMs: Date.now() - modelStart,
        };
      })
    );

    // 성공/실패 분류
    const modelResults: ModelResult[] = settled.map((s, i) => {
      if (s.status === "fulfilled") {
        return {
          model: config.models[i]!,
          result: s.value.result,
          score: 0,  // selectBest에서 채움
          latencyMs: s.value.latencyMs,
        };
      }
      return {
        model: config.models[i]!,
        result: null,
        score: 0,
        latencyMs: 0,
        error: s.reason instanceof Error ? s.reason.message : String(s.reason),
      };
    });

    const succeeded = modelResults.filter(r => r.result !== null);
    if (succeeded.length === 0) {
      throw new Error("All models failed in ensemble execution");
    }

    // 투표
    const scored = await this.selectBest(succeeded, config);

    const winner = scored.reduce((a, b) => a.score > b.score ? a : b);
    const totalLatencyMs = Date.now() - startTime;

    return {
      winner: winner.result!,
      winnerModel: winner.model,
      winnerScore: winner.score,
      allResults: scored.map(s => {
        const failed = modelResults.find(r => r.result === null && r.model === s.model);
        return failed ?? s;
      }),
      votingDetails: {
        strategy: config.strategy,
        modelCount: config.models.length,
        succeededCount: succeeded.length,
        failedCount: config.models.length - succeeded.length,
        totalLatencyMs,
        totalTokensUsed: succeeded.reduce((sum, r) => sum + (r.result?.tokensUsed ?? 0), 0),
      },
    };
  }

  /**
   * 투표 전략별 최적 결과 선택
   */
  async selectBest(
    results: ModelResult[],
    config: EnsembleConfig,
  ): Promise<ModelResult[]>;

  private validateConfig(config: EnsembleConfig): void;
}
```

### 4.3 투표 전략 구현

#### majority — 결론 유사도 기반 다수결

```typescript
private selectByMajority(results: ModelResult[]): ModelResult[] {
  // 각 결과의 analysis 텍스트에서 핵심 키워드/결론 추출
  // 코사인 유사도 또는 Jaccard 유사도로 그룹화
  // 가장 큰 그룹의 대표 결과에 높은 점수 부여
  //
  // 간소화 구현:
  // 1. 각 result.output.analysis에서 JSON 파싱 시도
  // 2. 리뷰: severity 분포 비교, 생성: 파일 수/구조 비교
  // 3. 가장 많은 결과와 유사한 결과 = 다수결 승자

  for (const r of results) {
    const similarities = results
      .filter(other => other.model !== r.model)
      .map(other => this.calculateSimilarity(r, other));
    r.score = Math.round(
      similarities.reduce((a, b) => a + b, 0) / similarities.length * 100
    );
  }
  return results;
}
```

#### quality-score — LLM 점수 평가

```typescript
private async selectByQualityScore(
  results: ModelResult[],
  evaluationModel?: string,
): Promise<ModelResult[]> {
  // 평가용 Runner 생성 (별도 모델 또는 기본 모델)
  const evalModel = evaluationModel ?? "anthropic/claude-haiku-4-5";
  const evalRunner = new OpenRouterRunner(this.env.OPENROUTER_API_KEY!, evalModel);

  // 각 결과를 평가 모델에게 0-100 점수 요청
  const evaluations = await Promise.allSettled(
    results.map(async (r) => {
      const evalRequest: AgentExecutionRequest = {
        taskId: `eval-${r.model}`,
        agentId: "ensemble-evaluator",
        taskType: "policy-evaluation",
        context: {
          repoUrl: "",
          branch: "",
          systemPromptOverride: ENSEMBLE_EVALUATION_PROMPT,
          instructions: `Evaluate this agent output:\n\n${JSON.stringify(r.result?.output)}`,
        },
        constraints: [],
      };
      const evalResult = await evalRunner.execute(evalRequest);
      return this.parseEvalScore(evalResult);
    })
  );

  for (let i = 0; i < results.length; i++) {
    const eval_ = evaluations[i]!;
    results[i]!.score = eval_.status === "fulfilled" ? eval_.value : 50;
  }
  return results;
}
```

#### weighted — 사전 가중치 기반

```typescript
private selectByWeighted(
  results: ModelResult[],
  weights?: Record<string, number>,
): ModelResult[] {
  // 가중치 기본값: 모델별 동일 가중치
  const defaultWeight = 100 / results.length;

  for (const r of results) {
    const weight = weights?.[r.model] ?? defaultWeight;
    // 기본 점수(토큰 효율성, 응답 시간) × 가중치
    const efficiency = r.result
      ? Math.max(0, 100 - (r.result.tokensUsed / 100))
      : 0;
    r.score = Math.round(efficiency * (weight / 100));
  }
  return results;
}
```

### 4.4 유사도 계산 (majority 전략용)

```typescript
/**
 * 두 결과의 유사도 계산 (0-1)
 * JSON 구조 기반 비교:
 * - reviewComments: severity 분포 + 파일 겹침
 * - generatedCode: 경로 + 액션 겹침
 * - analysis: 텍스트 Jaccard 유사도
 */
private calculateSimilarity(a: ModelResult, b: ModelResult): number {
  const outputA = a.result?.output;
  const outputB = b.result?.output;
  if (!outputA || !outputB) return 0;

  // reviewComments 기반
  if (outputA.reviewComments && outputB.reviewComments) {
    const filesA = new Set(outputA.reviewComments.map(c => c.file));
    const filesB = new Set(outputB.reviewComments.map(c => c.file));
    const intersection = [...filesA].filter(f => filesB.has(f)).length;
    const union = new Set([...filesA, ...filesB]).size;
    return union > 0 ? intersection / union : 0;
  }

  // generatedCode 기반
  if (outputA.generatedCode && outputB.generatedCode) {
    const pathsA = new Set(outputA.generatedCode.map(c => c.path));
    const pathsB = new Set(outputB.generatedCode.map(c => c.path));
    const intersection = [...pathsA].filter(p => pathsB.has(p)).length;
    const union = new Set([...pathsA, ...pathsB]).size;
    return union > 0 ? intersection / union : 0;
  }

  // analysis 텍스트 Jaccard
  if (outputA.analysis && outputB.analysis) {
    const wordsA = new Set(outputA.analysis.toLowerCase().split(/\s+/));
    const wordsB = new Set(outputB.analysis.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
  }

  return 0;
}
```

### 4.5 평가 프롬프트

```typescript
const ENSEMBLE_EVALUATION_PROMPT = `You are evaluating an AI agent's output for quality.

Score the output 0-100 based on:
1. Completeness (25%): Are all aspects of the task addressed?
2. Accuracy (25%): Is the output factually correct and technically sound?
3. Actionability (25%): Can the user directly act on this output?
4. Format (25%): Is the output well-structured and easy to parse?

OUTPUT FORMAT (JSON only):
{
  "score": 0-100,
  "breakdown": {
    "completeness": 0-25,
    "accuracy": 0-25,
    "actionability": 0-25,
    "format": 0-25
  },
  "reasoning": "Brief explanation"
}

Output ONLY valid JSON.`;
```

### 4.6 API 스키마

```typescript
// F147: Ensemble 스키마
export const EnsembleRequestSchema = z.object({
  request: z.object({
    taskType: z.string(),
    context: z.object({
      repoUrl: z.string(),
      branch: z.string(),
      targetFiles: z.array(z.string()).optional(),
      instructions: z.string().optional(),
      fileContents: z.record(z.string()).optional(),
    }),
  }),
  models: z.array(z.string()).min(2).max(5),
  strategy: z.enum(["majority", "quality-score", "weighted"]).default("majority"),
  weights: z.record(z.number()).optional(),
  evaluationModel: z.string().optional(),
});

export const EnsembleResultSchema = z.object({
  winner: AgentExecutionResultSchema,
  winnerModel: z.string(),
  winnerScore: z.number(),
  allResults: z.array(z.object({
    model: z.string(),
    result: AgentExecutionResultSchema.nullable(),
    score: z.number(),
    latencyMs: z.number(),
    error: z.string().optional(),
  })),
  votingDetails: z.object({
    strategy: z.string(),
    modelCount: z.number(),
    succeededCount: z.number(),
    failedCount: z.number(),
    totalLatencyMs: z.number(),
    totalTokensUsed: z.number(),
  }),
});

export const StrategyInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  costMultiplier: z.string(),
  bestFor: z.string(),
});
```

### 4.7 API 엔드포인트 상세

#### POST /agents/ensemble
```typescript
// Request: EnsembleRequestSchema
// Response 200: EnsembleResultSchema
// Error 400: models < 2 또는 > 5
// Error 400: OPENROUTER_API_KEY 미설정
// Error 500: 모든 모델 실패
```

#### GET /agents/ensemble/strategies
```typescript
// Response 200: z.array(StrategyInfoSchema)
// 3종 전략 정보 반환 (설명, 비용 배수, 적합한 태스크)
[
  {
    name: "majority",
    description: "Results are compared for similarity. The most common conclusion wins.",
    costMultiplier: "1x",
    bestFor: "Code review, security review — where consensus matters"
  },
  {
    name: "quality-score",
    description: "Each result is scored by an evaluator model. Highest score wins.",
    costMultiplier: "~1.3x",
    bestFor: "Code generation, architecture design — where quality varies"
  },
  {
    name: "weighted",
    description: "Results are scored by efficiency × model weight. Configurable per model.",
    costMultiplier: "1x",
    bestFor: "Cost optimization, speed-critical tasks"
  }
]
```

---

## 5. execution-types.ts 변경

```typescript
// context에 systemPromptOverride 추가 (F146)
export interface AgentExecutionRequest {
  taskId: string;
  agentId: string;
  taskType: AgentTaskType;
  context: {
    repoUrl: string;
    branch: string;
    targetFiles?: string[];
    spec?: {
      title: string;
      description: string;
      acceptanceCriteria: string[];
    };
    instructions?: string;
    fileContents?: Record<string, string>;
    systemPromptOverride?: string;   // F146 NEW
  };
  constraints: AgentConstraintRule[];
}

// AgentTaskType 유니온은 변경 없음 — custom:* 패턴은 런타임 문자열 매칭
```

---

## 6. prompt-utils.ts 변경

```typescript
// 기존 TASK_SYSTEM_PROMPTS 유지 + getSystemPrompt 함수 추가

/**
 * F146: systemPromptOverride 우선, 없으면 기본 매핑 사용
 */
export function getSystemPrompt(request: AgentExecutionRequest): string {
  if (request.context.systemPromptOverride) {
    return request.context.systemPromptOverride + UIHINT_INSTRUCTION;
  }
  return TASK_SYSTEM_PROMPTS[request.taskType]
    ?? `You are an AI agent for the Foundry-X project. Task: ${request.taskType}.` + UIHINT_INSTRUCTION;
}
```

`OpenRouterRunner`와 `ClaudeApiRunner`에서 `TASK_SYSTEM_PROMPTS[request.taskType]` 대신 `getSystemPrompt(request)` 호출로 변경.

---

## 7. 테스트 설계

### 7.1 custom-role-manager.test.ts (22개)

| # | 테스트 | 검증 항목 |
|---|--------|----------|
| 1 | createRole — 정상 생성 | id 생성, D1 INSERT 확인 |
| 2 | createRole — name 중복 | 에러 발생 (UNIQUE 제약) |
| 3 | createRole — 최소 필드 | name + systemPrompt + taskType만으로 생성 |
| 4 | createRole — 전체 필드 | 모든 옵셔널 필드 포함 |
| 5 | getRole — 존재하는 역할 | CustomRole 반환 |
| 6 | getRole — 미존재 역할 | null 반환 |
| 7 | listRoles — 내장 + 커스텀 합산 | 7 내장 + N 커스텀 |
| 8 | listRoles — orgId 필터 | 글로벌 + 해당 org만 반환 |
| 9 | listRoles — includeDisabled=false | enabled=0 제외 |
| 10 | listRoles — includeDisabled=true | 비활성 포함 |
| 11 | updateRole — 부분 업데이트 | name만 변경 → 나머지 유지 |
| 12 | updateRole — 전체 업데이트 | 모든 필드 변경 |
| 13 | updateRole — 내장 역할 수정 시도 | 에러 발생 (403) |
| 14 | updateRole — 미존재 역할 | 에러 발생 (404) |
| 15 | deleteRole — 정상 삭제 | D1 DELETE 확인 |
| 16 | deleteRole — 내장 역할 삭제 시도 | 에러 발생 (403) |
| 17 | deleteRole — 미존재 역할 | 에러 발생 (404) |
| 18 | API POST /agents/roles — 201 | 정상 생성 |
| 19 | API GET /agents/roles — 200 | 목록 반환 |
| 20 | API GET /agents/roles/:id — 200 | 단일 조회 |
| 21 | API PUT /agents/roles/:id — 200 | 정상 수정 |
| 22 | API DELETE /agents/roles/:id — 204 | 정상 삭제 |

### 7.2 ensemble-voting.test.ts (20개)

| # | 테스트 | 검증 항목 |
|---|--------|----------|
| 1 | executeEnsemble — 2개 모델 성공 | winner 선택 + allResults 포함 |
| 2 | executeEnsemble — 3개 모델 성공 | 투표 점수 차등 부여 |
| 3 | executeEnsemble — 1개 실패 2개 성공 | 실패 제외, 나머지로 투표 |
| 4 | executeEnsemble — 모든 모델 실패 | 에러 throw |
| 5 | executeEnsemble — 1개 모델만 성공 | 해당 모델이 자동 승자 |
| 6 | validateConfig — 모델 1개 미만 | 에러 발생 |
| 7 | validateConfig — 모델 6개 초과 | 에러 발생 |
| 8 | selectBest majority — 유사한 결과 3개 | 유사도 높은 결과 승 |
| 9 | selectBest majority — 상이한 결과 | 다수 그룹 결과 승 |
| 10 | selectBest quality-score — 점수 차이 | 최고 점수 결과 승 |
| 11 | selectBest quality-score — 평가 실패 | 기본 점수(50) 적용 |
| 12 | selectBest weighted — 동일 가중치 | 효율성 기반 선택 |
| 13 | selectBest weighted — 커스텀 가중치 | 가중치 반영 확인 |
| 14 | calculateSimilarity — reviewComments 비교 | Jaccard 정확도 |
| 15 | calculateSimilarity — generatedCode 비교 | 경로 겹침 계산 |
| 16 | calculateSimilarity — analysis 텍스트 | 단어 Jaccard |
| 17 | votingDetails — 통계 정확성 | modelCount, succeeded, failed, tokens |
| 18 | API POST /agents/ensemble — 200 | 정상 앙상블 실행 |
| 19 | API GET /agents/ensemble/strategies — 200 | 3종 전략 반환 |
| 20 | API POST /agents/ensemble — 400 | 모델 수 검증 에러 |

---

## 8. 2-Worker 병렬 작업 분배

### Worker 1: F146 커스텀 역할 관리

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `db/migrations/0024_custom_agent_roles.sql` | D1 마이그레이션 |
| 2 | `services/custom-role-manager.ts` | 서비스 (5 CRUD + 타입 + BUILTIN_ROLES + toCustomRole) |
| 3 | `__tests__/custom-role-manager.test.ts` | 테스트 22개 |
| 4 | `services/execution-types.ts` | context.systemPromptOverride 추가 |
| 5 | `services/prompt-utils.ts` | getSystemPrompt() 함수 추가 |
| 6 | `services/openrouter-runner.ts` | getSystemPrompt() 호출로 변경 (1줄) |
| 7 | `schemas/agent.ts` | CustomRole 스키마 3종 |
| 8 | `routes/agent.ts` | 5개 엔드포인트 |
| 9 | `services/agent-orchestrator.ts` | custom:* 위임 블록 + setCustomRoleManager() |

### Worker 2: F147 앙상블 투표

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `services/ensemble-voting.ts` | 서비스 (executeEnsemble + selectBest + 3종 전략 + calculateSimilarity) |
| 2 | `__tests__/ensemble-voting.test.ts` | 테스트 20개 |
| 3 | `schemas/agent.ts` | Ensemble 스키마 3종 |
| 4 | `routes/agent.ts` | 2개 엔드포인트 |

### 충돌 관리

| 공유 파일 | Worker 1 변경 | Worker 2 변경 | 충돌 위험 |
|----------|-------------|-------------|----------|
| `execution-types.ts` | context.systemPromptOverride 추가 | 수정 없음 | ✅ 없음 |
| `prompt-utils.ts` | getSystemPrompt() 추가 | 수정 없음 | ✅ 없음 |
| `openrouter-runner.ts` | getSystemPrompt() 호출 변경 | 수정 없음 (직접 사용) | ✅ 없음 |
| `routes/agent.ts` | 하단에 5개 라우트 | 하단에 2개 라우트 | ⚠️ 낮음 — 순차 병합 |
| `schemas/agent.ts` | 하단에 스키마 추가 | 하단에 스키마 추가 | ⚠️ 낮음 — 순차 병합 |
| `agent-orchestrator.ts` | custom:* 위임 + setter | 수정 없음 | ✅ 없음 |

**핵심 전략**: Worker 1이 `execution-types.ts`, `prompt-utils.ts`, `openrouter-runner.ts` 등 공유 인프라를 모두 담당 → Worker 2는 이에 의존하지 않고 독립적으로 `ensemble-voting.ts` 구현. 병합 시 충돌 파일은 `routes/agent.ts`와 `schemas/agent.ts`뿐이며, 둘 다 하단 append이므로 수동 병합 용이.

---

## 9. EvaluatorOptimizer/SelfReflection/FallbackChain과의 관계

| 서비스 | 패턴 | F146 연동 | F147 연동 |
|--------|------|----------|----------|
| **EvaluatorOptimizer** (F137) | 순차 생성→평가 루프 | 커스텀 역할로 생성된 결과에 EvalOpt 적용 가능 | 앙상블 승자를 EvalOpt 입력으로 연결 가능 |
| **SelfReflection** (F148) | Intra-agent 자기 반성 | 커스텀 역할 Runner에 enhanceWithReflection() 래핑 가능 | 각 앙상블 모델 결과에 개별 reflection 가능 |
| **FallbackChain** (F144) | 모델 장애 시 전환 | 커스텀 역할의 preferredModel 장애 시 FallbackChain 활용 | 앙상블은 allSettled로 자체 내결함성 → FallbackChain 불필요 |
| **ModelRouter** (F136) | D1 규칙 기반 모델 선택 | 커스텀 역할의 taskType 기반 라우팅 재활용 | 앙상블은 모델 직접 지정 → ModelRouter 불필요 |

---

## 10. 의존성 및 위험

| 위험 | 확률 | 영향 | 대응 |
|------|------|------|------|
| systemPromptOverride로 악의적 프롬프트 주입 | 중 | 중 | createRole에서 systemPrompt 길이 제한(10000자) + 금지어 필터 옵션 |
| 앙상블 5모델 비용 폭증 | 중 | 낮 | MAX_MODELS=5 캡 + 비용 예측 표시 (votingDetails.totalTokensUsed) |
| majority 전략 유사도 정확도 부족 | 중 | 낮 | 텍스트 Jaccard는 간소화 구현 — 정확도 필요 시 quality-score 권장 |
| Sprint 40 execution-types.ts 충돌 | 낮 | 낮 | F146은 context에만 필드 추가, Sprint 40의 reflection은 result 레벨 → 다른 위치 |
| D1 마이그레이션 0024 번호 충돌 | 없 | 없 | Sprint 40은 마이그레이션 없음 |
