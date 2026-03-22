---
code: FX-DSGN-040
title: "Sprint 40 — InfraAgent + 에이전트 자기 평가 상세 설계 (F145+F148)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-40
sprint: 40
phase: "Phase 5a"
references:
  - "[[FX-PLAN-040]]"
  - "[[FX-DSGN-039]]"
---

## 1. 설계 개요

### 1.1 목적

기존 Agent Evolution 인프라(6종 역할 에이전트 + ModelRouter + EvaluatorOptimizer + FallbackChain) 위에 **확장성 2종** 레이어를 추가:
- **InfraAgent** (F145) — Cloudflare 인프라 설정 분석 + 변경 시뮬레이션 + D1 마이그레이션 검증
- **AgentSelfReflection** (F148) — 에이전트 출력 자기 반성 루프 (intra-agent 품질 향상)

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| **기존 에이전트 패턴 100% 준수** | ArchitectAgent/SecurityAgent와 동일한 3계층 구조 (prompts + agent + orchestrator) |
| **AgentRunner 인터페이스 비침습** | SelfReflection은 래퍼 패턴 — 기존 Runner 시그니처 불변 |
| **createRoutedRunner 활용** | InfraAgent도 ModelRouter 기반 최적 모델 자동 선택 |
| **opt-in 설계** | SelfReflection은 선택적 — 기본 비활성, 명시적 래핑 시에만 동작 |
| **read-only 인프라 분석** | InfraAgent는 분석/시뮬레이션만, 실제 인프라 변경 실행 없음 |

---

## 2. 아키텍처

### 2.1 InfraAgent 실행 흐름

```
사용자 요청 → AgentOrchestrator.executeTask(taskType="infra-analysis")
  │
  ├─ InfraAgent.analyzeInfra(request)
  │     └─ createRoutedRunner(env, "infra-analysis", db)
  │     └─ INFRA_ANALYZE_PROMPT + wrangler.toml/설정 컨텍스트
  │     └─ Runner.execute() → JSON 파싱 → InfraAnalysisResult
  │
  ├─ InfraAgent.simulateChange(change, currentConfig)
  │     └─ INFRA_SIMULATE_PROMPT + 변경 내용 + 현재 설정
  │     └─ Runner.execute() → JSON 파싱 → ChangeSimulationResult
  │
  └─ InfraAgent.validateMigration(sql, schema)
        └─ INFRA_VALIDATE_MIGRATION_PROMPT + SQL + 기존 스키마
        └─ Runner.execute() → JSON 파싱 → MigrationValidationResult
```

### 2.2 SelfReflection 래핑 흐름

```
기존 (변경 없음):
  Request → runner.execute() → Result

SelfReflection 래핑 (opt-in):
  Request → enhancedRunner.execute()
               │
               ├─ runner.execute(request)  → originalResult
               │
               ├─ runner.execute(reflectionPrompt)  → reflectionResult
               │     └─ "당신의 출력을 원래 요청 대비 평가하세요"
               │     └─ JSON { score, confidence, reasoning, suggestions }
               │
               ├─ score >= threshold(60)?
               │     ├─ YES → 반환: originalResult + reflection
               │     └─ NO  → 재시도 (최대 2회)
               │              └─ 피드백(suggestions) 포함 request 보강
               │              └─ runner.execute(enhancedRequest) → betterResult
               │              └─ 반환: bestResult + reflection history
               │
               └─ 최종 결과에 reflection 메타데이터 부착
```

---

## 3. 상세 설계 — F145 InfraAgent

### 3.1 타입 정의

