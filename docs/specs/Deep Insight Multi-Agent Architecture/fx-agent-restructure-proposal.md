# Foundry-X 에이전트 아키텍처 완전 재구조화 제안

> **RFC-2026-04-13** | 분석 소스: Claude Managed Agents, Meta HyperAgents, Deep Insight, Strands SDK
> 선행 분석: deep-insight-analysis.md, strands-sdk-analysis-and-fx-plan.md

---

## 0. 왜 완전 재구조화인가?

### 업계 패러다임 전환 (2026.Q1~Q2)

| 발표 | 핵심 메시지 | Foundry-X 시사점 |
|------|-----------|----------------|
| **Claude Managed Agents** (2026-04-08) | "인프라를 우리가 관리할 테니, 에이전트 로직에만 집중하라" — 10x faster to production | FX의 인프라 레이어(Workers, D1)는 이미 있지만, **에이전트 정의/실행/관측 표준**이 없음 |
| **Meta HyperAgents** (2026-03) | "에이전트가 자신의 하네스를 스스로 엔지니어링한다" — 수백 회 반복 후 persistent memory, performance tracking, evaluation pipeline을 독립적으로 발명 | FX에 **자기개선 루프**가 부분적(AgentSelfReflection, FeedbackLoop)이지만 **메타 수준 자기수정**이 없음 |
| **Strands SDK** (2025~) | "Write code, not pipelines" — Graph/Steering/Agents-as-Tools 패턴 정립 | FX에 **도구 정의 표준, Graph, Steering** 없음 |
| **Deep Insight** (2026-04) | 3-Tier 계층 + Prompt Cache + Context Engineering 실전 적용 | FX에 **에이전트별 모델 분리, 컨텍스트 관리** 없음 |

### 현행 FX의 근본 문제

FX는 33개 Phase에 걸쳐 에이전트 기능을 **점진적으로 추가**해왔다. 결과적으로:

1. **에이전트 정의가 분산됨**: 7개 전문 에이전트가 각자 다른 패턴으로 구현 (ArchitectAgent, PlannerAgent, ReviewerAgent...)
2. **도구 정의 표준이 없음**: 서비스 메서드 직접 호출 — `@tool` 같은 선언적 패턴 부재
3. **오케스트레이션이 피드백 루프에 한정됨**: OrchestrationLoop(retry/adversarial/fix) — Graph 기반 DAG/분기/루프 미지원
4. **관측성이 D1 로그에만 의존**: 실시간 스트리밍, 토큰 추적, OpenTelemetry 없음
5. **자기개선이 프롬프트 힌트 수준**: AgentSelfReflection이 score/suggestions만 생성 — 하네스 자체를 수정하지 못함

**→ Phase 34에서 패턴을 추가하는 것보다, 에이전트 레이어 전체를 재설계하는 것이 장기적으로 유리.**

---

## 1. Claude Managed Agents 분석

### 아키텍처

```
[ Agent Definition (YAML / Natural Language / SDK) ]
              │
              ▼
┌─────────────────────────────┐
│   Claude Managed Runtime    │
│  ┌───────┐  ┌───────────┐  │
│  │Sandbox│  │Long Session│  │
│  │(Code) │  │(Persist)  │  │
│  └───────┘  └───────────┘  │
│  ┌───────┐  ┌───────────┐  │
│  │ Tools │  │ Guardrails│  │
│  │(MCP)  │  │(Scoped)   │  │
│  └───────┘  └───────────┘  │
│  ┌───────────────────────┐  │
│  │  Observability        │  │
│  │  (Session Tracing)    │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
              │
     $0.08/session-hour + token costs
```

### 핵심 기능

| 기능 | 상태 | 내용 |
|------|------|------|
| **Sandboxed Execution** | GA Beta | 권한 제한 환경에서 코드/명령/웹 실행 |
| **Long-Running Sessions** | GA Beta | 연결 끊어도 진행, 체크포인팅 |
| **Scoped Permissions** | GA Beta | 도구별 권한 제한 |
| **Session Tracing** | GA Beta | 콘솔 기반 관측성 |
| **CI/CD** | GA Beta | 버전 관리, 환경 승격 |
| **Multi-Agent Coordination** | Research Preview | 에이전트가 다른 에이전트 생성/지시 |
| **Self-Evaluation & Iteration** | Research Preview | 성공 기준 달성까지 자동 반복 |

