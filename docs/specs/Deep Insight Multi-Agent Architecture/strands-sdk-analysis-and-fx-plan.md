# Strands Agents SDK 상세 분석 & Foundry-X 반영 계획

> 분석일: 2026-04-13 | 분석자: Sinclair | 선행 분석: deep-insight-analysis.md

---

## Part A. Strands Agents SDK 상세 분석

### 1. 프레임워크 개요

**Strands Agents**는 AWS가 개발한 오픈소스 AI 에이전트 SDK(Python + TypeScript). 철학은 **"Write code, not pipelines"** — 복잡한 오케스트레이션 DSL 대신 시스템 프롬프트와 함수 기반 도구 정의에 집중.

- GitHub Stars: 6,100+
- 프로덕션 검증: Smartsheet, Swisscom, Eightcap 등
- 모델: 15+ 프로바이더 (Bedrock 기본, Anthropic, OpenAI, Google, Ollama 등)
- 라이선스: Apache 2.0
- 배포: AgentCore, Lambda, Fargate, EKS, Docker, Terraform

### 2. 핵심 구성 요소

#### 2.1 Agent

```python
from strands import Agent

agent = Agent(
    system_prompt="You are a data analyst.",
    tools=[calculator, file_read, shell],
    model="us.anthropic.claude-sonnet-4-20250514-v1:0"
)
result = agent("Analyze sales data")
```

- **Agent Loop**: 입력 → 모델 추론 → 도구 선택 → 도구 실행 → 결과 반영 → 반복
- **Stop Reasons**: end_turn(정상), tool_use(도구호출), max_tokens(한계), cancelled(취소), content_filtered(차단)
- **취소**: `agent.cancel()` — 스레드 안전, 멱등, 자동 초기화

#### 2.2 Tools (4가지 유형)

| 유형 | 정의 방식 | 예시 |
|------|----------|------|
| **@tool 데코레이터** | Python 함수 + docstring | `@tool def weather(location: str)` |
| **TOOL_SPEC 모듈** | JSON Schema + handler 함수 | Deep Insight의 coder_agent_tool.py 방식 |
| **MCP Tools** | MCPClient로 외부 서버 연동 | `MCPClient(lambda: sse_client(url))` |
| **Agent Tools** | 에이전트 자체를 도구로 변환 | `Agent(tools=[research_agent])` |

**도구 실행**: 기본 동시 실행(concurrent), `SequentialToolExecutor`로 순차 전환 가능.

#### 2.3 Multi-Agent Patterns (3가지)

| 패턴 | 구조 | 실행 | 순환 | 사용 시기 |
|------|------|------|------|----------|
| **Graph** | 개발자가 노드/엣지 정의 | 결정적 but 동적 (LLM이 경로 결정) | ✅ | 조건부 분기, 검증 루프 |
| **Swarm** | 에이전트 풀, 자율 인계 | 순차적 자율 | ✅ | 탐색/협업, 사건 대응 |
| **Workflow** | DAG 형식 작업 의존성 | 결정론적 병렬 | ❌ | 반복 가능 파이프라인 |

#### 2.4 Graph 상세 (Deep Insight가 사용하는 패턴)

```python
builder = GraphBuilder()
builder.add_node(coordinator, "coordinator")
builder.add_node(planner, "planner")
builder.add_node(supervisor, "supervisor")

builder.add_edge("coordinator", "planner")
builder.add_edge("planner", "reviewer",
    condition=lambda state: state.results.get("planner"))
builder.add_edge("reviewer", "supervisor",
    condition=should_proceed)

builder.set_entry_point("coordinator")
builder.set_max_node_executions(25)  # 무한 루프 방지
graph = builder.build()
```

**GraphNode 속성**: node_id, executor, dependencies, execution_status(PENDING/EXECUTING/COMPLETED/FAILED), result

**GraphEdge**: from_node, to_node, condition(선택)

**Python vs TypeScript 차이**:

