---
id: FX-DESIGN-281
title: Sprint 281 Design — F528 Graph Orchestration (L3)
sprint: 281
f_items: [F528]
date: 2026-04-13
status: active
---

# Sprint 281 Design — F528 Graph Orchestration (L3)

## §1 타입 설계 (`packages/shared/src/agent-runtime.ts` 추가)

```typescript
// ─── F528: L3 Orchestration 타입 ───

// F-L3-1: GraphEngine 코어 타입
export type GraphNodeHandler = (
  input: GraphNodeInput,
  ctx: GraphExecutionContext,
) => Promise<GraphNodeOutput>;

export interface GraphNode {
  id: string;
  handler: GraphNodeHandler;
  /** agentId가 있으면 AgentRuntime으로 실행 */
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** undefined = 무조건 실행, 함수 = 조건부 */
  condition?: (output: GraphNodeOutput, ctx: GraphExecutionContext) => boolean;
}

export interface GraphDefinition {
  nodes: GraphNode[];
  edges: GraphEdge[];
  entryPoint: string;
  maxExecutions?: number;   // 루프 방지 (기본값 100)
}

export interface GraphNodeInput {
  nodeId: string;
  data: unknown;
  executionId: string;
}

export interface GraphNodeOutput {
  nodeId: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export interface GraphExecutionContext {
  executionId: string;
  sessionId: string;
  apiKey: string;
  db?: unknown;
  nodeOutputs: Map<string, GraphNodeOutput>;
  executionCount: Map<string, number>;
}

export interface GraphRunResult {
  executionId: string;
  finalOutput: GraphNodeOutput;
  nodeOutputs: Record<string, GraphNodeOutput>;
  totalExecutions: number;
  durationMs: number;
}

// F-L3-2: 조건부 라우팅
export type RoutingDecision = 'proceed' | 'skip';

// F-L3-4: Agents-as-Tools
export interface AgentAsToolOptions {
  preserve_context?: boolean;
  description?: string;
  inputDescription?: string;
}

// F-L3-5: SteeringHandler
export type SteeringAction = 'proceed' | 'guide' | 'interrupt';

export interface SteeringResult {
  action: SteeringAction;
  /** guide/interrupt 시 주입할 메시지 */
  message?: string;
}

export interface SteeringHandler {
  beforeTool?: (toolName: string, input: unknown, ctx: GraphExecutionContext) => Promise<SteeringResult>;
  afterModel?: (output: string, ctx: GraphExecutionContext) => Promise<SteeringResult>;
}

// F-L3-6: ConversationManager
export type ConversationStrategy = 'sliding-window' | 'summarizing';

export interface ConversationManagerOptions {
  strategy: ConversationStrategy;
  maxMessages?: number;        // sliding-window 기본값: 20
  summaryModel?: string;       // summarizing 시 사용할 모델
}

// F-L3-7: OrchestrationLoopNode
export interface OrchestrationLoopNodeOptions {
  taskId: string;
  tenantId: string;
  mode?: 'retry' | 'adversarial' | 'fix';
  maxRounds?: number;
}
```

## §2 GraphEngine 구현 (`packages/api/src/core/agent/orchestration/graph-engine.ts`)

```typescript
// F-L3-1~3: GraphEngine + 조건부 라우팅 + 병렬 실행

export class GraphEngine {
  private nodes = new Map<string, GraphNode>();
  private edges: GraphEdge[] = [];
  private entryPoint?: string;
  private maxExecutions: number = 100;

  addNode(node: GraphNode): this { ... }
  addEdge(edge: GraphEdge): this { ... }
  setEntryPoint(nodeId: string): this { ... }
  setMaxExecutions(max: number): this { ... }

  build(): GraphDefinition { /* DAG 검증 (사이클 감지, 진입점 확인) */ }

  async run(
    input: unknown,
    sessionId: string,
    apiKey: string,
    db?: unknown,
  ): Promise<GraphRunResult> { /* 실행 */ }
}
```

