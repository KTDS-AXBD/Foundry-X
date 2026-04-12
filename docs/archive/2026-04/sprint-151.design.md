---
code: FX-DSGN-S151
title: "Sprint 151 — Agent Adapter 통합 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo
references: "[[FX-PLAN-S151]], [[FX-PLAN-014]]"
---

# Sprint 151: Agent Adapter 통합 설계

## 1. 개요

기존 에이전트 서비스(`AgentRunner.execute(AgentExecutionRequest)`)를 Phase 14 Foundation의 `AgentAdapter` 인터페이스(`execute(AgentExecutionContext): AgentResult`)로 래핑하여 `OrchestrationLoop`에 투입 가능하게 한다.

**핵심 원칙**: 기존 코드 변경 0건 — Additive 래핑만.

## 2. 타입 확장 (shared 패키지)

### 2.1 AgentAdapter 확장

```typescript
// packages/shared/src/orchestration.ts — 기존 인터페이스에 optional 필드 추가

export interface AgentMetadata {
  source: 'yaml' | 'service' | 'mcp';
  originalService?: string;
  capabilities?: string[];
  modelTier?: string;
}

export interface AgentAdapter {
  name: string;
  role: AgentRole;
  execute(context: AgentExecutionContext): Promise<AgentResult>;
  handleFeedback?(feedback: string[], context: AgentExecutionContext): Promise<void>;
  metadata?: AgentMetadata;
}
```

`handleFeedback`은 optional — 기존 코드 호환 유지. `OrchestrationLoop`이 이미 `previousFeedback`을 context에 넣어주므로, handleFeedback 미구현 에이전트도 피드백을 context.previousFeedback으로 받을 수 있다.

## 3. 래핑 아키텍처

### 3.1 변환 매핑

```
기존 시그니처:
  AgentRunner.execute(AgentExecutionRequest) → AgentExecutionResult

새 시그니처:
  AgentAdapter.execute(AgentExecutionContext) → AgentResult

변환:
  AgentExecutionContext → AgentExecutionRequest 변환기
  AgentExecutionResult → AgentResult 변환기
```

### 3.2 Context → Request 변환

```typescript
// packages/api/src/services/agent-adapter-factory.ts

function contextToRequest(ctx: AgentExecutionContext, agentId: string, taskType: AgentTaskType): AgentExecutionRequest {
  return {
    taskId: ctx.taskId,
    agentId,
    taskType,
    context: {
      repoUrl: (ctx.metadata?.repoUrl as string) ?? '',
      branch: (ctx.metadata?.branch as string) ?? 'main',
      targetFiles: ctx.metadata?.targetFiles as string[] | undefined,
      instructions: ctx.previousFeedback.length > 0
        ? `Previous feedback:\n${ctx.previousFeedback.join('\n')}\n\n${(ctx.metadata?.instructions as string) ?? ''}`
        : (ctx.metadata?.instructions as string),
    },
    constraints: [],
  };
}
```

### 3.3 Result → AgentResult 변환

```typescript
function resultToAgentResult(result: AgentExecutionResult): AgentResult {
  return {
    success: result.status === 'success',
    qualityScore: result.reflection?.score
      ? result.reflection.score / 100  // 0-100 → 0.0-1.0 정규화
      : (result.status === 'success' ? 0.8 : 0.3),
    feedback: [
      result.output.analysis ?? '',
      ...(result.output.reviewComments?.map(c => `${c.file}:${c.line} [${c.severity}] ${c.comment}`) ?? []),
    ].filter(Boolean),
    artifacts: {
      generatedCode: result.output.generatedCode,
      tokensUsed: result.tokensUsed,
      model: result.model,
      duration: result.duration,
    },
  };
}
```

## 4. 구현 상세

### 4.1 AgentAdapterFactory