| 기준 | Python | TypeScript |
|------|--------|-----------|
| 의존성 해석 | OR 의미론 (하나라도 완료되면 실행) | AND 의미론 (모든 의존성 완료 후 실행) |
| 스케줄링 | 배치 단위 이산 실행 | 개별 노드 점진적 실행 |
| 노드 상태 | 누적 유지 | 스냅샷/복원 |
| 에러 처리 | fail-fast | 병렬 경로 유지 |

**일반적 토폴로지**:
- 순차 파이프라인: A → B → C → D
- 병렬 처리: Coordinator → (Worker1 ∥ Worker2 ∥ Worker3) → Aggregator
- 분기 로직: Classifier → (Tech Branch | Biz Branch)
- 피드백 루프: Draft → Review → (revise? → Draft | approve → Publish)

#### 2.5 Agents-as-Tools (3가지 구현 방법)

**방법 1 — 에이전트 직접 전달 (가장 간단)**
```python
orchestrator = Agent(
    system_prompt="Route queries to specialists.",
    tools=[research_agent, product_agent, travel_agent]
)
```
SDK가 자동으로 `input` 파라미터 받는 도구로 변환.

**방법 2 — `.as_tool()` (커스터마이징)**
```python
research_agent.as_tool(
    name="research_assistant",
    description="Research queries.",
    preserve_context=True  # 대화 이력 유지
)
```

**방법 3 — @tool 래퍼 (최대 제어)**
```python
@tool
def research_assistant(query: str) -> str:
    """Research-related queries."""
    agent = Agent(system_prompt="...", tools=[retrieve, http_request])
    return str(agent(query))
```

#### 2.6 Steering (미들웨어 기반 행동 제어)

**핵심 성과**: 600회 평가에서 **100% 정확도** — 단순 프롬프트(82.5%), 워크플로우(80.8%) 대비 압도적.

**두 가지 Hook 지점**:

| Hook | 타입 | 반환 | 용도 |
|------|------|------|------|
| `steer_before_tool()` | Tool Steering | Proceed/Guide/Interrupt | 도구 호출 전 파라미터 검증, 순서 강제 |
| `steer_after_model()` | Model Steering | Proceed/Guide | 모델 응답 후 톤/형식 검증 |

```python
from strands.vended_plugins.steering import LLMSteeringHandler

handler = LLMSteeringHandler(system_prompt="규칙...")
agent = Agent(tools=[...], plugins=[handler])
```

**LedgerProvider**: 도구 호출 이력, 실행 시간, 성공/실패 상태 자동 추적.

**토큰 효율**: SOP 대비 66% 적은 입력토큰, Workflow 대비 47% 적은 출력토큰.

#### 2.7 Hooks (라이프사이클 이벤트)

```
BeforeInvocationEvent → BeforeModelCallEvent →
AfterModelCallEvent ⟷ BeforeToolCallEvent →
AfterToolCallEvent → AfterInvocationEvent
```

**수정 가능한 이벤트 속성**:
- `BeforeToolCallEvent`: cancel_tool, selected_tool, tool_use (파라미터 수정)
- `AfterToolCallEvent`: result (결과 수정), retry (재시도)
- `AfterModelCallEvent`: retry (재호출)
- `AfterInvocationEvent`: resume (후속 호출)

**Multi-Agent 이벤트**: BeforeNodeCallEvent, AfterNodeCallEvent, MultiAgentHandoffEvent 등

#### 2.8 스트리밍

**이벤트 계층 (Python)**:
- 라이프사이클: init_event_loop, start_event_loop, message, result
- 모델: data(텍스트 청크), delta(원본), reasoning
- 도구: current_tool_use, tool_stream_event
- 멀티에이전트: multiagent_node_start/stream/stop, multiagent_handoff, multiagent_result

**두 가지 방식**:
```python
# 비동기 반복자
async for event in agent.stream_async("query"):
    if "data" in event: print(event["data"])

# 콜백 핸들러
agent = Agent(callback_handler=handle_events)
```

#### 2.9 Conversation Management

| Manager | 전략 | 특징 |
|---------|------|------|
| NullConversationManager | 관리 안 함 | 테스트용 |
| SlidingWindowConversationManager | 슬라이딩 윈도우 | 기본값, 자동 토큰 카운팅 |
| SummarizingConversationManager | 요약 후 재시작 | Anthropic의 Compaction 기법 |