### FX에 대한 시사점

CMA의 핵심 가치는 **"인프라 추상화"**. FX는 이미 Cloudflare Workers로 인프라를 소유하고 있으므로 CMA를 직접 쓸 필요는 없지만, **에이전트 정의 → 런타임 → 관측 파이프라인**의 깔끔한 분리를 배워야 함.

특히 **Self-Evaluation & Iteration** (Research Preview)이 FX의 OrchestrationLoop와 유사하지만, CMA는 "성공 기준을 사용자가 선언적으로 정의"하고 런타임이 자동 반복하는 구조 — FX보다 선언적.

---

## 2. Meta HyperAgents 분석

### 핵심 개념: Self-Referential Agent

```
┌─────────────────────────────────────┐
│           HyperAgent                │
│                                     │
│  ┌──────────┐    ┌──────────────┐  │
│  │Task Agent│◄───│  Meta Agent  │  │
│  │(작업해결) │    │(자기+작업수정)│  │
│  └──────────┘    └──────┬───────┘  │
│                         │          │
│                   ┌─────▼──────┐   │
│                   │  Editable  │   │
│                   │  Codebase  │   │
│                   │ (하네스+코드)│   │
│                   └────────────┘   │
└─────────────────────────────────────┘
         │
    반복 (수백 회)
         │
         ▼
   자율적으로 발현되는 하네스:
   ✓ Persistent Memory
   ✓ Performance Tracking
   ✓ Multi-Stage Evaluation
   ✓ Decision Protocols
   ✓ Domain Knowledge Base
   ✓ Retry & Self-Correction
```

### DGM-H 프레임워크 실험 결과

| 도메인 | 발현된 하네스 | 수치 |
|--------|------------|------|
| **올림피아드 수학 채점** | 메모리, 성능 추적 | improvement@50: **0.630** (baseline DGM: 0.0) |
| **논문 검토** | 다단계 파이프라인, 의사결정 프로토콜 | 0.0 → **0.710** (CI: 0.590–0.750) |
| **로봇 공학** | 도메인 지식 기반, 컨텍스트 엔지니어링 | **0.372** (vs DGM w/o self-improve: 0.213) |
| **코딩** | 메모리, 검증, 모듈화 | — |

### 핵심 통찰 (FX 관점)

> **"하네스는 단순한 개발자 편의 사항이 아니라 에이전트 시스템의 수렴적 아키텍처다."**

에이전트에게 자유도를 주면, 도메인에 관계없이 동일한 6가지 하네스 컴포넌트를 독립적으로 재발명한다:

1. **Tool Integration** — 도구 등록 및 실행
2. **Memory & State** — 단계별 결과 영속성
3. **Context Engineering** — 프롬프트 동적 조립
4. **Planning** — 복잡한 작업 분해
5. **Verification** — 규칙 기반 검증
6. **Modularity** — 컴포넌트 독립적 토글

**→ FX의 에이전트 프레임워크가 이 6가지를 "공식 레이어"로 제공하면, 에이전트가 그 위에서 자기개선 가능.**

---

## 3. Foundry-X 완전 재구조화 제안: "HyperFX"

### 3.1 설계 철학

```
기존 FX:  "Git이 진실, FX는 렌즈"  (읽기/분석/동기화 레이어)
                    ↓
HyperFX:  "Agent가 진화, FX는 하네스"  (에이전트 정의/실행/자기개선 플랫폼)
```

**3가지 원칙**:
1. **선언적 에이전트 정의**: YAML/TS로 에이전트 역할·도구·제약·평가기준을 선언
2. **자기진단 내장**: 모든 에이전트가 자기 성능을 측정하고, 개선 방향을 제안
3. **메타 에이전트**: 에이전트의 프롬프트·도구·워크플로우를 자동 최적화하는 상위 에이전트

### 3.2 새 아키텍처: 4-Layer Agent Stack