```typescript
// packages/api/src/services/agent-adapter-factory.ts (신규)

export class AgentAdapterFactory {
  /**
   * AgentRunner를 AgentAdapter로 래핑
   * - 기존 AgentRunner의 execute() 시그니처를 AgentAdapter.execute()로 변환
   */
  static wrapRunner(
    runner: AgentRunner,
    name: string,
    role: AgentRole,
    defaultTaskType: AgentTaskType = 'code-generation',
  ): AgentAdapter {
    return {
      name,
      role,
      metadata: {
        source: 'service',
        originalService: runner.type,
        modelTier: runner.type,
      },
      async execute(ctx: AgentExecutionContext): Promise<AgentResult> {
        const request = contextToRequest(ctx, name, (ctx.metadata?.taskType as AgentTaskType) ?? defaultTaskType);
        const result = await runner.execute(request);
        return resultToAgentResult(result);
      },
    };
  }

  /**
   * EvaluatorOptimizer를 AgentAdapter로 래핑
   * - 자체 루프를 가지지만, OrchestrationLoop에서는 단일 실행으로 사용
   * - role: 'discriminator' (품질 평가 역할)
   */
  static wrapEvaluatorOptimizer(
    evaluator: EvaluatorOptimizer,
    name: string = 'evaluator-optimizer',
  ): AgentAdapter {
    return {
      name,
      role: 'discriminator',
      metadata: {
        source: 'service',
        originalService: 'evaluator-optimizer',
      },
      async execute(ctx: AgentExecutionContext): Promise<AgentResult> {
        const request = contextToRequest(ctx, name, 'code-review');
        const loopResult = await evaluator.run(request);
        return {
          success: loopResult.converged,
          qualityScore: loopResult.finalScore / 100,
          feedback: loopResult.history.flatMap(h => h.feedback),
          artifacts: {
            iterations: loopResult.iterations,
            totalTokensUsed: loopResult.totalTokensUsed,
          },
        };
      },
    };
  }

  /**
   * .claude/agents/ YAML 정의에서 AgentAdapter 생성
   * - YAML frontmatter의 role 필드 사용
   * - 실제 실행은 no-op (YAML 에이전트는 Claude Code 서브에이전트이므로 API 서버에서 직접 실행 불가)
   * - 메타데이터 + role 태깅이 주 목적
   */
  static fromYamlDefinition(
    name: string,
    role: AgentRole,
    description: string,
    model?: string,
  ): AgentAdapter {
    return {
      name,
      role,
      metadata: {
        source: 'yaml',
        capabilities: [],
        modelTier: model,
      },
      async execute(_ctx: AgentExecutionContext): Promise<AgentResult> {
        // YAML 에이전트는 Claude Code 서브에이전트 — API 서버에서 직접 실행 불가
        // OrchestrationLoop에서는 서비스 기반 어댑터를 사용
        return {
          success: false,
          qualityScore: null,
          feedback: [`${name} is a YAML-defined agent (Claude Code subagent) — not executable via API`],
        };
      },
    };
  }
}
```

### 4.2 AgentAdapterRegistry

```typescript
// packages/api/src/services/agent-adapter-registry.ts (신규)

export class AgentAdapterRegistry {
  private adapters: Map<string, AgentAdapter> = new Map();

  register(adapter: AgentAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): AgentAdapter | undefined {
    return this.adapters.get(name);
  }

  getByRole(role: AgentRole): AgentAdapter[] {
    return [...this.adapters.values()].filter(a => a.role === role);
  }

  list(): AgentAdapter[] {
    return [...this.adapters.values()];
  }

  /** OrchestrationLoop용 — adversarial 모드에 필요한 generator+discriminator 쌍 조회 */
  getAdversarialPair(generatorName?: string, discriminatorName?: string): {
    generator: AgentAdapter | undefined;
    discriminator: AgentAdapter | undefined;
  } {
    const generators = this.getByRole('generator');
    const discriminators = this.getByRole('discriminator');
    return {
      generator: generatorName ? this.get(generatorName) : generators[0],
      discriminator: discriminatorName ? this.get(discriminatorName) : discriminators[0],
    };
  }

  /** 등록된 어댑터 수 */
  get size(): number {
    return this.adapters.size;
  }

  clear(): void {
    this.adapters.clear();
  }
}
```

### 4.3 개별 어댑터 모듈 (adapters/)

`packages/api/src/services/adapters/` 디렉토리 신규 생성.