#### 2.10 Observability

- OpenTelemetry 네이티브 지원
- 라이프사이클 키 포인트마다 이벤트 방출 (Before/After Invocation, Model Call, Tool Call)
- 메트릭 수집, 트레이싱, 행동 수정 — 코어 로직 변경 없이 가능

---

## Part B. Foundry-X 현행 아키텍처 vs Strands SDK GAP 분석

### 1. 현행 Foundry-X 에이전트 인프라

| 계층 | 구현 | 핵심 F-item |
|------|------|------------|
| **타입** | `shared/src/agent.ts`, `orchestration.ts`, `plugin.ts` | — |
| **러너** | AgentRunner 인터페이스 → ClaudeApiRunner, OpenRouterRunner, McpRunner | F50 |
| **전문 에이전트** | Architect, Planner, Reviewer, Test, Security, QA, Infra (7종) | F70, F217 |
| **어댑터** | AgentAdapterFactory — Runner를 OrchestrationLoop 호환으로 변환 | F336 |
| **오케스트레이션** | OrchestrationLoop — 3모드(retry/adversarial/fix) 피드백 루프 | F335 |
| **병렬 실행** | ParallelExecution + MergeQueue + ConflictReport | F68 |
| **인박스** | AgentInbox — agent간 메시지 (task_assign/result/feedback) | F71 |
| **마켓플레이스** | AgentMarketplace — 에이전트 공유/레이팅 | F51 |
| **플러그인** | PluginManifest — hooks(agent:before-run, agent:after-run 등) + slots | — |

### 2. Strands SDK 패턴 ↔ Foundry-X 매핑

| Strands 패턴 | FX 대응물 | 일치도 | GAP |
|-------------|----------|-------|-----|
| **Agent class** | AgentRunner 인터페이스 | 60% | FX는 Runner가 추상 — 실제 loop는 외부(Claude API)에 위임 |
| **@tool decorator** | 없음 (서비스 메서드 직접 호출) | 10% | **핵심 GAP**: 도구 정의 표준이 없음 |
| **Graph** | OrchestrationLoop (3모드) | 40% | FX는 피드백 루프만 — Graph의 DAG/순환/분기 미지원 |
| **Agents-as-Tools** | AgentAdapter + 전문에이전트 7종 | 50% | 에이전트를 도구로 래핑하는 패턴은 유사하나, 자동 변환 없음 |
| **Swarm** | AgentInbox (메시지 기반) | 20% | 자율 인계(handoff) 미구현 |
| **Steering** | PluginHookEvent (before-run/after-run) | 30% | **핵심 GAP**: LedgerProvider/Steer Action(Proceed/Guide/Interrupt) 없음 |
| **Hooks** | PluginHookEvent 5종 | 40% | 이벤트 수정(cancel_tool, retry 등) 미지원 |
| **Streaming** | 없음 (REST 응답만) | 0% | **핵심 GAP**: 에이전트 스트리밍 미구현 |
| **ConversationManager** | 없음 | 0% | **핵심 GAP**: 컨텍스트 관리 전략 없음 |
| **Observability** | 없음 (D1 로그만) | 10% | OpenTelemetry/토큰 추적 미구현 |
| **MCP Integration** | McpRunner + McpServerInfo | 60% | 이미 MCP 연동 기반 있음 |

### 3. 핵심 GAP 요약 (우선순위 순)

| 순위 | GAP | 영향도 | 난이도 | 대응 |
|------|-----|-------|-------|------|
| **G1** | Tool Definition 표준 없음 | 🔴 Critical | Medium | `@tool` 데코레이터 → TS `defineTool()` 도입 |
| **G2** | Graph 기반 워크플로우 없음 | 🔴 Critical | High | FX GraphBuilder TS 구현 |
| **G3** | 에이전트 스트리밍 없음 | 🟡 High | Medium | WebSocket + SSE 에이전트 이벤트 |
| **G4** | Steering/행동 제어 없음 | 🟡 High | Medium | SteeringHandler 패턴 TS 포팅 |
| **G5** | ConversationManager 없음 | 🟡 High | Low | SlidingWindow + Summarizing 도입 |
| **G6** | Observability 없음 | 🟠 Medium | Low | OpenTelemetry 통합 |
| **G7** | Swarm(자율 인계) 미구현 | 🟠 Medium | High | AgentInbox → Handoff 확장 |