```
┌─────────────────────────────────────────────────┐
│              Layer 4: Meta Layer                 │
│  MetaAgent — 하네스 자체를 진화시키는 자기참조 루프   │
│  • 프롬프트 최적화 (A/B 테스트)                    │
│  • 도구 조합 최적화                               │
│  • 워크플로우 그래프 재구성 제안                    │
│  • 모델 선택 최적화                               │
└──────────────────────┬──────────────────────────┘
                       │ 수정 제안 → Human Approval
┌──────────────────────▼──────────────────────────┐
│              Layer 3: Orchestration Layer         │
│  GraphEngine — DAG/순환/분기 기반 워크플로우 실행    │
│  • GraphBuilder API (addNode, addEdge, condition) │
│  • Agents-as-Tools (에이전트를 도구로 호출)          │
│  • SteeringHandler (before-tool, after-model)     │
│  • ConversationManager (Sliding/Summarizing)      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Layer 2: Agent Layer                 │
│  AgentRuntime — 에이전트 정의/실행/관측 통합 런타임   │
│  • Agent Definition (YAML + TS AgentSpec)        │
│  • Tool Registry (defineTool, MCP, Agent-as-Tool)│
│  • Agent Loop (추론→도구→결과→반복, Stop Reasons)  │
│  • Hooks (Before/After Model/Tool/Invocation)     │
│  • TokenTracker + Prompt Cache                   │
│  • Session Persistence + Checkpointing           │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Layer 1: Infrastructure Layer        │
│  Cloudflare Workers + D1 + KV + Durable Objects  │
│  • Sandbox Execution (Workers Isolate)           │
│  • Event Streaming (WebSocket + SSE)             │
│  • Observability (OpenTelemetry → D1/R2)         │
│  • Auth (JWT + RBAC + SSO)                       │
└─────────────────────────────────────────────────┘
```

### 3.3 Layer 2: Agent Definition (선언적 에이전트)

**기존**: 7개 전문 에이전트가 각자 다른 패턴으로 하드코딩
**신규**: 모든 에이전트를 통일된 AgentSpec으로 선언

```yaml
# agents/planner.agent.yaml
apiVersion: fx/v1
kind: Agent
metadata:
  name: planner
  description: "코드 변경 계획 수립 전문 에이전트"
  
spec:
  model:
    primary: claude-sonnet-4         # 기본 모델
    fallback: claude-haiku-4         # 폴백
    promptCache: true                # 반복 호출 → 캐시 활성화
    maxOutputTokens: 2000            # 출력 토큰 캡

  systemPrompt: ./prompts/planner.md # 마크다운 파일 분리 (Deep Insight 패턴)

  tools:                             # 사용 가능한 도구
    - name: spec_reader
      ref: builtin/spec-reader
    - name: code_analyzer
      ref: builtin/code-analyzer
    - name: architect_agent          # Agent-as-Tool
      ref: agent/architect
      preserveContext: false

  steering:                          # Steering 규칙 (Strands 패턴)
    beforeTool:
      - rule: "spec_reader must be called before code_analyzer"
        action: guide
      - rule: "max 5 tool calls per plan"
        action: interrupt
    afterModel:
      - rule: "output must be valid markdown with ## Steps"
        action: guide

  evaluation:                        # 자기 평가 기준 (CMA 패턴)
    successCriteria:
      - "plan has at least 3 steps"
      - "each step has estimated effort"
      - "dependencies are explicitly stated"
    maxRetries: 3
    convergenceScore: 0.8

  constraints:                       # 제약 (기존 AgentProfile.constraint)
    - tier: never
      rule: "never modify SPEC.md directly"
    - tier: ask
      rule: "require approval for plans > 5 steps"
```

**핵심 혁신**: 
- 에이전트 정의가 **코드가 아니라 스펙**
- 프롬프트, 도구, 제약, 평가 기준이 한 파일에 선언
- MetaAgent가 이 YAML을 읽고 수정 제안 가능

### 3.4 Layer 2: Tool Registry (통일된 도구 정의)

```typescript
// packages/shared/src/tool-def.ts

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  outputSchema?: ZodSchema;
  category: 'builtin' | 'mcp' | 'agent' | 'custom';
  permissions: ('file:read' | 'file:write' | 'network' | 'shell' | 'db')[];
}

// 데코레이터 패턴 (Strands @tool 영감)
export function defineTool<I, O>(spec: ToolSpec, handler: (input: I) => Promise<O>): Tool {
  return { spec, handler, metrics: new ToolMetrics() };
}

// 사용 예시
const specReader = defineTool({
  name: 'spec_reader',
  description: 'Read and parse SPEC.md sections',
  inputSchema: z.object({ section: z.string().optional() }),
  category: 'builtin',
  permissions: ['file:read'],
}, async ({ section }) => {
  // 구현
});
```