```typescript
// ── infra-agent.ts ────────────────────────────────────────

export interface InfraAnalysisResult {
  healthScore: number;          // 0-100 인프라 건강도
  resources: Array<{
    type: "workers" | "d1" | "kv" | "cron" | "secrets" | "pages";
    name: string;
    status: "healthy" | "warning" | "critical";
    details: string;
  }>;
  optimizations: Array<{
    category: "performance" | "cost" | "security" | "reliability";
    suggestion: string;
    impact: "high" | "medium" | "low";
  }>;
  compatibilityFlags: {
    current: string[];
    recommended: string[];
    deprecated: string[];
  };
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface ChangeSimulationResult {
  riskLevel: "safe" | "low" | "medium" | "high" | "critical";
  affectedResources: Array<{
    type: string;
    name: string;
    impact: "none" | "config-change" | "data-migration" | "downtime" | "breaking";
    description: string;
  }>;
  rollbackPlan: string;
  estimatedDowntime: string;  // "none" | "< 1s" | "< 30s" | "minutes"
  wranglerDiff: string;      // wrangler.toml 변경 diff (시뮬레이션)
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface MigrationValidationResult {
  safe: boolean;
  riskScore: number;           // 0-100 (0=안전, 100=위험)
  issues: Array<{
    severity: "critical" | "high" | "medium" | "low";
    type: "data-loss" | "fk-violation" | "type-mismatch" | "missing-index" |
          "breaking-change" | "performance";
    table: string;
    description: string;
    suggestion: string;
  }>;
  schemaChanges: Array<{
    action: "create-table" | "alter-table" | "drop-table" | "add-column" |
            "drop-column" | "add-index" | "add-fk";
    target: string;
    details: string;
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}
```

### 3.2 InfraAgent 클래스

```typescript
export interface InfraAgentDeps {
  env: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_DEFAULT_MODEL?: string;
    ANTHROPIC_API_KEY?: string;
  };
  db?: D1Database;
}

export class InfraAgent {
  private readonly env: InfraAgentDeps["env"];
  private readonly db?: D1Database;

  constructor(deps: InfraAgentDeps) {
    this.env = deps.env;
    this.db = deps.db;
  }

  /**
   * Cloudflare 인프라 설정 분석 + 최적화 제안
   * wrangler.toml, D1 스키마, KV 네임스페이스, Cron Trigger 등을 종합 분석
   */
  async analyzeInfra(request: AgentExecutionRequest): Promise<InfraAnalysisResult>;

  /**
   * 인프라 변경의 영향 범위 시뮬레이션 (dry-run)
   * 변경 내용 + 현재 설정을 기반으로 리스크 평가 + wrangler.toml diff 생성
   */
  async simulateChange(
    change: string,
    currentConfig: string,
  ): Promise<ChangeSimulationResult>;

  /**
   * D1 마이그레이션 SQL의 안전성 검증
   * FK 충돌, 데이터 손실 위험, 성능 영향 분석
   */
  async validateMigration(
    sql: string,
    existingSchema?: string,
  ): Promise<MigrationValidationResult>;
}
```

### 3.3 InfraAgent 프롬프트 (infra-agent-prompts.ts)

```typescript
// 3종 시스템 프롬프트 + 2종 빌더 함수

export const INFRA_ANALYZE_PROMPT: string;
// - Cloudflare Workers/D1/KV/Cron/Pages 리소스 분석
// - 호환성 플래그 점검 (현재/권장/폐기)
// - JSON 출력: InfraAnalysisResult 형태

export const INFRA_SIMULATE_PROMPT: string;
// - 변경 내용 + 현재 설정 비교
// - 영향 받는 리소스, 다운타임 예측, 롤백 계획
// - wrangler.toml diff 형태 시뮬레이션 출력
// - JSON 출력: ChangeSimulationResult 형태

export const INFRA_VALIDATE_MIGRATION_PROMPT: string;
// - SQL 문법 검증 + D1/SQLite 호환성
// - FK 관계 + 데이터 타입 변경 안전성
// - 기존 스키마 대비 breaking change 감지
// - JSON 출력: MigrationValidationResult 형태

export function buildInfraAnalyzePrompt(request: AgentExecutionRequest): string;
// fileContents에서 wrangler.toml, 마이그레이션 파일 추출 → 컨텍스트 구성

export function buildMigrationPrompt(sql: string, existingSchema?: string): string;
// SQL + 기존 스키마 → 검증 컨텍스트 구성
```

### 3.4 Orchestrator 위임

