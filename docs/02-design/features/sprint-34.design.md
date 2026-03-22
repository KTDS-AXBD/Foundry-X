---
code: FX-DSGN-034
title: "Sprint 34 — OpenRouter Runner 상세 설계 (F135)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: F135
sprint: 34
phase: "Phase 5a"
references:
  - "[[FX-PLAN-034]]"
---

## 1. 설계 개요

### 1.1 목적

기존 `AgentRunner` 인터페이스에 `OpenRouterRunner` 구현체를 추가하여 OpenRouter API(OpenAI 호환 포맷)를 통한 멀티모델 에이전트 실행을 지원한다.

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| **OCP (개방-폐쇄)** | 기존 AgentRunner 인터페이스/ClaudeApiRunner 수정 없이 새 구현체 추가 |
| **DRY** | `TASK_SYSTEM_PROMPTS`와 `buildUserPrompt` 로직을 공유 유틸로 추출 |
| **Fail-safe** | OpenRouter 실패 시 기존 ClaudeApiRunner로 자동 Fallback |
| **최소 변경** | execution-types.ts는 타입 1줄 추가, agent-runner.ts는 팩토리 분기만 수정 |

---

## 2. 아키텍처

### 2.1 클래스 다이어그램

```
                    ┌──────────────────┐
                    │  AgentRunner     │ (interface)
                    │  ─────────────── │
                    │  type            │
                    │  execute()       │
                    │  isAvailable()   │
                    │  supportsTaskType│
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
   ┌──────────▼───┐  ┌──────▼──────┐  ┌───▼────────┐
   │ OpenRouter   │  │ ClaudeApi   │  │ Mock       │
   │ Runner       │  │ Runner      │  │ Runner     │
   │ ──────────── │  │ ──────────  │  │ ────────── │
   │ type:        │  │ type:       │  │ type:      │
   │ "openrouter" │  │ "claude-api"│  │ "mock"     │
   │              │  │             │  │            │
   │ apiKey       │  │ apiKey      │  │            │
   │ model        │  │ model       │  │            │
   │ baseUrl      │  │             │  │            │
   └──────────────┘  └─────────────┘  └────────────┘

   ┌─────────────────────────────────────────┐
   │ prompt-utils.ts (신규)                   │
   │ ─────────────────────────────────        │
   │ TASK_SYSTEM_PROMPTS (기존에서 이전)       │
   │ buildUserPrompt(request)                 │
   │ UIHINT_INSTRUCTION                       │
   │ DEFAULT_LAYOUT_MAP                       │
   └─────────────────────────────────────────┘
```

### 2.2 팩토리 분기 흐름

```
createAgentRunner(env)
  │
  ├─ env.OPENROUTER_API_KEY 존재?
  │   └─ Yes → new OpenRouterRunner(apiKey, model?, baseUrl?)
  │
  ├─ env.ANTHROPIC_API_KEY 존재?
  │   └─ Yes → new ClaudeApiRunner(apiKey)
  │
  └─ else → new MockRunner()
```

### 2.3 요청-응답 흐름

```
AgentExecutionRequest
  │
  ▼
OpenRouterRunner.execute()
  │
  ├─ 1. TASK_SYSTEM_PROMPTS[taskType] → systemPrompt
  ├─ 2. buildUserPrompt(request) → userPrompt
  ├─ 3. OpenAI 호환 요청 빌드
  │     {
  │       model: "anthropic/claude-sonnet-4",
  │       messages: [
  │         { role: "system", content: systemPrompt },
  │         { role: "user", content: userPrompt }
  │       ],
  │       max_tokens: 4096
  │     }
  ├─ 4. POST https://openrouter.ai/api/v1/chat/completions
  │     Headers:
  │       Authorization: Bearer ${apiKey}
  │       HTTP-Referer: https://foundry-x-api.ktds-axbd.workers.dev
  │       X-Title: Foundry-X
  │       Content-Type: application/json
  │
  ├─ 5. 응답 변환
  │     response.choices[0].message.content → JSON parse
  │     response.usage.{prompt_tokens, completion_tokens} → tokensUsed
  │     response.model → model
  │
  └─ 6. AgentExecutionResult 반환
```

---

## 3. 상세 설계

### 3.1 파일별 변경 상세

#### 3.1.1 `execution-types.ts` — 타입 확장

```typescript
// Before:
export type AgentRunnerType = "claude-api" | "mcp" | "mock";

// After:
export type AgentRunnerType = "claude-api" | "openrouter" | "mcp" | "mock";
```

변경 영향: `AgentRunnerType`을 참조하는 코드는 union 확장이므로 하위 호환됨. 기존 `"claude-api" | "mcp" | "mock"` 값은 모두 유효.

#### 3.1.2 `prompt-utils.ts` — 공유 유틸 추출 (신규)