### 3.5 Layer 3: GraphEngine (워크플로우 오케스트레이션)

```typescript
// packages/api/src/core/agent/engine/graph-engine.ts

// SDD Triangle을 Graph로 표현
const sddGraph = new GraphBuilder()
  .addNode('planner', plannerAgent)          // 계획 수립
  .addNode('plan_review', humanReview)       // HITL 승인
  .addNode('coder', coderAgent)              // 코드 생성
  .addNode('tester', testAgent)              // 테스트 생성/실행
  .addNode('reviewer', reviewerAgent)        // 코드 리뷰
  .addNode('meta', metaAgent)               // 자기개선 분석

  .addEdge('planner', 'plan_review')
  .addEdge('plan_review', 'coder', {
    condition: (state) => state.results.plan_review?.approved === true
  })
  .addEdge('plan_review', 'planner', {       // 거절 → 재계획
    condition: (state) => state.results.plan_review?.approved === false
  })
  .addEdge('coder', 'tester')
  .addEdge('tester', 'reviewer', {
    condition: (state) => state.results.tester?.allPassed === true
  })
  .addEdge('tester', 'coder', {              // 테스트 실패 → 코드 수정
    condition: (state) => state.results.tester?.allPassed === false
  })
  .addEdge('reviewer', 'meta')               // 리뷰 완료 → 메타 분석

  .setEntryPoint('planner')
  .setMaxNodeExecutions(20)
  .build();
```

### 3.6 Layer 4: MetaAgent (자기진화 — HyperAgents 영감)

**핵심**: 에이전트가 자신의 하네스를 개선하되, **인간 승인 필수**.

```
MetaAgent 루프:
1. 실행 이력 수집 (토큰, 시간, 품질 점수, 실패 패턴)
2. 진단 (어떤 에이전트가 어디서 병목/실패?)
3. 개선 제안 생성 (프롬프트 수정, 도구 조합 변경, 모델 변경, 워크플로우 재구성)
4. A/B 평가 (현행 vs 제안을 동일 태스크로 비교)
5. Human Approval → 적용 or 폐기
```

**자기진단 6가지 축** (HyperAgents의 발현 패턴에서 도출):

| 축 | 진단 질문 | 자동 메트릭 | 개선 액션 |
|---|----------|-----------|---------|
| **1. Tool Effectiveness** | "어떤 도구가 자주 실패하는가?" | tool_error_rate, avg_latency | 도구 교체/파라미터 조정 제안 |
| **2. Memory Efficiency** | "컨텍스트가 효율적으로 사용되는가?" | context_utilization, cache_hit_rate | Compaction 전략 조정, 프롬프트 압축 |
| **3. Planning Quality** | "계획이 실행 가능한가?" | plan_execution_rate, step_skip_rate | 계획 템플릿 개선, 분해 전략 변경 |
| **4. Verification Coverage** | "검증이 충분한가?" | false_positive_rate, missed_bugs | 검증 파이프라인 단계 추가/제거 |
| **5. Cost Efficiency** | "토큰이 낭비되는가?" | tokens_per_task, cost_per_quality | 모델 다운그레이드, 출력 토큰 캡 조정 |
| **6. Convergence Speed** | "몇 라운드만에 수렴하는가?" | avg_rounds_to_converge | convergence 기준 조정, 피드백 형식 개선 |

```typescript
// packages/api/src/core/agent/engine/meta-agent.ts

interface DiagnosticReport {
  agentName: string;
  period: { from: string; to: string };
  metrics: {
    toolEffectiveness: { errorRate: number; avgLatency: number };
    memoryEfficiency: { contextUtilization: number; cacheHitRate: number };
    planningQuality: { executionRate: number; stepSkipRate: number };
    verificationCoverage: { falsePositiveRate: number; missedBugs: number };
    costEfficiency: { tokensPerTask: number; costPerQuality: number };
    convergenceSpeed: { avgRounds: number; avgDuration: number };
  };
  suggestions: ImprovementSuggestion[];
}

interface ImprovementSuggestion {
  type: 'prompt_edit' | 'tool_change' | 'model_change' | 'graph_restructure' | 'param_tune';
  target: string;           // e.g., "agents/planner.agent.yaml"
  description: string;
  expectedImpact: string;
  diff?: string;            // YAML diff
  requiresApproval: true;   // 항상 인간 승인 필요
}
```