```typescript
// agent-orchestrator.ts — executeTask() 내 위임 블록 추가
// 기존 qa-testing 위임 블록 다음에 삽입

if (taskType === "infra-analysis" && this.infraAgent) {
  const infraResult = await this.infraAgent.analyzeInfra(delegateRequest);
  const delegatedResult: AgentExecutionResult = {
    status: "success",
    output: { analysis: JSON.stringify(infraResult) },
    tokensUsed: infraResult.tokensUsed,
    model: infraResult.model,
    duration: infraResult.duration,
  };
  await this.recordTaskResult(taskId, sessionId, agentId, delegatedResult);
  return delegatedResult;
}
```

### 3.5 API 엔드포인트

#### POST /agents/infra/analyze

```typescript
// Request body
{
  repoUrl: string;           // 분석 대상 리포
  branch?: string;           // 브랜치 (기본: main)
  configFiles?: Record<string, string>;  // wrangler.toml 등 설정 파일 내용
}

// Response 200
InfraAnalysisResult
```

#### POST /agents/infra/simulate

```typescript
// Request body
{
  change: string;            // 변경 설명 (자연어 또는 TOML diff)
  currentConfig: string;     // 현재 wrangler.toml 내용
}

// Response 200
ChangeSimulationResult
```

#### POST /agents/infra/validate-migration

```typescript
// Request body
{
  sql: string;               // 마이그레이션 SQL
  existingSchema?: string;   // 기존 스키마 (CREATE TABLE 문들)
}

// Response 200
MigrationValidationResult
```

---

## 4. 상세 설계 — F148 에이전트 자기 평가

### 4.1 타입 정의

```typescript
// ── agent-self-reflection.ts ────────────────────────────────

export interface ReflectionResult {
  score: number;           // 0-100 자기 평가 점수
  confidence: number;      // 0-100 확신도
  reasoning: string;       // 왜 이 점수인지
  suggestions: string[];   // 개선 제안 (재시도 시 프롬프트에 추가)
}

export interface ReflectionMetadata {
  score: number;
  confidence: number;
  reasoning: string;
  suggestions: string[];
  retryCount: number;
  history: Array<{
    iteration: number;
    score: number;
    confidence: number;
  }>;
}

export interface SelfReflectionConfig {
  threshold: number;          // 기본 60, 이 점수 미만이면 재시도
  maxRetries: number;         // 기본 2, 최대 재시도 횟수
  reflectionModel?: string;   // 반성용 모델 (기본: 동일 모델)
}

// AgentExecutionResult 확장 (execution-types.ts)
export interface AgentExecutionResult {
  // ... 기존 필드 유지 ...
  reflection?: ReflectionMetadata;  // opt-in: SelfReflection 래핑 시에만 존재
}
```

### 4.2 AgentSelfReflection 클래스

```typescript
export class AgentSelfReflection {
  static readonly DEFAULT_THRESHOLD = 60;
  static readonly DEFAULT_MAX_RETRIES = 2;
  static readonly HARD_MAX_RETRIES = 3;

  private readonly threshold: number;
  private readonly maxRetries: number;

  constructor(config?: Partial<SelfReflectionConfig>) {
    this.threshold = config?.threshold ?? AgentSelfReflection.DEFAULT_THRESHOLD;
    this.maxRetries = Math.min(
      config?.maxRetries ?? AgentSelfReflection.DEFAULT_MAX_RETRIES,
      AgentSelfReflection.HARD_MAX_RETRIES,
    );
  }

  /**
   * 에이전트 출력을 원래 요청 대비 자체 평가
   * 동일 Runner를 사용하여 반성 프롬프트 실행
   */
  async reflect(
    runner: AgentRunner,
    originalRequest: AgentExecutionRequest,
    result: AgentExecutionResult,
  ): Promise<ReflectionResult>;

  /**
   * 반성 점수 기반 재시도 필요 여부 판정
   */
  shouldRetry(reflectionScore: number): boolean;

  /**
   * 기존 AgentRunner를 래핑하여 자동 반성 기능 추가
   * 반환된 Runner는 execute() 호출 시 자동으로:
   *   1. 원래 실행
   *   2. 자기 평가
   *   3. 점수 미달 시 재시도
   *   4. 결과에 reflection 메타데이터 부착
   */
  enhanceWithReflection(runner: AgentRunner): AgentRunner;
}
```

### 4.3 반성 프롬프트

```typescript
// agent-self-reflection.ts 내부 상수

const SELF_REFLECTION_PROMPT = `You are evaluating your own previous output.