---

## Part C. Foundry-X Phase 34~36 반영 계획 (v2)

> 기존 F510~F516(2026-04-12) + Deep Insight 분석(2026-04-13) + Strands SDK 분석(2026-04-13) 종합

### Phase 34: 에이전트 오케스트레이션 기반 (Sprint 262~266)

#### F510: 멀티에이전트 세션 표준화 → **F510-v2: Agent Graph Engine**

**목표**: Strands SDK의 Graph 패턴을 TS로 구현하여 Foundry-X의 에이전트 오케스트레이션 근간 확립

**REQ 후보**:

| REQ | 내용 | Strands 참조 | 구현 |
|-----|------|-------------|------|
| REQ-510-01 | `defineTool()` 유틸리티 — TS 도구 정의 표준 | `@tool` decorator | `shared/src/tool-def.ts` |
| REQ-510-02 | GraphNode 타입 — id, executor, dependencies, status, result | GraphNode class | `shared/src/graph.ts` |
| REQ-510-03 | GraphEdge 타입 — from, to, condition(optional) | GraphEdge class | `shared/src/graph.ts` |
| REQ-510-04 | GraphBuilder API — addNode, addEdge, setEntryPoint, setMaxExecutions, build | GraphBuilder | `api/src/core/agent/services/graph-builder.ts` |
| REQ-510-05 | 조건부 라우팅 — 엣지에 condition 함수 부착 | conditional edges | GraphBuilder 내 |
| REQ-510-06 | 최대 실행 횟수 제한 — 노드/전체 레벨 | set_max_node_executions(25) | GraphBuilder 옵션 |
| REQ-510-07 | 현행 OrchestrationLoop를 Graph 노드로 래핑 | — | backward compat |

**Sprint 계획**:
- S262: REQ-510-01~03 (타입 + defineTool)
- S263: REQ-510-04~06 (GraphBuilder + 조건부 라우팅)
- S264: REQ-510-07 (OrchestrationLoop 마이그레이션) + 테스트

#### F511: Work Management → Agent 할당 → **F511-v2: Agents-as-Tools Pattern**

**목표**: 전문 에이전트 7종을 도구로 자동 변환하여 Supervisor가 호출할 수 있는 구조

**REQ 후보**:

| REQ | 내용 | Strands 참조 |
|-----|------|-------------|
| REQ-511-01 | `AgentTool` 래퍼 — Agent → Tool 자동 변환 | `agent.as_tool()` |
| REQ-511-02 | Supervisor 에이전트 — 전문 에이전트를 도구로 호출 | Deep Insight Supervisor |
| REQ-511-03 | preserve_context 옵션 — 에이전트 대화 이력 유지/초기화 선택 | `preserve_context=True` |
| REQ-511-04 | 에이전트별 모델 분리 — .env 또는 D1 설정으로 에이전트마다 다른 모델 | Deep Insight `.env` |

**Sprint 계획**:
- S265: REQ-511-01~02 (AgentTool + Supervisor)
- S266: REQ-511-03~04 (컨텍스트 관리 + 모델 분리) + 통합 테스트

#### F512: WebSocket 에이전트 활동 스트리밍 → **F512-v2: Agent Event Streaming**

**목표**: Strands SDK의 이벤트 계층을 FX에 도입, 실시간 에이전트 활동 스트리밍

**REQ 후보**:

| REQ | 내용 | Strands 참조 |
|-----|------|-------------|
| REQ-512-01 | AgentEvent 타입 체계 — lifecycle, model, tool, multiagent 4계층 | Strands event types |
| REQ-512-02 | WebSocket 엔드포인트 — /ws/agent/:sessionId | — |
| REQ-512-03 | TokenTracker — 에이전트별 입력/출력/캐시 토큰 추적 | Deep Insight TokenTracker |
| REQ-512-04 | SSE 폴백 — WebSocket 불가 환경용 | Strands SSE filter |
| REQ-512-05 | Web 실시간 대시보드 — 에이전트 상태/토큰/진행률 | Deep Insight Ops Dashboard |