### 3.7 Agent Role Framework (역할 체계 정리)

**기존**: 7개 전문 에이전트 + AgentAdapter(generator/discriminator/orchestrator)
**신규**: 4-Tier 역할 체계

```
Tier 0: MetaAgent (1개)
  └─ 자기진단, 하네스 최적화, A/B 평가
  └─ 모델: Claude Opus (최고 추론)

Tier 1: Orchestrator Agents (2개)
  ├─ Coordinator — 요청 분류, 간단한 건 직접 처리
  └─ Supervisor — Graph 실행 조율, 도구 에이전트 호출
  └─ 모델: Claude Sonnet (비용/품질 균형)

Tier 2: Specialist Agents (7개, 기존 유지 + 표준화)
  ├─ Planner — 코드 변경 계획 수립
  ├─ Architect — 아키텍처 분석/설계 리뷰
  ├─ Coder — 코드 생성/수정
  ├─ Tester — 테스트 생성/실행
  ├─ Reviewer — PR 리뷰/품질 평가
  ├─ Security — 보안 취약점 검증
  └─ Reporter — 분석 리포트/문서 생성
  └─ 모델: Claude Sonnet (Coder, Reviewer) / Haiku (Security, Reporter)

Tier 3: Utility Agents (3개, 신규)
  ├─ Tracker — 진행률 체크리스트 관리
  ├─ Validator — 수치/로직 검증, citation 생성
  └─ ContextManager — Compaction, 메모리 관리
  └─ 모델: Claude Haiku (저비용)
```

### 3.8 자기개선 루프 (Improvement Cycle)

```
                    ┌─────────────────┐
                    │    태스크 실행    │
                    │  (Graph Pipeline) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  결과 기록       │
                    │  (D1 + metrics)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  MetaAgent 진단  │
                    │  (6축 분석)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  개선 제안 생성   │
                    │  (YAML diff)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  A/B 평가       │
                    │  (동일 태스크)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Human Approval  │
                    │  (Web UI 또는    │
                    │   CLI confirm)   │
                    └────────┬────────┘
                        ┌────┴────┐
                    승인 │        │ 거부
                        ▼        ▼
                    적용/배포   폐기/기록
```

**FX의 O-G-D Loop와의 관계**:
- O-G-D Loop = **Tier 2 내부**의 코드 품질 루프 (Observe → Generate → Discriminate)
- 자기개선 루프 = **Tier 0 MetaAgent**의 하네스 품질 루프
- 두 루프는 독립적으로 동작하지만, MetaAgent가 O-G-D Loop의 성능도 진단

---

## 4. 마이그레이션 전략: "Big Bang" 아닌 "Inside-Out"

기존 33 Phase의 코드를 버리지 않고, 안에서 밖으로 리팩터링.

### Phase 34: Foundation (S262~S266) — Layer 1~2 구축

| Sprint | 작업 | 산출물 |
|--------|------|-------|
| S262 | `AgentSpec` YAML 스키마 + `defineTool()` | `shared/src/agent-spec.ts`, `shared/src/tool-def.ts` |
| S263 | `AgentRuntime` — AgentLoop + Hooks + TokenTracker | `api/src/core/agent/engine/runtime.ts` |
| S264 | 기존 7개 전문 에이전트를 YAML AgentSpec으로 마이그레이션 | `agents/*.agent.yaml` + `prompts/*.md` |
| S265 | `ToolRegistry` + Agent-as-Tool 래퍼 | `api/src/core/agent/engine/tool-registry.ts` |
| S266 | WebSocket 이벤트 스트리밍 + Web 대시보드 | `api/src/ws/`, `web/src/routes/agent-live.tsx` |

### Phase 35: Orchestration (S267~S269) — Layer 3 구축

| Sprint | 작업 | 산출물 |
|--------|------|-------|
| S267 | `GraphEngine` — GraphBuilder + Node/Edge + 조건부 라우팅 | `api/src/core/agent/engine/graph-engine.ts` |
| S268 | `SteeringHandler` + `ConversationManager` | `api/src/core/agent/engine/steering.ts`, `conversation.ts` |
| S269 | 기존 OrchestrationLoop(F335)를 GraphEngine 노드로 래핑 + SDD Graph 정의 | backward compat 완료 |