**실행 알고리즘 (Kahn's Algorithm 변형)**:
1. 진입점 노드를 큐에 투입
2. 큐에서 노드 꺼내 실행
3. 실행 완료 후 연결된 엣지 조건 평가
4. condition=true인 엣지의 to 노드를 다음 큐에 추가
5. 다음 큐의 모든 노드를 **`Promise.all`로 병렬 실행**
6. executionCount 초과 시 GraphMaxExecutionsError 발생

**사이클 감지**: DFS 방문 마킹으로 `build()` 시점에 검증

## §3 Agents-as-Tools (`packages/api/src/core/agent/orchestration/agents-as-tools.ts`)

`AgentRuntime.asTool()` 메서드 추가 패턴:

```typescript
// packages/api/src/core/agent/runtime/agent-runtime.ts에 추가
asTool(opts: AgentAsToolOptions = {}): ToolDefinition {
  return defineTool({
    name: `agent_${this.spec.name}`,
    description: opts.description ?? this.spec.systemPrompt.slice(0, 100),
    inputSchema: z.object({ message: z.string() }),
    category: 'agent',
    execute: async ({ message }, toolCtx) => {
      const result = await this.run(this.spec, message, {
        agentId: this.spec.name,
        sessionId: toolCtx.sessionId,
        apiKey: toolCtx.apiKey ?? '',
      });
      return result.output;
    },
  });
}
```

## §4 SteeringHandler (`packages/api/src/core/agent/orchestration/steering-handler.ts`)

```typescript
export class ConcreteSteeringHandler implements SteeringHandler {
  constructor(private rules: SteeringRule[]) {}

  async beforeTool(toolName: string, input: unknown): Promise<SteeringResult> {
    for (const rule of this.rules) {
      if (rule.matchTool(toolName, input)) return rule.onBeforeTool(toolName, input);
    }
    return { action: 'proceed' };
  }

  async afterModel(output: string): Promise<SteeringResult> {
    for (const rule of this.rules) {
      if (rule.matchOutput(output)) return rule.onAfterModel(output);
    }
    return { action: 'proceed' };
  }
}
```

**SteeringAction 의미**:
- `proceed`: 계속 실행 (기본)
- `guide`: 메시지를 대화에 주입하고 계속 (방향 교정)
- `interrupt`: 현재 실행 중단 (안전 장치)

## §5 ConversationManager (`packages/api/src/core/agent/orchestration/conversation-manager.ts`)

```typescript
export class ConversationManager {
  constructor(private opts: ConversationManagerOptions) {}

  /** SlidingWindow: maxMessages 초과 시 오래된 메시지 제거 (system 메시지 보존) */
  trimMessages(messages: AnthropicMessage[]): AnthropicMessage[] { ... }

  /** Summarizing: 오래된 메시지를 요약 1개로 압축 (LLM 호출 필요) */
  async summarize(messages: AnthropicMessage[], apiKey: string): Promise<AnthropicMessage[]> { ... }

  async apply(messages: AnthropicMessage[], apiKey?: string): Promise<AnthropicMessage[]> {
    if (this.opts.strategy === 'sliding-window') return this.trimMessages(messages);
    return this.summarize(messages, apiKey!);
  }
}
```

## §6 OrchestrationLoopNode (`packages/api/src/core/agent/orchestration/orchestration-loop-node.ts`)

기존 `OrchestrationLoop`를 변경 없이 GraphEngine 노드로 래핑:

```typescript
export function createOrchestrationLoopNode(
  loop: OrchestrationLoop,
  opts: OrchestrationLoopNodeOptions,
): GraphNode {
  return {
    id: `orchestration-loop-${opts.taskId}`,
    handler: async (input, ctx) => {
      const outcome = await loop.run({
        taskId: opts.taskId,
        tenantId: opts.tenantId,
        mode: opts.mode ?? 'retry',
        maxRounds: opts.maxRounds ?? 3,
      });
      return { nodeId: `orchestration-loop-${opts.taskId}`, data: outcome };
    },
  };
}
```

## §7 AX BD 발굴 Graph (`packages/api/src/core/agent/orchestration/graphs/discovery-graph.ts`)

```typescript
// F-L3-8: 9단계 발굴 파이프라인 Graph 정의
export function createDiscoveryGraph(agentRuntime: AgentRuntime): GraphDefinition {
  const engine = new GraphEngine();

  // 9개 노드 추가 (coordinator + 2-0 ~ 2-8)
  engine.addNode({ id: 'coordinator', handler: coordinatorHandler });
  engine.addNode({ id: 'stage-2-0', handler: makeStageHandler('2-0') }); // 구체화/분류
  engine.addNode({ id: 'stage-2-1', handler: makeStageHandler('2-1') }); // 레퍼런스
  engine.addNode({ id: 'stage-2-2', handler: makeStageHandler('2-2') }); // 수요/시장
  engine.addNode({ id: 'stage-2-3', handler: makeStageHandler('2-3') }); // 경쟁/지사
  engine.addNode({ id: 'stage-2-4', handler: makeStageHandler('2-4') }); // 아이템 도출
  engine.addNode({ id: 'stage-2-5', handler: makeStageHandler('2-5') }); // 접근방식
  engine.addNode({ id: 'stage-2-6', handler: makeStageHandler('2-6') }); // 협력사
  engine.addNode({ id: 'stage-2-7', handler: makeStageHandler('2-7') }); // 위험요소
  engine.addNode({ id: 'stage-2-8', handler: makeStageHandler('2-8') }); // 발굴완료

  // 엣지 (순차 + 병렬 + 조건부)
  engine.addEdge({ from: 'coordinator', to: 'stage-2-0' });
  engine.addEdge({ from: 'stage-2-0', to: 'stage-2-1' });   // 병렬 시작
  engine.addEdge({ from: 'stage-2-0', to: 'stage-2-2' });   // 병렬
  engine.addEdge({ from: 'stage-2-1', to: 'stage-2-3' });
  engine.addEdge({ from: 'stage-2-2', to: 'stage-2-3' });
  engine.addEdge({ from: 'stage-2-3', to: 'stage-2-4' });

  // gate 조건부 분기: 도출 결과 충분 여부
  engine.addEdge({
    from: 'stage-2-4', to: 'stage-2-5',
    condition: (out) => (out.data as { itemCount: number }).itemCount >= 3,
  });
  engine.addEdge({
    from: 'stage-2-4', to: 'stage-2-3',  // 보완 루프
    condition: (out) => (out.data as { itemCount: number }).itemCount < 3,
  });

  engine.addEdge({ from: 'stage-2-5', to: 'stage-2-6' });   // 병렬 시작
  engine.addEdge({ from: 'stage-2-5', to: 'stage-2-7' });   // 병렬
  engine.addEdge({ from: 'stage-2-6', to: 'stage-2-8' });
  engine.addEdge({ from: 'stage-2-7', to: 'stage-2-8' });

  engine.setEntryPoint('coordinator');
  engine.setMaxExecutions(50);  // 보완 루프 최대 5회(9노드×5회 여유분)

  return engine.build();
}
```

## §8 테스트 계약 (TDD Red Target)

### `graph-engine.test.ts`

```typescript
// F528 GraphEngine TDD
describe('GraphEngine — F528', () => {
  it('순차 실행: A→B→C 노드가 순서대로 실행된다')
  it('조건부 분기: condition=true 엣지만 실행된다')
  it('조건부 분기: condition=false 엣지는 스킵된다')
  it('병렬 실행: 독립 노드 A→B, A→C가 동시 실행된다')
  it('루프 방지: maxExecutions 초과 시 오류를 던진다')
  it('사이클 감지: build() 시 사이클이 있으면 오류를 던진다')
  it('최종 출력: 마지막 노드의 output이 runResult.finalOutput에 담긴다')
  it('nodeOutputs: 모든 노드 실행 결과가 기록된다')
})
```

### `agents-as-tools.test.ts`

```typescript
describe('AgentsAsTools — F528', () => {
  it('asTool()이 ToolDefinition을 반환한다')
  it('반환된 ToolDefinition의 name은 agent_{spec.name}이다')
  it('preserve_context=true 시 이전 대화 이력이 유지된다')
  it('ToolRegistry에 등록 후 name으로 조회 가능하다')
})
```

### `steering-handler.test.ts`

```typescript
describe('SteeringHandler — F528', () => {
  it('beforeTool: 규칙 매칭 시 Interrupt를 반환한다')
  it('beforeTool: 규칙 불일치 시 Proceed를 반환한다')
  it('afterModel: 규칙 매칭 시 Guide 메시지를 반환한다')
  it('afterModel: 빈 규칙 배열 시 항상 Proceed를 반환한다')
})
```

### `conversation-manager.test.ts`

```typescript
describe('ConversationManager — F528', () => {
  it('sliding-window: maxMessages 초과 시 오래된 메시지가 제거된다')
  it('sliding-window: maxMessages 이하 시 메시지가 그대로 유지된다')
  it('sliding-window: system 역할 메시지는 제거되지 않는다')
  it('summarizing: apply() 호출 시 압축된 메시지 배열을 반환한다')
})
```

### `discovery-graph.test.ts`

```typescript
describe('DiscoveryGraph — F528', () => {
  it('9개 노드가 모두 정의되어 있다')
  it('coordinator → stage-2-0 엣지가 존재한다')
  it('stage-2-1, stage-2-2가 병렬로 실행된다')
  it('gate 조건 true: stage-2-4 → stage-2-5로 진행한다')
  it('gate 조건 false: stage-2-4 → stage-2-3으로 보완 루프를 돈다')
  it('stage-2-6, stage-2-7이 병렬로 실행된다')
  it('최종 노드 stage-2-8이 finalOutput에 담긴다')
})
```

## §9 파일 매핑 (Worker 매핑)

| 파일 | 유형 | 내용 |
|------|------|------|
| `packages/shared/src/agent-runtime.ts` | MODIFY | GraphNode, GraphEdge, GraphExecutionContext, GraphRunResult, SteeringResult, ConversationManagerOptions 추가 |
| `packages/api/src/core/agent/orchestration/graph-engine.ts` | NEW | GraphEngine 클래스 (addNode/addEdge/build/run) |
| `packages/api/src/core/agent/orchestration/agents-as-tools.ts` | NEW | agentAsTool() 유틸 (AgentRuntime 확장 패턴) |
| `packages/api/src/core/agent/orchestration/steering-handler.ts` | NEW | ConcreteSteeringHandler |
| `packages/api/src/core/agent/orchestration/conversation-manager.ts` | NEW | ConversationManager (SlidingWindow + Summarizing) |
| `packages/api/src/core/agent/orchestration/orchestration-loop-node.ts` | NEW | createOrchestrationLoopNode() 래퍼 |
| `packages/api/src/core/agent/orchestration/graphs/discovery-graph.ts` | NEW | createDiscoveryGraph() |
| `packages/api/src/core/agent/orchestration/index.ts` | NEW | barrel export |
| `packages/api/src/core/agent/runtime/agent-runtime.ts` | MODIFY | asTool() 메서드 추가 |
| `packages/api/src/core/agent/index.ts` | MODIFY | orchestration re-export |
| `packages/api/src/__tests__/services/graph-engine.test.ts` | NEW | GraphEngine 8개 테스트 |
| `packages/api/src/__tests__/services/agents-as-tools.test.ts` | NEW | AgentsAsTools 4개 테스트 |
| `packages/api/src/__tests__/services/steering-handler.test.ts` | NEW | SteeringHandler 4개 테스트 |
| `packages/api/src/__tests__/services/conversation-manager.test.ts` | NEW | ConversationManager 4개 테스트 |
| `packages/api/src/__tests__/services/discovery-graph.test.ts` | NEW | DiscoveryGraph 7개 테스트 |

**총 새 파일**: 10개 | **수정 파일**: 4개 | **예상 테스트**: 27개