#### claude-api-adapter.ts

```typescript
import { AgentAdapterFactory } from '../agent-adapter-factory.js';
import { ClaudeApiRunner } from '../claude-api-runner.js';
import type { AgentAdapter } from '@foundry-x/shared';

export function createClaudeApiAdapter(apiKey: string, model?: string): AgentAdapter {
  const runner = new ClaudeApiRunner(apiKey, model);
  return AgentAdapterFactory.wrapRunner(runner, 'claude-api', 'generator', 'code-generation');
}
```

#### evaluator-optimizer-adapter.ts

```typescript
import { AgentAdapterFactory } from '../agent-adapter-factory.js';
import { EvaluatorOptimizer } from '../evaluator-optimizer.js';
import type { AgentAdapter, AgentRole } from '@foundry-x/shared';

export function createEvaluatorOptimizerAdapter(
  config: ConstructorParameters<typeof EvaluatorOptimizer>[0],
): AgentAdapter {
  const evaluator = new EvaluatorOptimizer(config);
  return AgentAdapterFactory.wrapEvaluatorOptimizer(evaluator);
}
```

#### spec-checker-adapter.ts, build-validator-adapter.ts, deploy-verifier-adapter.ts

YAML 기반 에이전트 — `fromYamlDefinition`으로 메타데이터 등록:

```typescript
import { AgentAdapterFactory } from '../agent-adapter-factory.js';
import type { AgentAdapter } from '@foundry-x/shared';

export function createSpecCheckerAdapter(): AgentAdapter {
  return AgentAdapterFactory.fromYamlDefinition(
    'spec-checker',
    'discriminator',
    'SPEC.md ↔ MEMORY.md ↔ CLAUDE.md 정합성 검증',
    'haiku',
  );
}
```

## 5. YAML Role 태깅

`.claude/agents/*.md` frontmatter에 `role` 필드를 추가한다. 기존 `agent-definition-loader.ts`의 `parseSimpleYaml()`이 unknown key를 무시하므로 호환성 문제 없음.

| 에이전트 | role | 근거 |
|----------|------|------|
| ogd-generator | generator | GAN Generator |
| ogd-discriminator | discriminator | GAN Discriminator |
| ogd-orchestrator | orchestrator | GAN Orchestrator |
| shaping-generator | generator | 형상화 Generator |
| shaping-discriminator | discriminator | 형상화 Discriminator |
| shaping-orchestrator | orchestrator | 형상화 Orchestrator |
| spec-checker | discriminator | 정합성 검증 (판별) |
| build-validator | discriminator | 빌드 검증 (판별) |
| deploy-verifier | discriminator | 배포 검증 (판별) |
| auto-reviewer | discriminator | AI 자가 리뷰 (판별) |
| expert-ta | generator | TA 분석 산출 |
| expert-aa | generator | AA 분석 산출 |
| expert-ca | generator | CA 분석 산출 |
| expert-da | generator | DA 분석 산출 |
| expert-qa | generator | QA 분석 산출 |
| six-hats-moderator | orchestrator | 토론 조율 |

## 6. API 라우트

### 6.1 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/tenants/:tenantId/agent-adapters` | 등록된 어댑터 목록 |
| GET | `/api/tenants/:tenantId/agent-adapters/:name` | 어댑터 상세 |
| POST | `/api/tenants/:tenantId/agent-adapters/:name/execute` | 어댑터 실행 |

### 6.2 Zod 스키마

```typescript
// packages/api/src/schemas/agent-adapter.ts (신규)

import { z } from '@hono/zod-openapi';

export const AgentAdapterResponseSchema = z.object({
  name: z.string(),
  role: z.enum(['generator', 'discriminator', 'orchestrator']),
  metadata: z.object({
    source: z.enum(['yaml', 'service', 'mcp']),
    originalService: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    modelTier: z.string().optional(),
  }).optional(),
});

export const AgentAdapterListResponseSchema = z.object({
  items: z.array(AgentAdapterResponseSchema),
  total: z.number(),
});

export const AgentAdapterExecuteRequestSchema = z.object({
  taskId: z.string(),
  tenantId: z.string(),
  loopMode: z.enum(['retry', 'adversarial', 'fix']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AgentAdapterExecuteResponseSchema = z.object({
  success: z.boolean(),
  qualityScore: z.number().nullable(),
  feedback: z.array(z.string()),
  artifacts: z.record(z.unknown()).optional(),
});
```

