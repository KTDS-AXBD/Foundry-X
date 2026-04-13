---
id: FX-DESIGN-280
title: Sprint 280 Design — F527 Agent Runtime (L2)
sprint: 280
f_items: [F527]
date: 2026-04-13
status: active
---

# Sprint 280 Design — F527 Agent Runtime (L2)

## §1 타입 설계 (`packages/shared/src/agent-runtime.ts`)

```typescript
// F-L2-1: 도구 정의
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: ZodType<TInput>;
  outputSchema?: ZodType<TOutput>;
  category: 'builtin' | 'mcp' | 'agent' | 'custom';
  permissions?: string[];
  execute: (input: TInput, ctx: ToolExecutionContext) => Promise<TOutput>;
}

export interface ToolExecutionContext {
  agentId: string;
  sessionId: string;
  db?: D1Database;
}

// F-L2-2: AgentSpec YAML 스키마
export interface AgentSpec {
  name: string;
  version?: string;
  model: string;
  systemPrompt: string;
  tools: string[];          // ToolRegistry keys
  steering?: {
    rules: string[];
  };
  evaluation?: {
    criteria: string[];
    minScore?: number;
  };
  constraints?: {
    maxTokens?: number;
    maxRounds?: number;
    timeoutMs?: number;
  };
  metadata?: Record<string, unknown>;
}

// F-L2-4: Hooks
export interface AgentHooks {
  beforeInvocation?: (ctx: InvocationContext) => Promise<void>;
  afterInvocation?: (ctx: InvocationContext, result: RuntimeResult) => Promise<void>;
  beforeModel?: (ctx: ModelCallContext) => Promise<ModelCallContext | void>;
  afterModel?: (ctx: ModelCallContext, result: ModelCallResult) => Promise<void>;
  beforeTool?: (ctx: ToolCallContext) => Promise<ToolCallContext | 'cancel' | void>;
  afterTool?: (ctx: ToolCallContext, result: ToolCallResult) => Promise<ToolCallResult | void>;
}

// F-L2-3: Runtime
export interface RuntimeContext {
  agentId: string;
  sessionId: string;
  apiKey: string;
  db?: D1Database;
  hooks?: AgentHooks;
}

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'cancelled' | 'max_rounds';

export interface RuntimeResult {
  output: string;
  stopReason: StopReason;
  rounds: number;
  tokenUsage: TokenUsageSummary;
}

// F-L2-5: TokenTracker
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface TokenUsageSummary extends TokenUsage {
  totalTokens: number;
  estimatedCostUsd?: number;
}

// Context types
export interface InvocationContext {
  agentId: string;
  sessionId: string;
  spec: AgentSpec;
  input: string;
}

export interface ModelCallContext {
  messages: AnthropicMessage[];
  systemPrompt: string;
  model: string;
  tools?: AnthropicToolDef[];
}

export interface ModelCallResult {
  content: AnthropicContent[];
  stopReason: string;
  usage: TokenUsage;
}

export interface ToolCallContext {
  toolName: string;
  toolInput: unknown;
  toolUseId: string;
}

export interface ToolCallResult {
  content: string;
  isError?: boolean;
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

export interface AnthropicContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
```

## §2 컴포넌트 설계

### `define-tool.ts` (F-L2-1)
```typescript
export function defineTool<TInput, TOutput>(
  def: ToolDefinition<TInput, TOutput>
): ToolDefinition<TInput, TOutput>
```
- name, description 필수 검증
- category 기본값: 'custom'
- 그대로 반환 (type-safe wrapper)

### `tool-registry.ts` (F-L2-6)
```typescript
class ToolRegistry {
  register(tool: ToolDefinition): this
  get(name: string): ToolDefinition | undefined
  has(name: string): boolean
  list(filter?: { category?: ToolCategory }): ToolDefinition[]
  toAnthropicTools(): AnthropicToolDef[]  // Claude API 포맷 변환
  clear(): void
}
```

### `token-tracker.ts` (F-L2-5)
```typescript
class TokenTracker {
  track(agentId: string, usage: TokenUsage): void
  getUsage(agentId: string): TokenUsageSummary
  total(): TokenUsageSummary
  reset(agentId?: string): void
}
```
- 에이전트별 누적 집계
- `total()`은 모든 에이전트 합산

### `agent-spec-loader.ts` (F-L2-2)
```typescript
// 간단한 YAML 파서 (agent spec 전용)
function parseAgentSpec(yaml: string): AgentSpec
function validateAgentSpec(spec: unknown): AgentSpec  // zod validation
```
- 지원 타입: string, number, boolean, string[]
- 중첩 객체: 1단계만 (tools, steering, evaluation, constraints, metadata)
- 파싱 실패 시 명확한 에러 메시지

### `agent-runtime.ts` (F-L2-3 + F-L2-4)
```typescript
class AgentRuntime {
  constructor(registry: ToolRegistry, tracker: TokenTracker)
  
  async run(
    spec: AgentSpec,
    input: string,
    ctx: RuntimeContext
  ): Promise<RuntimeResult>
}
```

**에이전트 루프 흐름:**
```
1. beforeInvocation hook
2. 초기 messages = [{ role: 'user', content: input }]
3. while rounds < maxRounds:
   a. beforeModel hook → Claude API 호출
   b. afterModel hook
   c. stopReason == 'end_turn' → break
   d. stopReason == 'tool_use' → forEach tool_use:
      - beforeTool hook (cancel 시 skip)
      - ToolRegistry.get(name).execute(input, ctx)
      - afterTool hook (결과 override 가능)
      - messages에 tool_result 추가
4. afterInvocation hook
5. return RuntimeResult
```