Compare your output against the original request and assess quality.

Evaluate:
1. Completeness: Did you address all parts of the request?
2. Accuracy: Is the output factually correct and technically sound?
3. Relevance: Is everything in the output relevant to the request?
4. Format: Does the output match the requested format exactly?

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "score": 0-100,
  "confidence": 0-100,
  "reasoning": "Brief explanation of the score",
  "suggestions": ["specific improvements for a retry"]
}

RULES:
- score 90+: excellent, no retry needed
- score 60-89: acceptable, could be improved
- score < 60: poor, should retry with the suggestions
- Be honest and critical — inflated scores reduce system value
- Output ONLY valid JSON, no explanation`;
```

### 4.4 enhanceWithReflection 구현 설계

```typescript
enhanceWithReflection(runner: AgentRunner): AgentRunner {
  const self = this;

  return {
    type: runner.type,

    async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
      let bestResult: AgentExecutionResult | null = null;
      let bestScore = -1;
      const history: Array<{ iteration: number; score: number; confidence: number }> = [];

      for (let retry = 0; retry <= self.maxRetries; retry++) {
        // 1. 원래 실행 (첫 시도 또는 suggestions 보강 재시도)
        const currentRequest = retry === 0
          ? request
          : self.buildEnhancedRequest(request, lastReflection.suggestions);
        const result = await runner.execute(currentRequest);

        // 2. 자기 평가
        const reflection = await self.reflect(runner, request, result);
        history.push({ iteration: retry, score: reflection.score, confidence: reflection.confidence });

        // 3. 최고 점수 갱신
        if (reflection.score > bestScore) {
          bestScore = reflection.score;
          bestResult = result;
        }

        // 4. 임계값 이상이면 종료
        if (!self.shouldRetry(reflection.score)) break;
      }

      // 5. reflection 메타데이터 부착
      return {
        ...bestResult!,
        reflection: {
          score: bestScore,
          confidence: history[history.length - 1].confidence,
          reasoning: lastReflection.reasoning,
          suggestions: lastReflection.suggestions,
          retryCount: history.length - 1,
          history,
        },
      };
    },

    isAvailable: () => runner.isAvailable(),
    supportsTaskType: (t: string) => runner.supportsTaskType(t),
  };
}
```

### 4.5 EvaluatorOptimizer와의 관계

| 측면 | EvaluatorOptimizer (F137) | SelfReflection (F148) |
|------|--------------------------|----------------------|
| **패턴** | Inter-agent (Generator → Evaluator) | Intra-agent (자신이 자신을 평가) |
| **모델** | Generator와 Evaluator가 다른 모델 가능 | 동일 모델 (기본) |
| **기준** | EvaluationCriteria 3종 (코드, 리뷰, 계획) | 범용 반성 프롬프트 (완전성/정확성/관련성/형식) |
| **비용** | 2N 토큰 (N=이터레이션당 생성+평가) | 1.5~2.5N (원래+반성+선택적 재시도) |
| **적용** | 고품질 필수 태스크 (code-generation) | 모든 태스크에 범용 적용 가능 |
| **중첩** | ✅ SelfReflection → EvalOpt 순서로 중첩 가능 | ✅ 1차 자기 반성 후 2차 외부 평가 |

### 4.6 API 엔드포인트

#### POST /agents/reflect

```typescript
// Request body
{
  originalRequest: {
    taskId: string;
    taskType: AgentTaskType;
    instructions: string;
  };
  result: {
    status: string;
    output: string;        // 에이전트 출력 (analysis 필드)
  };
}

// Response 200
{
  score: number;
  confidence: number;
  reasoning: string;
  suggestions: string[];
}
```

#### GET /agents/reflect/config

```typescript
// Response 200
{
  threshold: number;       // 기본 60
  maxRetries: number;      // 기본 2
  hardMaxRetries: number;  // 3 (변경 불가)
}
```

---

## 5. execution-types.ts 변경