## 7. 테스트 전략

### 7.1 단위 테스트

| 파일 | 테스트 항목 | 건수 |
|------|------------|------|
| `agent-adapter-factory.test.ts` | wrapRunner 변환 정확성, wrapEvaluatorOptimizer, fromYamlDefinition | 8 |
| `agent-adapter-registry.test.ts` | register/get/getByRole/list/getAdversarialPair/clear | 7 |
| `adapters/claude-api-adapter.test.ts` | 어댑터 생성 + execute mock | 3 |
| `agent-adapters-route.test.ts` | GET 목록, GET 상세, POST execute | 5 |
| **합계** | | **23** |

### 7.2 통합 테스트 (OrchestrationLoop + Adapter)

| 시나리오 | 모드 | 검증 |
|----------|------|------|
| claude-api adapter를 retry 모드로 실행 | retry | 래핑된 어댑터가 정상 실행, qualityScore 반환 |
| generator+discriminator 쌍으로 adversarial 실행 | adversarial | 2단계(Generator→Discriminator) 정상 동작 |

## 8. 파일 목록 (구현 순서)

| 순서 | 파일 | 작업 | LOC 예상 |
|------|------|------|---------|
| 1 | `packages/shared/src/orchestration.ts` | AgentMetadata + handleFeedback 추가 | +15 |
| 2 | `packages/api/src/services/agent-adapter-factory.ts` | 신규 — 팩토리 | ~120 |
| 3 | `packages/api/src/services/agent-adapter-registry.ts` | 신규 — 레지스트리 | ~60 |
| 4 | `packages/api/src/services/adapters/claude-api-adapter.ts` | 신규 | ~15 |
| 5 | `packages/api/src/services/adapters/evaluator-optimizer-adapter.ts` | 신규 | ~15 |
| 6 | `packages/api/src/services/adapters/spec-checker-adapter.ts` | 신규 | ~15 |
| 7 | `packages/api/src/services/adapters/build-validator-adapter.ts` | 신규 | ~15 |
| 8 | `packages/api/src/services/adapters/deploy-verifier-adapter.ts` | 신규 | ~15 |
| 9 | `packages/api/src/schemas/agent-adapter.ts` | 신규 — Zod 스키마 | ~40 |
| 10 | `packages/api/src/routes/agent-adapters.ts` | 신규 — 라우트 | ~80 |
| 11 | `.claude/agents/*.md` (16개) | role 필드 추가 | +16행 |
| 12 | `packages/api/src/__tests__/agent-adapter-factory.test.ts` | 신규 | ~120 |
| 13 | `packages/api/src/__tests__/agent-adapter-registry.test.ts` | 신규 | ~80 |
| 14 | `packages/api/src/__tests__/adapters/claude-api-adapter.test.ts` | 신규 | ~50 |
| 15 | `packages/api/src/__tests__/agent-adapters-route.test.ts` | 신규 | ~100 |
| | **합계** | | **~760** |

## 9. 변경 영향 분석

### 변경 파일

- `packages/shared/src/orchestration.ts` — AgentMetadata, handleFeedback 추가 (하위호환)
- `.claude/agents/*.md` — role frontmatter 추가 (parseSimpleYaml 호환)

### 신규 파일

- `packages/api/src/services/agent-adapter-factory.ts`
- `packages/api/src/services/agent-adapter-registry.ts`
- `packages/api/src/services/adapters/` (5개 어댑터)
- `packages/api/src/schemas/agent-adapter.ts`
- `packages/api/src/routes/agent-adapters.ts`
- `packages/api/src/__tests__/` (4개 테스트)

### 기존 코드 영향

**없음** — 모든 변경은 additive. 기존 AgentRunner, ClaudeApiRunner, EvaluatorOptimizer, agent-definition-loader 등은 변경하지 않음.