ClaudeApiRunner와 OpenRouterRunner가 동일한 시스템 프롬프트 + 유저 프롬프트 빌드 로직을 사용하므로, 중복을 피하기 위해 공유 모듈로 추출한다.

```typescript
// packages/api/src/services/prompt-utils.ts

import type { AgentExecutionRequest, AgentTaskType } from "./execution-types.js";

/** F60: Generative UI — instruct LLM to include rendering hints */
export const UIHINT_INSTRUCTION = `\n\nAdditionally, include a "uiHint" field...`;

export const TASK_SYSTEM_PROMPTS: Record<AgentTaskType, string> = {
  "code-review": `You are a code review agent...` + UIHINT_INSTRUCTION,
  "code-generation": `You are a code generation agent...` + UIHINT_INSTRUCTION,
  "spec-analysis": `You are a spec analysis agent...` + UIHINT_INSTRUCTION,
  "test-generation": `You are a test generation agent...` + UIHINT_INSTRUCTION,
  "policy-evaluation": `You are a policy evaluation agent...` + UIHINT_INSTRUCTION,
  "skill-query": `You are a skill query agent...` + UIHINT_INSTRUCTION,
  "ontology-lookup": `You are an ontology lookup agent...` + UIHINT_INSTRUCTION,
};

export const DEFAULT_LAYOUT_MAP: Record<AgentTaskType, string> = { ... };

/** 공통 유저 프롬프트 빌더 — ClaudeApiRunner, OpenRouterRunner 공유 */
export function buildUserPrompt(request: AgentExecutionRequest): string {
  const parts: string[] = [];
  if (request.context.spec) {
    parts.push(`## Spec\nTitle: ${request.context.spec.title}\n...`);
  }
  if (request.context.instructions) {
    parts.push(`\n## Instructions\n${request.context.instructions}`);
  }
  if (request.context.targetFiles?.length) {
    parts.push(`\n## Target Files\n${request.context.targetFiles.join("\n")}`);
  }
  parts.push(`\n## Context\nRepo: ${request.context.repoUrl}`);
  parts.push(`Branch: ${request.context.branch}`);
  return parts.join("\n");
}
```

**마이그레이션:** `claude-api-runner.ts`에서 `TASK_SYSTEM_PROMPTS`, `UIHINT_INSTRUCTION`, `DEFAULT_LAYOUT_MAP`, `buildUserPrompt`를 `prompt-utils.ts`로 이동하고, 기존 위치에서는 re-export하여 하위 호환을 유지한다.

```typescript
// claude-api-runner.ts (마이그레이션 후)
export { TASK_SYSTEM_PROMPTS, UIHINT_INSTRUCTION, DEFAULT_LAYOUT_MAP } from "./prompt-utils.js";
```

#### 3.1.3 `openrouter-runner.ts` — 핵심 구현 (신규)

```typescript
// packages/api/src/services/openrouter-runner.ts

import type { AgentExecutionRequest, AgentExecutionResult } from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";
import { TASK_SYSTEM_PROMPTS, buildUserPrompt } from "./prompt-utils.js";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 30_000;