```typescript
// AgentTaskType에 "infra-analysis" 추가
export type AgentTaskType =
  | "code-review"
  | "code-generation"
  | "spec-analysis"
  | "test-generation"
  | "security-review"
  | "qa-testing"
  | "policy-evaluation"
  | "skill-query"
  | "ontology-lookup"
  | "infra-analysis";      // F145 NEW

// AgentExecutionResult에 reflection 필드 추가
export interface AgentExecutionResult {
  status: "success" | "partial" | "failed";
  output: {
    analysis?: string;
    generatedCode?: Array<{
      path: string;
      content: string;
      action: "create" | "modify";
    }>;
    reviewComments?: Array<{
      file: string;
      line: number;
      comment: string;
      severity: "error" | "warning" | "info";
    }>;
    uiHint?: UIHint;
  };
  tokensUsed: number;
  model: string;
  duration: number;
  reflection?: {             // F148 NEW (opt-in)
    score: number;
    confidence: number;
    reasoning: string;
    suggestions: string[];
    retryCount: number;
    history: Array<{
      iteration: number;
      score: number;
      confidence: number;
    }>;
  };
}
```

---

## 6. 스키마 (schemas/agent.ts 추가)

```typescript
// F145: InfraAgent 스키마
export const InfraAnalyzeRequestSchema = z.object({
  repoUrl: z.string(),
  branch: z.string().optional(),
  configFiles: z.record(z.string()).optional(),
});

export const InfraSimulateRequestSchema = z.object({
  change: z.string(),
  currentConfig: z.string(),
});

export const InfraMigrationValidateRequestSchema = z.object({
  sql: z.string(),
  existingSchema: z.string().optional(),
});

// F148: SelfReflection 스키마
export const ReflectRequestSchema = z.object({
  originalRequest: z.object({
    taskId: z.string(),
    taskType: z.string(),
    instructions: z.string(),
  }),
  result: z.object({
    status: z.string(),
    output: z.string(),
  }),
});

export const ReflectionConfigSchema = z.object({
  threshold: z.number(),
  maxRetries: z.number(),
  hardMaxRetries: z.number(),
});
```

---

## 7. 테스트 설계

### 7.1 infra-agent.test.ts (20개+)

| # | 테스트 | 검증 항목 |
|---|--------|----------|
| 1 | analyzeInfra — wrangler.toml 분석 | 정상 JSON 파싱 + healthScore 범위 |
| 2 | analyzeInfra — D1 바인딩 감지 | resources에 d1 타입 포함 |
| 3 | analyzeInfra — KV 바인딩 감지 | resources에 kv 타입 포함 |
| 4 | analyzeInfra — Cron Trigger 분석 | cron 리소스 상태 확인 |
| 5 | analyzeInfra — 호환성 플래그 경고 | deprecated 플래그 감지 |
| 6 | analyzeInfra — 최적화 제안 생성 | optimizations 배열 비어있지 않음 |
| 7 | analyzeInfra — clampScore 경계값 | 0 미만/100 초과 클램핑 |
| 8 | simulateChange — 안전한 변경 | riskLevel = "safe" 또는 "low" |
| 9 | simulateChange — 위험한 변경 (테이블 삭제) | riskLevel = "high" 또는 "critical" |
| 10 | simulateChange — wranglerDiff 생성 | diff 문자열 비어있지 않음 |
| 11 | simulateChange — rollbackPlan 포함 | rollbackPlan 문자열 존재 |
| 12 | simulateChange — affectedResources 매핑 | impact 레벨 정확성 |
| 13 | validateMigration — 안전한 CREATE TABLE | safe=true, riskScore 낮음 |
| 14 | validateMigration — FK 위반 감지 | issues에 fk-violation 포함 |
| 15 | validateMigration — DROP COLUMN 경고 | issues에 data-loss 포함 |
| 16 | validateMigration — 기존 스키마 대비 검증 | schemaChanges 정확 매핑 |
| 17 | validateMigration — 빈 SQL 처리 | 에러 없이 빈 결과 반환 |
| 18 | API /agents/infra/analyze — 200 응답 | 정상 경로 |
| 19 | API /agents/infra/simulate — 200 응답 | 정상 경로 |
| 20 | API /agents/infra/validate-migration — 200 응답 | 정상 경로 |

### 7.2 agent-self-reflection.test.ts (15개+)