## §3 YAML 파일 구조

```yaml
# planner.agent.yaml 예시
name: planner
version: "1.0"
model: claude-haiku-4-5-20251001
systemPrompt: |
  You are a planning agent for Foundry-X...
tools:
  - read_file
  - search_code
  - create_plan
constraints:
  maxTokens: 4096
  maxRounds: 10
```

## §4 기존 에이전트 매핑

| 기존 파일 | YAML 파일 | 핵심 역할 |
|----------|----------|---------|
| `planner-agent.ts` | `planner.agent.yaml` | 코드베이스 분석 + 계획 |
| `architect-agent.ts` 관련 | `architect.agent.yaml` | 아키텍처 설계 |
| `reviewer-agent.ts` | `reviewer.agent.yaml` | 코드 리뷰 |
| `test-agent.ts` | `test.agent.yaml` | 테스트 생성 |
| `security-agent.ts` | `security.agent.yaml` | 보안 분석 |
| `qa-agent.ts` | `qa.agent.yaml` | QA 검증 |
| `infra-agent.ts` | `infra.agent.yaml` | 인프라 점검 |

## §4b 구현 중 추가된 유틸리티 (역동기화)

| 함수/속성 | 위치 | 설명 |
|---------|------|------|
| `toJsonSchema(schema)` | `define-tool.ts` | Zod→JSON Schema 변환 (toAnthropicTools 내부용) |
| `validateAgentSpec(obj)` | `agent-spec-loader.ts` | 이미 파싱된 객체 검증 |
| `ToolRegistry.size` | `tool-registry.ts` | 등록 도구 수 |
| `TokenTracker.agents()` | `token-tracker.ts` | 추적 중인 에이전트 목록 |
| `toAnthropicTools(names?)` | `tool-registry.ts` | names 파라미터로 spec.tools 필터링 |

**타입 변경 (의도적)**:
- `TokenUsage` → `LLMTokenUsage`, `TokenUsageSummary` → `LLMTokenSummary` (shared 내 명확성)
- `RuntimeContext.db`: `D1Database` → `unknown` (shared에서 Cloudflare 의존 제거)
- `ToolExecutionContext`: shared → api 패키지 (Zod 의존 회피)

## §5 파일 매핑 (Worker 없음 — 단일 구현)

| 파일 | 신규/수정 | 설명 |
|------|---------|------|
| `packages/shared/src/agent-runtime.ts` | 신규 | 공유 타입 |
| `packages/shared/src/index.ts` | 수정 | export 추가 |
| `packages/api/src/core/agent/runtime/index.ts` | 신규 | barrel |
| `packages/api/src/core/agent/runtime/define-tool.ts` | 신규 | F-L2-1 |
| `packages/api/src/core/agent/runtime/tool-registry.ts` | 신규 | F-L2-6 |
| `packages/api/src/core/agent/runtime/token-tracker.ts` | 신규 | F-L2-5 |
| `packages/api/src/core/agent/runtime/agent-spec-loader.ts` | 신규 | F-L2-2 |
| `packages/api/src/core/agent/runtime/agent-runtime.ts` | 신규 | F-L2-3+4 |
| `packages/api/src/core/agent/specs/planner.agent.yaml` | 신규 | F-L2-7 |
| `packages/api/src/core/agent/specs/architect.agent.yaml` | 신규 | F-L2-7 |
| `packages/api/src/core/agent/specs/reviewer.agent.yaml` | 신규 | F-L2-7 |
| `packages/api/src/core/agent/specs/test.agent.yaml` | 신규 | F-L2-7 |
| `packages/api/src/core/agent/specs/security.agent.yaml` | 신규 | F-L2-7 |
| `packages/api/src/core/agent/specs/qa.agent.yaml` | 신규 | F-L2-7 |
| `packages/api/src/core/agent/specs/infra.agent.yaml` | 신규 | F-L2-7 |
| `packages/api/src/__tests__/services/agent-runtime.test.ts` | 신규 | TDD |

## §6 테스트 계약 (TDD Red Target)

```
describe("F527 Agent Runtime (L2)")
  describe("defineTool")
    ✗ name과 description이 있으면 도구를 반환한다
    ✗ name이 없으면 에러를 던진다
  describe("ToolRegistry")
    ✗ register 후 get으로 조회된다
    ✗ category 필터로 list 가능하다
    ✗ toAnthropicTools()가 올바른 포맷을 반환한다
  describe("TokenTracker")
    ✗ track 후 getUsage에 누적된다
    ✗ total()이 전체 합산을 반환한다
    ✗ reset()으로 초기화된다
  describe("AgentSpecLoader")
    ✗ 유효한 YAML을 AgentSpec으로 파싱한다
    ✗ systemPrompt 없는 YAML은 에러를 던진다
  describe("AgentRuntime")
    ✗ end_turn 응답 시 단일 라운드로 완료된다
    ✗ tool_use 응답 시 도구를 실행하고 결과를 이어간다
    ✗ beforeTool hook이 'cancel'을 반환하면 도구를 건너뛴다
    ✗ maxRounds 초과 시 max_rounds로 중단된다
```