### Phase 36: Self-Improvement (S270~S273) — Layer 4 구축

| Sprint | 작업 | 산출물 |
|--------|------|-------|
| S270 | `DiagnosticCollector` — 6축 메트릭 자동 수집 | `api/src/core/agent/engine/diagnostics.ts` |
| S271 | `MetaAgent` — 진단 → 제안 생성 → YAML diff | `agents/meta.agent.yaml`, `api/src/core/agent/engine/meta-agent.ts` |
| S272 | A/B 평가 프레임워크 + Human Approval UI | `api/src/core/agent/engine/ab-eval.ts`, `web/src/routes/meta-review.tsx` |
| S273 | E2E 통합 테스트 — SDD Graph + MetaAgent 1사이클 완주 | 전체 파이프라인 검증 |

### 기존 코드 재사용 매핑

| 기존 코드 | 역할 | 재구조화 후 위치 |
|----------|------|---------------|
| OrchestrationLoop (F335) | 피드백 루프 | GraphEngine의 **루프 노드**로 래핑 |
| AgentAdapterFactory (F336) | Runner→Adapter | AgentRuntime의 **모델 프로바이더**로 흡수 |
| AgentSelfReflection (F148) | 자가 평가 | DiagnosticCollector의 **에이전트 레벨 메트릭** 소스 |
| AgentFeedbackLoopService (F150) | 피드백 저장 | MetaAgent의 **입력 데이터** |
| PluginHookEvent | Hook 이벤트 | AgentRuntime Hooks로 **확장** (cancel_tool, retry 등) |
| 7개 전문 에이전트 | 전문가 역할 | **YAML AgentSpec으로 선언적 전환**, 로직은 Tool로 추출 |

---

## 5. 핵심 차별화: 왜 "HyperFX"인가?

| 비교 대상 | 접근 | FX 차별점 |
|----------|------|----------|
| **CMA** | 인프라 위탁 (Anthropic 클라우드) | FX는 **자체 인프라 소유** (CF Workers) — 락인 없음 |
| **Strands** | Python SDK (Bedrock 종속) | FX는 **TS 네이티브** — 웹+CLI+API 통합 모노리포 |
| **Deep Insight** | 데이터 분석 특화 | FX는 **BD 라이프사이클 전체** (명세→코드→테스트→배포) |
| **HyperAgents** | 연구 프레임워크 (범용) | FX는 **AX BD 도메인 특화** + SDD Triangle 기반 |

**HyperFX의 핵심 가치**:
1. **선언적 에이전트**: YAML로 정의, MetaAgent가 진화시킴
2. **SDD-Native Graph**: Spec↔Code↔Test 삼각형이 Graph의 기본 토폴로지
3. **도메인 특화 자기개선**: BD 업무 패턴에 최적화된 6축 진단
4. **인간 승인 필수**: HyperAgents의 자율성 + 프로덕션급 안전장치

---

## Sources

- [Claude Managed Agents (Anthropic 공식)](https://claude.com/blog/claude-managed-agents)
- [Claude Managed Agents Guide 2026](https://www.the-ai-corner.com/p/claude-managed-agents-guide-2026)
- [CMA: The New Stack](https://thenewstack.io/with-claude-managed-agents-anthropic-wants-to-run-your-ai-agents-for-you/)
- [CMA: Honest Pros and Cons](https://medium.com/@unicodeveloper/claude-managed-agents-what-it-actually-offers-the-honest-pros-and-cons-and-how-to-run-agents-52369e5cff14)
- [HyperAgents (Cobus Greyling / Medium)](https://cobusgreyling.medium.com/hyperagents-by-meta-892580e14f5b)
- [HyperAgents 논문 (arXiv)](https://arxiv.org/abs/2603.19461)
- [HyperAgents (Meta AI)](https://ai.meta.com/research/publications/hyperagents/)
- [HyperAgents (MarkTechPost)](https://www.marktechpost.com/2026/03/23/meta-ais-new-hyperagents-dont-just-solve-tasks-they-rewrite-the-rules-of-how-they-learn/)
- [선행 분석: Strands SDK](docs/research/strands-sdk-analysis-and-fx-plan.md)
- [선행 분석: Deep Insight](docs/research/deep-insight-analysis.md)