| # | 테스트 | 검증 항목 |
|---|--------|----------|
| 1 | reflect — 고품질 출력 (score >= 80) | 정상 반성 결과 |
| 2 | reflect — 저품질 출력 (score < 60) | suggestions 비어있지 않음 |
| 3 | reflect — JSON 파싱 실패 시 기본 점수 | score=50 폴백 |
| 4 | shouldRetry — threshold 이상이면 false | 60 이상 → false |
| 5 | shouldRetry — threshold 미만이면 true | 59 이하 → true |
| 6 | shouldRetry — 커스텀 threshold | 80 설정 시 79 → true |
| 7 | enhanceWithReflection — 고품질 시 재시도 없음 | retryCount=0 |
| 8 | enhanceWithReflection — 저품질 시 자동 재시도 | retryCount >= 1 |
| 9 | enhanceWithReflection — maxRetries 제한 | 최대 2회 재시도 후 종료 |
| 10 | enhanceWithReflection — bestResult 선택 | 여러 시도 중 최고 점수 결과 반환 |
| 11 | enhanceWithReflection — reflection 메타데이터 부착 | result.reflection 존재 |
| 12 | enhanceWithReflection — history 기록 | 각 이터레이션 점수 기록 |
| 13 | enhanceWithReflection — isAvailable 위임 | 원본 Runner에 위임 |
| 14 | enhanceWithReflection — supportsTaskType 위임 | 원본 Runner에 위임 |
| 15 | API /agents/reflect — 200 응답 | 정상 경로 |
| 16 | API /agents/reflect/config — 기본값 | threshold=60, maxRetries=2 |
| 17 | HARD_MAX_RETRIES 초과 방지 | maxRetries=10 → 3으로 클램핑 |

---

## 8. 2-Worker 병렬 작업 분배

### Worker 1: F145 InfraAgent

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `infra-agent-prompts.ts` | 프롬프트 3종 + 빌더 2종 |
| 2 | `infra-agent.ts` | InfraAgent 클래스 (3 메서드 + 타입 + 파싱) |
| 3 | `infra-agent.test.ts` | 테스트 20개+ |
| 4 | `execution-types.ts` | `"infra-analysis"` 타입 추가 |
| 5 | `agent-orchestrator.ts` | infra-analysis 위임 블록 |
| 6 | `routes/agent.ts` | 3개 엔드포인트 |
| 7 | `schemas/agent.ts` | Infra 스키마 3종 |

### Worker 2: F148 에이전트 자기 평가

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `agent-self-reflection.ts` | SelfReflection 클래스 (reflect, shouldRetry, enhanceWithReflection) |
| 2 | `agent-self-reflection.test.ts` | 테스트 17개+ |
| 3 | `execution-types.ts` | reflection 필드 추가 |
| 4 | `routes/agent.ts` | 2개 엔드포인트 |
| 5 | `schemas/agent.ts` | Reflection 스키마 2종 |

### 충돌 관리

| 공유 파일 | Worker 1 변경 | Worker 2 변경 | 충돌 위험 |
|----------|-------------|-------------|----------|
| `execution-types.ts` | AgentTaskType에 타입 추가 | AgentExecutionResult에 필드 추가 | ⚠️ 낮음 — 다른 위치 |
| `routes/agent.ts` | 하단에 3개 라우트 추가 | 하단에 2개 라우트 추가 | ⚠️ 낮음 — 순차 병합 |
| `schemas/agent.ts` | 하단에 스키마 추가 | 하단에 스키마 추가 | ⚠️ 낮음 — 순차 병합 |

**병합 전략**: Worker 1 먼저 커밋 → Worker 2 변경 사항 병합 (리더가 수동 조정)

---

## 9. 의존성 및 위험

| 위험 | 확률 | 영향 | 대응 |
|------|------|------|------|
| InfraAgent 프롬프트 품질 부족 | 중 | 중 | TOML/SQL 예시를 프롬프트에 포함 |
| SelfReflection 토큰 비용 증가 | 높 | 낮 | opt-in 설계, 기본 비활성 |
| execution-types.ts 충돌 | 낮 | 낮 | 다른 위치 수정, 리더 병합 |
| Sprint 39 미완료 시 영향 | 없 | 없 | F145/F148은 F144/F149/F150과 독립 |