**Sprint 계획**: S266 (F511과 병행, 이벤트 인프라는 독립적)

### Phase 35: 에이전트 지능 고도화 (Sprint 267~269)

#### F513: 스킬 복합화 엔진 → **F513-v2: Steering & Conversation Management**

**목표**: Strands SDK의 Steering(행동 제어)과 ConversationManager(컨텍스트 관리)를 FX에 도입

**REQ 후보**:

| REQ | 내용 | Strands 참조 |
|-----|------|-------------|
| REQ-513-01 | SteeringHandler 인터페이스 — steerBeforeTool, steerAfterModel | Steering plugin |
| REQ-513-02 | SteeringAction 타입 — Proceed, Guide(메시지 주입), Interrupt | ToolSteeringAction |
| REQ-513-03 | LedgerProvider — 도구 호출 이력 자동 추적 | LedgerProvider |
| REQ-513-04 | SlidingWindowManager — 슬라이딩 윈도우 컨텍스트 관리 | SlidingWindowConversationManager |
| REQ-513-05 | SummarizingManager — Compaction(요약 후 재시작) | SummarizingConversationManager |
| REQ-513-06 | 현행 PluginHookEvent 확장 — cancel_tool, retry 속성 추가 | Hooks event modification |

**Sprint 계획**:
- S267: REQ-513-01~03 (Steering 기반)
- S268: REQ-513-04~06 (Conversation + Hook 확장)

#### F514: 스킬 추천 + 자동 적용 → **F514-v2: Agent Observability**

**목표**: OpenTelemetry 기반 에이전트 관측성 도입

**REQ 후보**:

| REQ | 내용 | Strands 참조 |
|-----|------|-------------|
| REQ-514-01 | OpenTelemetry 트레이싱 — 에이전트 호출 span | Observability |
| REQ-514-02 | 에이전트 메트릭 수집 — latency, token usage, error rate | — |
| REQ-514-03 | Prompt Cache 전략 — 반복 호출 에이전트만 캐시 활성화 | Deep Insight cache |
| REQ-514-04 | 출력 토큰 캡 — 에이전트별 maxOutputTokens 설정 | Validator(800)/Reporter(1000) |

**Sprint 계획**: S269

### Phase 36: 자율 코딩 루프 (Sprint 270~272)

#### F515: AI Assisted Merge → 유지 (변경 없음)

#### F516: SDD 기반 자율 코딩 루프 PoC → **F516-v2: SDD Graph Pipeline**

**목표**: Graph 패턴 위에 SDD Triangle(Spec→Code→Test)을 구현한 자율 코딩 파이프라인

**REQ 후보**:

| REQ | 내용 | Deep Insight 참조 |
|-----|------|-----------------|
| REQ-516-01 | SDD Graph 정의 — Planner→Coder→Tester→Reviewer 노드 | Coordinator→Planner→Supervisor→Tools |
| REQ-516-02 | PlanReviewer HITL — 계획 승인 노드 (Human-in-the-Loop) | PlanReviewer node |
| REQ-516-03 | 피드백 루프 — Reviewer → Coder 수정 순환 (max 10회) | Graph feedback loop |
| REQ-516-04 | Self-Contained Execution — 각 노드 독립 실행, 파일 기반 결과 전달 | pickle cache 패턴 |
| REQ-516-05 | Structured Note-Taking — SPEC.md 자동 업데이트 | all_results.txt 패턴 |
| REQ-516-06 | 모델 혼합 전략 — Planner(Opus), Coder(Sonnet), Reviewer(Sonnet) | 역할별 모델 배치 |

**Sprint 계획**:
- S270: F515 (AI Assisted Merge)
- S271: REQ-516-01~03 (SDD Graph + HITL + 루프)
- S272: REQ-516-04~06 (Self-Contained + Notes + 모델 혼합) + E2E 테스트

---

## Part D. 구현 전략: "Strands-Inspired, Cloudflare-Native"