/** OpenRouter API 응답 타입 (OpenAI 호환) */
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterRunner implements AgentRunner {
  readonly type = "openrouter" as const;

  constructor(
    private apiKey: string,
    private model: string = DEFAULT_MODEL,
    private baseUrl: string = DEFAULT_BASE_URL,
  ) {}

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const systemPrompt = TASK_SYSTEM_PROMPTS[request.taskType];
    const userPrompt = buildUserPrompt(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://foundry-x-api.ktds-axbd.workers.dev",
          "X-Title": "Foundry-X",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: DEFAULT_MAX_TOKENS,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          status: "failed",
          output: {
            analysis: `OpenRouter API error: ${res.status} ${res.statusText}`,
          },
          tokensUsed: 0,
          model: this.model,
          duration: Date.now() - startTime,
        };
      }

      const data = (await res.json()) as OpenRouterResponse;
      const text = data.choices[0]?.message?.content ?? "";
      const tokensUsed = (data.usage?.prompt_tokens ?? 0)
                       + (data.usage?.completion_tokens ?? 0);
      const actualModel = data.model ?? this.model;

      try {
        const parsed = JSON.parse(text);
        return {
          status: "success",
          output: {
            analysis: parsed.analysis,
            generatedCode: parsed.generatedCode,
            reviewComments: parsed.reviewComments,
            uiHint: parsed.uiHint,
          },
          tokensUsed,
          model: actualModel,
          duration: Date.now() - startTime,
        };
      } catch {
        return {
          status: "partial",
          output: { analysis: text },
          tokensUsed,
          model: actualModel,
          duration: Date.now() - startTime,
        };
      }
    } catch (error) {
      const isTimeout = error instanceof DOMException
                     && error.name === "AbortError";
      return {
        status: "failed",
        output: {
          analysis: isTimeout
            ? `OpenRouter timeout after ${REQUEST_TIMEOUT_MS}ms`
            : `OpenRouter error: ${String(error)}`,
        },
        tokensUsed: 0,
        model: this.model,
        duration: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  supportsTaskType(taskType: string): boolean {
    return taskType in TASK_SYSTEM_PROMPTS;
  }
}
```

**ClaudeApiRunner와의 차이점:**

| 항목 | ClaudeApiRunner | OpenRouterRunner |
|------|-----------------|------------------|
| API URL | `https://api.anthropic.com/v1/messages` | `${baseUrl}/chat/completions` |
| 인증 헤더 | `x-api-key: ${key}` | `Authorization: Bearer ${key}` |
| 요청 포맷 | Anthropic Messages API | OpenAI Chat Completions |
| system 전달 | `body.system` (string) | `messages[0].role: "system"` |
| 응답 텍스트 | `content[].text` | `choices[0].message.content` |
| usage | `{input_tokens, output_tokens}` | `{prompt_tokens, completion_tokens}` |
| 타임아웃 | 없음 | AbortController 30s |
| 모델 | 생성자에서 고정 | 생성자에서 설정 (동적 가능) |

#### 3.1.4 `agent-runner.ts` — 팩토리 확장

```typescript
// packages/api/src/services/agent-runner.ts (수정)

import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentRunnerType,
} from "./execution-types.js";
import { ClaudeApiRunner, MockRunner } from "./claude-api-runner.js";
import { OpenRouterRunner } from "./openrouter-runner.js";

export interface AgentRunner {
  readonly type: AgentRunnerType;
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
  isAvailable(): Promise<boolean>;
  supportsTaskType(taskType: string): boolean;
}

/**
 * AgentRunner 팩토리 — 환경에 따라 적절한 Runner를 생성
 * 우선순위: OpenRouter > Claude API > Mock
 */
export function createAgentRunner(env: {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_DEFAULT_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
}): AgentRunner {
  if (env.OPENROUTER_API_KEY) {
    return new OpenRouterRunner(
      env.OPENROUTER_API_KEY,
      env.OPENROUTER_DEFAULT_MODEL,
    );
  }
  if (env.ANTHROPIC_API_KEY) {
    return new ClaudeApiRunner(env.ANTHROPIC_API_KEY);
  }
  return new MockRunner();
}
```

**영향 범위:** `createAgentRunner`를 호출하는 코드가 `env` 객체에 `OPENROUTER_API_KEY`를 포함하면 자동으로 OpenRouterRunner가 선택된다. 기존 호출부는 `OPENROUTER_API_KEY`가 없으면 기존 동작 그대로.

#### 3.1.5 `claude-api-runner.ts` — Re-export 마이그레이션

```typescript
// claude-api-runner.ts (수정 부분만)

// 기존: TASK_SYSTEM_PROMPTS, UIHINT_INSTRUCTION, DEFAULT_LAYOUT_MAP, buildUserPrompt 직접 정의
// 변경: prompt-utils.ts에서 import + re-export (하위 호환)

export {
  UIHINT_INSTRUCTION,
  TASK_SYSTEM_PROMPTS,
  DEFAULT_LAYOUT_MAP,
  buildUserPrompt,
} from "./prompt-utils.js";

// ClaudeApiRunner 클래스는 그대로 유지
// - 내부의 this.buildUserPrompt() → import { buildUserPrompt } from "./prompt-utils.js" 로 변경
// - private buildUserPrompt 메서드 제거
```

---

## 4. 테스트 설계

### 4.1 OpenRouterRunner 테스트 (`openrouter-runner.test.ts`)

| # | 테스트 케이스 | 분류 |
|---|-------------|------|
| 1 | `type`이 `"openrouter"` | 기본 속성 |
| 2 | `execute()` — 유효한 JSON 응답 시 `success` 반환 | 정상 흐름 |
| 3 | `execute()` — `uiHint` 포함 응답 추출 | F60 호환 |
| 4 | `execute()` — `uiHint` 없는 응답에서도 정상 동작 | 하위 호환 |
| 5 | `execute()` — API 에러(429) 시 `failed` 반환 | 에러 핸들링 |
| 6 | `execute()` — API 에러(500) 시 에러 메시지 포함 | 에러 핸들링 |
| 7 | `execute()` — 비JSON 응답 시 `partial` 반환 | 파싱 실패 |
| 8 | `execute()` — 타임아웃 시 `failed` + 타임아웃 메시지 | 타임아웃 |
| 9 | `execute()` — 올바른 URL과 헤더로 fetch 호출 확인 | API 규격 |
| 10 | `execute()` — `tokensUsed` 계산 정확성 | 토큰 추적 |
| 11 | `execute()` — 응답의 `model`(실제 사용 모델) 반영 | 모델 추적 |
| 12 | `isAvailable()` — API key 있으면 true | 가용성 |
| 13 | `isAvailable()` — API key 비어있으면 false | 가용성 |
| 14 | `supportsTaskType()` — 알려진 타입은 true | 태스크 지원 |
| 15 | `supportsTaskType()` — 미지원 타입은 false | 태스크 지원 |

### 4.2 팩토리 테스트 (`agent-runner-factory.test.ts`)

| # | 테스트 케이스 | 분류 |
|---|-------------|------|
| 1 | `OPENROUTER_API_KEY`만 있을 때 → `OpenRouterRunner` 반환 | 우선순위 |
| 2 | `OPENROUTER_API_KEY` + `ANTHROPIC_API_KEY` 둘 다 → `OpenRouterRunner` 반환 | 우선순위 |
| 3 | `ANTHROPIC_API_KEY`만 있을 때 → `ClaudeApiRunner` 반환 | Fallback |
| 4 | 둘 다 없을 때 → `MockRunner` 반환 | 기본값 |
| 5 | `OPENROUTER_DEFAULT_MODEL` 지정 시 해당 모델로 생성 | 설정 |

### 4.3 기존 테스트 영향 분석

| 테스트 파일 | 영향 | 대응 |
|-------------|------|------|
| `claude-api-runner.test.ts` (16건) | `TASK_SYSTEM_PROMPTS` import 경로 변경 가능 | re-export로 기존 import 유지 |
| `agent-orchestrator.test.ts` | `createAgentRunner` mock → env 파라미터 확장 | env 확장은 하위 호환 |
| `agent-routes-queue.test.ts` | Runner 직접 참조 없음 | 영향 없음 |
| `mcp-runner.test.ts` | AgentRunner 인터페이스 사용 안 함 | 영향 없음 |

---

## 5. 환경 변수 및 Wrangler 설정

### 5.1 로컬 개발 (`.dev.vars`)

```
OPENROUTER_API_KEY=sk-or-v1-...  # F155에서 이미 발급 완료
OPENROUTER_DEFAULT_MODEL=anthropic/claude-sonnet-4  # 선택
ANTHROPIC_API_KEY=sk-ant-...  # 기존 유지
```

### 5.2 프로덕션 (Sprint 35+ 배포 시)

```bash
wrangler secret put OPENROUTER_API_KEY
# OPENROUTER_DEFAULT_MODEL은 wrangler.toml [vars]에 설정
```

### 5.3 `wrangler.toml` 변경 (배포 시)

```toml
[vars]
OPENROUTER_DEFAULT_MODEL = "anthropic/claude-sonnet-4"
```

---

## 6. 구현 순서 (Do Phase 가이드)

```
Step 1: prompt-utils.ts 추출 (15min)
  ├─ claude-api-runner.ts에서 TASK_SYSTEM_PROMPTS, buildUserPrompt 등 이동
  ├─ claude-api-runner.ts에서 re-export 추가
  └─ 기존 테스트 회귀 확인 (pnpm test)

Step 2: execution-types.ts 수정 (5min)
  └─ AgentRunnerType에 "openrouter" 추가

Step 3: openrouter-runner.ts 작성 (30min)
  ├─ OpenRouterRunner class
  ├─ OpenAI 호환 요청/응답 변환
  └─ AbortController 타임아웃

Step 4: agent-runner.ts 팩토리 확장 (10min)
  ├─ OpenRouterRunner import
  └─ 3-way 분기 로직

Step 5: 테스트 작성 (30min)
  ├─ openrouter-runner.test.ts (15건)
  └─ agent-runner-factory.test.ts (5건)

Step 6: 검증 (10min)
  ├─ pnpm typecheck (packages/api)
  ├─ pnpm lint (packages/api)
  └─ pnpm test (전체 583+ 회귀 확인)
```

**총 예상 작업량:** 파일 4개 수정/생성 + 테스트 2개 = 약 6개 파일

---

## 7. 비목표 재확인

이 Design은 **OpenRouterRunner 단일 구현체**에 집중하며, 아래는 의도적으로 포함하지 않는다:

| 항목 | 이유 | 대상 Sprint |
|------|------|-------------|
| model_routing_rules DB 테이블 | F136 범위 | Sprint 35 |
| 태스크별 자동 모델 선택 | F136 범위 | Sprint 35 |
| Evaluator-Optimizer 루프 | F137 범위 | Sprint 36 |
| createAgentRunner에 Fallback 체인 | 단순 팩토리 유지 — F136에서 체인 도입 | Sprint 35 |
| 프로덕션 배포 | 로컬 검증 후 배포 | Sprint 35+ |