### 원칙

Strands SDK를 **직접 사용하지 않는다** (Python SDK, Bedrock 종속). 대신 Strands의 아키텍처 패턴을 Foundry-X의 기술 스택(TypeScript + Cloudflare Workers + D1)에 맞게 **TS 네이티브로 재구현**한다.

### 왜 직접 사용하지 않나?

| 이유 | 상세 |
|------|------|
| **언어** | Strands는 Python 우선 — FX는 TS 모노리포 |
| **런타임** | Strands는 Bedrock + Fargate — FX는 Cloudflare Workers |
| **DB** | Strands는 DynamoDB — FX는 D1(SQLite) |
| **기존 인프라** | FX에 이미 AgentRunner, OrchestrationLoop, PluginSystem 존재 |

### 무엇을 가져오나?

| 패턴 | 가져오는 것 | 가져오지 않는 것 |
|------|-----------|---------------|
| **Graph** | GraphBuilder API, Node/Edge 타입, 조건부 라우팅, 토폴로지 패턴 | Python 구현체 |
| **Agents-as-Tools** | AgentTool 래퍼, preserve_context, 자동 변환 | A2A 프로토콜 (원격 에이전트) |
| **Steering** | Handler 인터페이스, Steer Action, Ledger | LLM-based Steering (FX는 규칙 기반 우선) |
| **Streaming** | 이벤트 타입 체계, SSE 필터 | Python async iterator |
| **Conversation** | Sliding Window + Summarizing 전략 | NullManager (테스트용만) |

### 구현 우선순위 매트릭스

```
Impact (높음→)
  ▲
  │  [F514]          [F513]        [F516]
  │  Observability    Steering      SDD Graph
  │                                 Pipeline
  │  [F512]          [F511]        [F510]
  │  Streaming       Agent-as-Tool  Graph Engine
  │
  └──────────────────────────────────────►
                                    Effort (높음→)
```

**Critical Path**: F510(Graph) → F511(Agent-as-Tool) → F516(SDD Graph)
**병렬 가능**: F512(Streaming) ∥ F513(Steering) ∥ F514(Observability)

---

## Part E. 타임라인 요약

```
Phase 34 (S262~S266) — 에이전트 오케스트레이션 기반
├── S262: F510 타입 + defineTool()
├── S263: F510 GraphBuilder + 조건부 라우팅
├── S264: F510 OrchestrationLoop 마이그레이션
├── S265: F511 AgentTool + Supervisor
└── S266: F511 컨텍스트/모델 + F512 이벤트 스트리밍

Phase 35 (S267~S269) — 에이전트 지능 고도화
├── S267: F513 Steering 기반
├── S268: F513 Conversation + Hook 확장
└── S269: F514 Observability + Prompt Cache

Phase 36 (S270~S272) — 자율 코딩 루프
├── S270: F515 AI Assisted Merge
├── S271: F516 SDD Graph + HITL + 루프
└── S272: F516 Self-Contained + E2E
```

**총 11 Sprint, ~3개월 (주 1 Sprint 기준)**

---

## Sources

- [Strands Agents SDK 공식 사이트](https://strandsagents.com/)
- [Graph Multi-Agent Pattern](https://strandsagents.com/docs/user-guide/concepts/multi-agent/graph/)
- [Agents as Tools](https://strandsagents.com/docs/user-guide/concepts/multi-agent/agents-as-tools/)
- [Multi-Agent Patterns](https://strandsagents.com/docs/user-guide/concepts/multi-agent/multi-agent-patterns/)
- [Tools](https://strandsagents.com/docs/user-guide/concepts/tools/)
- [Steering](https://strandsagents.com/docs/user-guide/concepts/plugins/steering/)
- [Agent Loop](https://strandsagents.com/docs/user-guide/concepts/agents/agent-loop/)
- [Hooks](https://strandsagents.com/docs/user-guide/concepts/agents/hooks/)
- [Steering 100% Accuracy Blog](https://strandsagents.com/blog/steering-accuracy-beats-prompts-workflows/)
- [Deep Insight 분석 (선행)](docs/research/deep-insight-analysis.md)
