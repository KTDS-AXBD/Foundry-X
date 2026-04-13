# HyperFX Agent Stack PRD

**버전:** final (v2 기반)  
**날짜:** 2026-04-13  
**작성자:** AX BD팀  
**상태:** ✅ 착수 준비 완료  
**코드네임:** HyperFX  
**참조**: deep-insight-analysis.md, strands-sdk-analysis-and-fx-plan.md, fx-agent-restructure-proposal.md

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**  
Foundry-X의 에이전트 레이어를 4-Layer Agent Stack으로 완전 재구조화하여, AX BD 발굴/형상화 파이프라인의 조건부 분기/병렬 실행을 가능하게 하고, 선언적 에이전트 정의 + Graph 오케스트레이션 + 자기개선 루프를 도입한다.

**배경:**  
Foundry-X는 Phase 1~39에 걸쳐 에이전트 기능을 점진적으로 추가해왔다. 현재 7개 전문 에이전트(Architect, Planner, Reviewer, Test, Security, QA, Infra)와 OrchestrationLoop(retry/adversarial/fix 3모드)가 존재하지만, 근본적 한계가 있다:

1. **에이전트 정의가 분산됨** — 각자 다른 패턴으로 하드코딩
2. **OrchestrationLoop가 피드백 루프에 한정** — Graph 기반 DAG/분기/루프/병렬 미지원
3. **도구 정의 표준 없음** — 서비스 메서드 직접 호출, `@tool` 같은 선언적 패턴 부재
4. **관측성 부재** — 실시간 스트리밍, 토큰 추적, OpenTelemetry 없음
5. **자기개선이 프롬프트 힌트 수준** — 하네스 자체를 수정하지 못함

동시에, 업계 패러다임이 전환되고 있다:
- **Claude Managed Agents** (2026-04) — 선언적 에이전트 정의 + 자동 반복
- **Meta HyperAgents** (2026-03) — 에이전트가 자신의 하네스를 자기 수정
- **AWS Strands SDK** — Graph/Steering/Agents-as-Tools 패턴 정립
- **Deep Insight** — 3-Tier 계층 + Prompt Cache + Context Engineering 프로덕션 적용

**목표:**  
"Agent가 진화, FX는 하네스" — 에이전트 정의/실행/자기개선 플랫폼으로 전환. 발굴 9단계 파이프라인을 Graph로 정의하여 조건부 분기/병렬 실행/실시간 스트리밍이 가능한 상태.

<!-- CHANGED: 문제-해결책 매핑이 추상적이라는 피드백을 반영하여 As-Is와 To-Be 간의 구체적 매핑 표 추가 -->
### 1.1 문제-해결책 매핑

| 현행 문제 (As-Is)                                   | 목표 기능/해결책 (To-Be)                                    | 구체적 기능/구현 위치                             |
|-----------------------------------------------------|------------------------------------------------------------|---------------------------------------------------|
| 에이전트 정의 분산, 관리 불가                        | 통합 AgentSpec YAML, 선언적 정의                            | F-L2-2, F-L2-7                                    |
| 도구 정의 표준 부재, 직접 호출                      | defineTool, ToolRegistry 통한 선언적 도구 관리               | F-L2-1, F-L2-6                                    |
| 피드백 루프 한정 OrchestrationLoop                  | GraphEngine 기반 DAG/분기/병렬/루프 지원                    | F-L3-1, F-L3-2, F-L3-3, F-L3-7, F-L3-8            |
| 에이전트 간 협업 제한, 자동 변환 미흡                | Agents-as-Tools, 노드로써 에이전트 연결                     | F-L3-4                                            |
| 행동 제어 미흡 (before/after-run)                   | SteeringHandler (Proceed/Guide/Interrupt)                   | F-L3-5                                            |
| 스트리밍 미구현                                    | WebSocket/SSE 기반 에이전트 이벤트 실시간 스트리밍           | F-L1-1, F-L1-2, F-L1-4                            |
| 컨텍스트 및 관측성 부족                            | TokenTracker, ConversationManager, OpenTelemetry             | F-L2-5, F-L3-6, 4.2-5                             |
| 자기개선이 프롬프트 힌트 수준                      | DiagnosticCollector + MetaAgent 개선안 생성 및 승인          | F-L4-1, F-L4-2, F-L4-3, 10.2                      |
| 장애/예외 처리 정책 미흡                            | 장애 감지/롤백/Alerting, Graceful Degradation 설계           | 10.4, 10.5                                         |
| 코드 마이그레이션 전략 불명확                       | 단계별 점진적 전환, 공존 전략 명문화                        | 10.3, 6.1, 8                                       |
| 운영/테스트 자동화, 배포/버전 관리 미흡              | CI/CD, YAML 배포, 테스트 자동화, 운영 모니터링              | 10.6, 10.7                                         |
| 실시간/병렬 시스템의 운영 복잡도                    | 운영/장애 대응 계획, 로그 추적, 권한 관리                    | 10.4, 10.5, 10.8                                   |
| 비용/성능 관리 없음                                 | Rate Limit, Budget Control, Graceful Degradation             | 10.9                                               |
| UX/시각화 도구 및 피드백 루프 미비                  | Web UI 그래프/실행/실시간 로그, 피드백창, Flow Editor        | 10.10, 10.2                                        |

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

| 영역 | 현황 | GAP |
|------|------|-----|
| **에이전트 정의** | 7개 전문 에이전트, 각자 다른 패턴으로 하드코딩 | 통일된 AgentSpec 없음 |
| **도구 정의** | 서비스 메서드 직접 호출 | `defineTool()` 같은 선언적 패턴 없음 (일치도 10%) |
| **오케스트레이션** | OrchestrationLoop — retry/adversarial/fix 3모드 | Graph 기반 DAG/분기/루프/병렬 미지원 (일치도 40%) |
| **에이전트 간 협업** | AgentAdapter + Agents-as-Tools 유사 패턴 | 자동 변환 없음 (일치도 50%) |
| **행동 제어** | PluginHookEvent (before/after-run) | Steering (Proceed/Guide/Interrupt) 없음 (일치도 30%) |
| **스트리밍** | 없음 (REST 응답만) | 에이전트 이벤트 스트리밍 미구현 (일치도 0%) |
| **컨텍스트 관리** | 없음 | Compaction/Sliding Window 미구현 (일치도 0%) |
| **관측성** | D1 로그만 | OpenTelemetry/토큰 추적 미구현 (일치도 10%) |
| **자기개선** | AgentSelfReflection (score/suggestions) | 하네스 자체 수정 불가 (프롬프트 힌트 수준) |

### 2.2 목표 상태 (To-Be)

4-Layer Agent Stack ("HyperFX"):

```
L4: Meta Layer       — MetaAgent (자기진단 6축 + 개선 제안 + Human Approval)
L3: Orchestration    — GraphEngine (DAG/분기/루프/병렬) + Steering + ConversationManager
L2: Agent Layer      — AgentRuntime (YAML AgentSpec + defineTool + Hooks + TokenTracker)
L1: Infrastructure   — Cloudflare Workers + D1 + KV (+ 필요시 AWS/GCP 확장)
```

### 2.3 시급성

1. **발굴/형상화 파이프라인 병목** — AX BD 핵심 업무인 발굴 9단계(2-0~2-8)에서 에이전트 간 조건부 분기/병렬 실행이 필요하나 현행 구조로는 불가, 수동 처리 중
2. **업계 전환 속도** — CMA/HyperAgents/Strands가 2026 Q1~Q2에 집중 발표, 선제 대응하지 않으면 기술 격차 확대
3. **고객 데모 역량** — 멀티에이전트 역량을 시연할 수 있는 레퍼런스가 필요

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| **개발자 (Sinclair)** | FX 플랫폼 에이전트 인프라 구축 | 선언적 에이전트 정의, Graph 오케스트레이션, 확장 가능한 도구 체계 |

### 3.2 부 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| **AX BD팀** | 발굴/형상화 업무 자동화 | 발굴 파이프라인 Graph 실행, 결과 실시간 모니터링 |
| **고객** | 멀티에이전트 데모/제안 대상 | 시각적인 에이전트 협업 과정 + 스트리밍 대시보드 |

### 3.3 사용 환경

- 기기: PC (CLI + Web UI)
- 네트워크: 인터넷 (Cloudflare Workers)
- 기술 수준: 개발자 (Sinclair) / 비개발자 (BD팀, 고객 — Web UI만)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have) — Walking Skeleton

#### Layer 2: Agent Runtime

| # | 기능 | 설명 | 참조 패턴 |
|---|------|------|----------|
| F-L2-1 | `defineTool()` 유틸리티 | TS 도구 정의 표준 — name, description, inputSchema(Zod), outputSchema, category, permissions | Strands `@tool` |
| F-L2-2 | `AgentSpec` YAML 스키마 | 에이전트 정의: model, systemPrompt, tools, steering, evaluation, constraints | CMA Agent Definition |
| F-L2-3 | `AgentRuntime` 실행 엔진 | Agent Loop (추론→도구→결과→반복) + Stop Reasons (end_turn/tool_use/max_tokens/cancelled) | Strands Agent Loop |
| F-L2-4 | Hooks (라이프사이클 이벤트) | Before/After Model/Tool/Invocation — cancel_tool, retry, result 수정 가능 | Strands Hooks |
| F-L2-5 | `TokenTracker` | 에이전트별 입력/출력/캐시 토큰 추적, Prompt Cache 활성화/비활성화 | Deep Insight |
| F-L2-6 | `ToolRegistry` | 도구 등록/검색/카테고리화 (builtin, mcp, agent, custom) | Strands ToolRegistry |
| F-L2-7 | 기존 7개 에이전트 YAML 마이그레이션 | Planner, Architect, Coder, Tester, Reviewer, Security, Reporter → AgentSpec YAML | — |

#### Layer 3: Orchestration

| # | 기능 | 설명 | 참조 패턴 |
|---|------|------|----------|
| F-L3-1 | `GraphEngine` | GraphBuilder API (addNode, addEdge, setEntryPoint, setMaxExecutions, build) | Strands Graph |
| F-L3-2 | 조건부 라우팅 | 엣지에 condition 함수 부착 — 분기/루프/합류 지원 | Strands conditional edges |
| F-L3-3 | 병렬 실행 | 독립 노드 동시 실행, 의존 노드 대기 | Strands Workflow |
| F-L3-4 | `Agents-as-Tools` | Agent → Tool 자동 변환 (`agent.asTool()`) + preserve_context 옵션 | Strands Agents-as-Tools |
| F-L3-5 | `SteeringHandler` | before-tool (Proceed/Guide/Interrupt) + after-model (Proceed/Guide) 행동 제어 | Strands Steering |
| F-L3-6 | `ConversationManager` | SlidingWindow + Summarizing (Compaction) — 컨텍스트 윈도우 관리 | Anthropic Context Engineering |
| F-L3-7 | OrchestrationLoop 래핑 | 기존 O-G-D Loop를 GraphEngine 노드로 래핑 (backward compat) | — |
| F-L3-8 | AX BD 발굴 Graph 정의 | 9단계(2-0~2-8) 파이프라인을 Graph로 구현, 조건부 분기 포함 | Deep Insight 3-Tier |

#### Layer 4: Meta (Walking Skeleton 수준)

| # | 기능 | 설명 | 참조 패턴 |
|---|------|------|----------|
| F-L4-1 | `DiagnosticCollector` | 6축 메트릭 자동 수집 (Tool Effectiveness, Memory, Planning, Verification, Cost, Convergence) | HyperAgents |
| F-L4-2 | `MetaAgent` | 진단 → 개선 제안 생성 (프롬프트/도구/모델/그래프 변경 YAML diff) | HyperAgents |
| F-L4-3 | Human Approval | 개선 제안을 Web UI 또는 CLI에서 승인/거부 | CMA Self-Evaluation |
<!-- CHANGED: 자기개선/반영 피드백 부족 지적에 따라 실제 개선안이 반영되는 피드백 루프/배포 프로세스(초기 워크플로) 명시 -->
| F-L4-4 | 개선안 반영 피드백 루프 | Human Approval 후 개선안 적용 워크플로(예: 승인시 자동 배포/롤백/버전 관리) | 신설 |

#### Layer 1: Infrastructure (기존 활용 + 확장)

| # | 기능 | 설명 |
|---|------|------|
| F-L1-1 | WebSocket 에이전트 스트리밍 | `/ws/agent/:sessionId` — 에이전트 이벤트 실시간 스트리밍 |
| F-L1-2 | SSE 폴백 | WebSocket 불가 환경용 Server-Sent Events |
| F-L1-3 | D1 에이전트 메트릭 저장 | 실행 이력, 토큰, 비용, 품질 점수 |
| F-L1-4 | Web 실시간 대시보드 | 에이전트 상태/토큰/진행률 시각화 |
<!-- CHANGED: 에이전트 그래프/파이프라인 Flow Editor 등 시각화 도구 필요 피드백 반영 -->
| F-L1-5 | Graph/Agent Flow Editor | DAG/분기/병렬 구조 시각화 및 편집 도구(Web UI) | 신설 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | 에이전트별 모델 분리 | 에이전트마다 다른 LLM 모델 설정 (Opus/Sonnet/Haiku) | P1 |
| 2 | Prompt Cache 전략 | 반복 호출 에이전트에만 캐시 활성화 | P1 |
| 3 | A/B 평가 프레임워크 | MetaAgent 제안을 동일 태스크로 비교 평가 | P1 |
| 4 | AX BD 형상화 Graph 정의 | 형상화 단계 파이프라인 Graph 구현 | P1 |
| 5 | OpenTelemetry 통합 | 분산 트레이싱 | P2 |
| 6 | 자동화된 롤백/Alerting | 장애 발생 시 롤백·Alerting 자동화 | P1 |
| 7 | YAML 버전 관리/배포 자동화 | 선언적 정의의 CI/CD, 배포, 롤백 지원 | P1 |
| 8 | 권한 관리/로그 추적 | AgentSpec/스트리밍 등 주요 액션에 대한 권한/감사로그 | P1 |
| 9 | Rate Limit/Budget Control | LLM 호출량/비용/레이트 리밋 관리 | P1 |
| 10 | UX 개선 (실행 로그, 피드백창) | Web UI에서 실시간 로그, 피드백, 그래프 모니터링 | P1 |

### 4.3 제외 범위 (Out of Scope)

| 항목 | 이유 |
|------|------|
| AgentCore 외부 배포 | Anthropic 관리형 런타임은 FX의 자체 인프라 소유 철학과 상충 |
| Bedrock/OpenAI 직접 연동 | Claude Code 구독(주) + OpenRouter(보조)로 충분. 프로바이더 추가는 후속 |
| Swarm 자율 인계 | 복잡도 대비 현재 우선순위 낮음. Graph + Agents-as-Tools로 대부분 커버 |
| HyperAgents 수준 자기수정 | Walking Skeleton에서는 메트릭 수집 + 제안 생성까지, 자동 적용은 후속 |
| 모바일 UI | PC(CLI + Web) 우선 |

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Claude API (Anthropic) | REST API (Claude Code 구독) | 필수 |
| OpenRouter | REST API (보조 LLM) | 선택 |
| Cloudflare Workers | Runtime | 필수 |
| Cloudflare D1 | SQLite (메트릭/이력) | 필수 |
| GitHub API | Issues/PRs (에이전트 태스크 연동) | 선택 |

---

## 5. 성공 기준

<!-- CHANGED: 성공 기준이 기능 중심이라는 피드백 반영, 비즈니스/사용상 임팩트 KPI 추가, 기존 대비 효율·생산성 향상, 고객 데모 등 항목 보강 -->
### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 발굴 파이프라인 Graph 노드 수 | 0 | 9 (2-0~2-8 전체) | Graph 정의 파일 노드 카운트 |
| 조건부 분기 동작 | 0건 | 2건+ (gate ready/not ready, 단계 스킵) | E2E 테스트 통과 |
| 병렬 실행 노드 수 | 0 | 3+ (독립 분석 에이전트 동시 실행) | 동시 실행 로그 확인 |
| 스트리밍 지연 | N/A | < 500ms (이벤트 발생→UI 표시) | WebSocket 레이턴시 측정 |
| 에이전트 YAML 정의 수 | 0 | 7+ (기존 에이전트 마이그레이션) | `agents/*.agent.yaml` 카운트 |
| 도구 정의 수 (defineTool) | 0 | 10+ (핵심 도구) | ToolRegistry 등록 수 |
| Gap Analysis Match Rate | — | ≥ 90% | PDCA 표준 |
| <!-- CHANGED: 비즈니스 KPI 추가 --> 발굴 파이프라인 처리 시간 | 기존 대비 | 30% 이상 단축 | 기존/신규 프로세스 평균 처리 시간 비교 |
| <!-- CHANGED: 비즈니스 KPI 추가 --> 고객 데모 만족도 | N/A | 4.5점/5점 이상 | 데모 후 설문(주관식/5점 척도) |
| <!-- CHANGED: 비즈니스 KPI 추가 --> 운영 장애 건수 | N/A | 월 1건 미만 | 장애/Alerting 로그 |
| <!-- CHANGED: 비즈니스 KPI 추가 --> LLM API 비용 | N/A | 예산 내 (월 $X 이하) | 청구서, Rate Limit Log |

### 5.2 MVP 최소 기준

- [ ] 발굴 9단계(2-0~2-8) 전체가 Graph 노드로 정의되어 있음
- [ ] 조건부 분기 1건 이상 동작 (예: gate ready → 다음 단계 / not ready → 보완 루프)
- [ ] 독립 노드 3개 이상 병렬 실행 가능
- [ ] 에이전트 실행 상황이 WebSocket 스트리밍으로 Web UI에 실시간 표시
- [ ] 에이전트 7종이 YAML AgentSpec으로 정의됨
- [ ] `defineTool()`로 핵심 도구 10개 이상 등록됨
- [ ] MetaAgent가 6축 메트릭 중 2축 이상 수집 + 개선 제안 1건 이상 생성
- <!-- CHANGED: UX 관점 MVP 정의 요청 반영, Web UI 모니터링/그래프/실행 로그/피드백창 명시 -->
- [ ] Web UI에서 에이전트 실행 그래프/실시간 로그/피드백창을 통해 전체 상태를 시각적으로 확인 가능

### 5.3 실패/중단 조건

- 3 Sprint 이내에 GraphEngine + 조건부 분기가 동작하지 않으면 범위 축소 재검토
- Walking Skeleton 이후 발굴 파이프라인 연동이 기존 대비 개선되지 않으면 접근 방식 전환

---

## 6. 제약 조건

### 6.1 일정

<!-- CHANGED: 인력 1인/6 Sprint 과대낙관, 현실성 피드백을 반영하여 일정/인력/우선순위 조정 리스크 명시 -->
- 목표: Walking Skeleton = 4~6 Sprint (Phase 단위 점진)
- 접근: Inside-Out 마이그레이션 — 기존 코드 재사용하며 안에서 밖으로 리팩터링
- 인력(초기): 1인 (Sinclair) → **리스크: L3/L4(Orchestration/Meta)는 병렬 개발 불가, 일정 지연 가능. 필요시 1~2명 추가 투입 검토**
- 마일스톤:
  - **M1 (2 Sprint)**: L2 Agent Runtime — defineTool, AgentSpec, AgentRuntime, 기존 에이전트 YAML 마이그레이션
  - **M2 (2 Sprint)**: L3 Orchestration — GraphEngine, 조건부 라우팅, 병렬 실행, 발굴 Graph 정의
  - **M3 (1 Sprint)**: L1 Streaming — WebSocket/SSE, Web 대시보드, Flow Editor(최소)
  - **M4 (1 Sprint)**: L4 Meta — DiagnosticCollector, MetaAgent, Human Approval, 개선안 반영 프로토타입

### 6.2 기술 스택

- 프론트엔드: Vite 8 + React 18 + React Router 7 + Zustand (기존 FX Web)
- 백엔드: Hono + Cloudflare Workers + D1 (기존 FX API)
- 공유: TypeScript strict mode, pnpm workspace + Turborepo (기존 모노리포)
- LLM: Claude Code 구독 계정(주) + OpenRouter(보조)
- 인프라: Cloudflare Workers/D1/KV, 필요시 AWS/GCP 확장 가능
- 기존 의존: OrchestrationLoop, AgentAdapterFactory, AgentSelfReflection, PluginHookEvent

### 6.3 인력/예산

- 투입 인원: 1인 (Sinclair) (단, **M2~M4 일정내 병렬 개발 필요시 인력 보강 고려**)
- Sprint 단위 점진적 개발 (TDD Red→Green 사이클)
- 예산: LLM API, Cloudflare, 모니터링(추후 확장시 증액 필요)

### 6.4 컴플라이언스

- KT DS 내부 정책: 해당 없음 (내부 도구)
- 보안: 기존 FX 보안 규칙 유지 (JWT + RBAC, Secrets wrangler 관리)
- API 키: Claude Code 구독 (API 과금 방지 — .claude.json primaryApiKey 금지)
- <!-- CHANGED: 실시간 스트리밍/AgentSpec 변경 등 권한 관리/감사로그 명시 -->
- 권한/감사: 실시간 스트리밍(WebSocket/SSE), AgentSpec 편집, 개선안 승인/반영 등 주요 액션에 대해 권한/감사로그 필수

---

## 7. 아키텍처 설계 요약

### 7.1 4-Layer Agent Stack

```
┌─────────────────────────────────────────────────┐
│              Layer 4: Meta Layer                 │
│  MetaAgent — 6축 진단 + 개선 제안 + Human Approval │
│  개선안 반영 피드백 루프 (배포/롤백/버전 관리)      │
│  모델: Claude Opus                               │
└──────────────────────┬──────────────────────────┘
                       │ 수정 제안 → Human Approval → 실제 반영
┌──────────────────────▼──────────────────────────┐
│              Layer 3: Orchestration Layer         │
│  GraphEngine — DAG/분기/루프/병렬 워크플로우 실행    │
│  SteeringHandler — before-tool, after-model      │
│  ConversationManager — Sliding/Summarizing        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Layer 2: Agent Layer                 │
│  AgentRuntime — YAML AgentSpec + defineTool       │
│  Agent Loop + Hooks + TokenTracker               │
│  ToolRegistry (builtin/mcp/agent/custom)         │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              Layer 1: Infrastructure Layer        │
│  Cloudflare Workers + D1 + KV                    │
│  WebSocket/SSE 스트리밍 + Web 대시보드 + Flow Editor │
└─────────────────────────────────────────────────┘
```

### 7.2 에이전트 역할 체계 (4-Tier)

| Tier | 역할 | 에이전트 | 모델 |
|------|------|---------|------|
| T0 | Meta | MetaAgent (1) | Opus |
| T1 | Orchestrator | Coordinator + Supervisor (2) | Sonnet |
| T2 | Specialist | Planner, Architect, Coder, Tester, Reviewer, Security, Reporter (7) | Sonnet/Haiku |
| T3 | Utility | Tracker, Validator, ContextManager (3) | Haiku |

### 7.3 기존 코드 재사용 매핑

| 기존 코드 | 현재 역할 | 재구조화 후 위치 |
|----------|----------|---------------|
| OrchestrationLoop (F335) | 피드백 루프 | GraphEngine의 **루프 노드**로 래핑 |
| AgentAdapterFactory (F336) | Runner→Adapter | AgentRuntime의 **모델 프로바이더**로 흡수 |
| AgentSelfReflection (F148) | 자가 평가 | DiagnosticCollector의 **메트릭 소스** |
| PluginHookEvent | Hook 이벤트 | AgentRuntime Hooks로 **확장** |
| 7개 전문 에이전트 | 하드코딩 | **YAML AgentSpec으로 선언적 전환** |

### 7.4 발굴 파이프라인 Graph (핵심 MVP 구현 대상)

```
[Coordinator] ─→ [2-0 구체화/분류]
                       │
                 ┌─────┴─────┐
                 ▼           ▼
          [2-1 레퍼런스]  [2-2 수요/시장]  ← 병렬 실행
                 │           │
                 └─────┬─────┘
                       ▼
                [2-3 경쟁/지사]
                       │
                       ▼
                [2-4 아이템 도출]
                       │
                 ┌─────┴─────┐ (조건부: 도출 결과에 따라)
                 ▼           ▼
          [2-5 핵심 선정]  [2-4 재실행]  ← 피드백 루프
                       │
                       ▼
                [2-6 잠정 고객]
                       │
                       ▼
                [2-7 BM 발굴]
                       │
                       ▼
                [2-8 패키징]
                       │
                 [Gate: 9기준 충족?]
                  yes │     │ no
                      ▼     ▼
             [형상화 전환]  [보완 루프]
```

---

## 8. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Cloudflare Workers에서 WebSocket 지원 범위 확인 (Durable Objects 필요 여부) | Sinclair | M3 시작 전 |
| 2 | Claude Code 구독에서 Agent Loop 구현 시 API 호출 패턴 최적화 방법 | Sinclair | M1 |
| 3 | 기존 shared/src/agent.ts 타입과 새 AgentSpec YAML의 공존 전략 (점진적 전환 vs 일괄 전환) | Sinclair | M1 |
| 4 | 발굴 9단계 중 실제로 병렬 실행 가능한 단계 조합 확인 (데이터 의존성 분석) | Sinclair | M2 |
| 5 | MetaAgent의 LLM 호출 비용 예산 설정 (진단 1회당 토큰 추정) | Sinclair | M4 |
| 6 | AWS/GCP 확장 시나리오 구체화 (어떤 경우에 CF 밖으로 나가야 하는지) | Sinclair | 후속 |
| <!-- CHANGED: 기존/신규 공존, CI/CD, 롤백 등 자동화 이슈 추가 --> 7 | AgentSpec YAML 버전 관리/CI/CD/롤백 자동화 방안 | Sinclair | M3 |
| <!-- CHANGED: 운영/장애 대응, 롤백, Alerting 등 이슈 추가 --> 8 | 실시간 스트리밍/병렬 시스템 장애 발생시 롤백·Alerting 체계 설계 | Sinclair | M3 |
| <!-- CHANGED: 권한 관리/감사로그/보안 관련 이슈 추가 --> 9 | AgentSpec/실행/스트리밍 등 권한 관리·감사로그 정책 구체화 | Sinclair | M2 |
| <!-- CHANGED: 비용/성능 관리 이슈 추가 --> 10 | LLM 호출량, Rate Limit, 예산 초과시 Graceful Degradation 정책 | Sinclair | M4 |
| <!-- CHANGED: Flow Editor/시각화 도구 요구 이슈 추가 --> 11 | Graph/Agent Flow Editor(Web UI) 최소 스펙 및 도입 범위 결정 | Sinclair | M3 |

---

## 9. 리스크 및 대응방안

<!-- CHANGED: 리스크 섹션 명시 및 주요 리스크/대응방안 구체화 -->
| # | 리스크 | 영향 | 대응방안 |
|---|--------|------|---------|
| 1 | 1인 개발(인력/일정) | 일정 지연, 품질 저하 | 단계별 인력 투입 여지 확보, 하위 레이어 분리 우선순위 조정 |
| 2 | 기존/신규 병행(공존 전략) | 이중 유지, 마이그레이션 혼란 | 점진적 전환, 호환성 레이어/이중 운영 가이드 별도 문서화 |
| 3 | 운영/테스트/장애대응 미흡 | 장애시 복구 지연, 데이터 손실 | CI/CD, Alerting, 자동 롤백/리트라이, 장애 매뉴얼 |
| 4 | LLM/비용 초과 | 예산 초과, Rate Limit 초과 | 호출량 모니터링, 예산 초과시 Graceful Degradation, 예산 경고 |
| 5 | 병렬/실시간 시스템 운영 복잡도 | 예기치 못한 장애, 상태 불일치 | 상태 동기화 설계, 장애시 롤백/Alerting, 테스트 자동화 |
| 6 | 권한/보안 미비 | 정보 유출, 오남용 | RBAC, 감사로그, 주요 액션 권한 명시화 |
| 7 | Flow Editor/UX 미흡 | 운영/디버깅/확장 불가 | MVP 수준 Flow Editor 우선 도입, 단계별 확장 계획 |
| 8 | 테스트 자동화 부족 | 회귀 버그, 품질 저하 | TDD/자동화 테스트, YAML Validation, E2E 스크립트 |
| 9 | 개선안 반영 루프 단절 | 자기개선 실질적 무력화 | Human Approval 이후 자동 배포/롤백, 영향 모니터링 체계화 |

---

## 10. 운영/테스트/자동화/보안 설계

<!-- CHANGED: 운영/테스트/장애대응/자동화/보안/비용/UX 관련 요구 통합 섹션 신설 -->

### 10.1 CI/CD 및 버전 관리
- AgentSpec, Graph 정의 등 YAML의 Git 기반 버전 관리
- 주요 변경(승인/배포/롤백)시 자동화된 CI, E2E 테스트, 영향도 분석
- 변경 이력 추적 및 롤백 지원, 배포 로그 저장

### 10.2 개선안 반영 프로세스(Feedback Loop)
- MetaAgent가 생성한 개선안은 Human Approval을 거쳐 승인/거부
- 승인시 CI 자동 배포, 이력 기록, 거부시 피드백 및 보류
- 개선안 적용 이후 영향 모니터링(Negative Impact 시 자동 롤백, Alerting)

### 10.3 기존/신규 공존 및 마이그레이션
- shared/src/agent.ts 등 기존 코드와 AgentSpec YAML 병행 운영
- 점진적 마이그레이션, 호환성 레이어 마련, 이중 유지 기간 명시
- 마이그레이션 계획/일정 별도 관리

### 10.4 장애/예외 처리 정책
- 각 에이전트 실행/그래프 노드 실패시 롤백/리트라이/Alerting 정책 명시
- 토큰 초과/네트워크 장애/실패시 Graceful Degradation(품질 저하/스킵) 옵션
- 장애 발생시 Web UI/Slack 등 실시간 Alerting, 운영자 개입 창구 제공

### 10.5 운영/모니터링 자동화
- WebSocket/SSE 실시간 로그, 상태 대시보드, 메트릭(토큰, 비용, 품질) 실시간 집계
- OpenTelemetry/분산 트레이싱 연동
- 운영자용 장애 이력/성능/비용/피드백 대시보드

### 10.6 권한 관리 및 보안
- JWT + RBAC 기반, 주요 액션(AgentSpec 편집, 이벤트 스트리밍, 개선안 승인 등)별 권한 체크
- 감사로그(누가/언제/무엇을/어떻게 변경) 전체 기록
- API Key/Secret 관리 정책 강화, 민감정보 노출 금지

### 10.7 비용/성능/Rate Limit 관리
- LLM 호출/비용/레이턴시 실시간 모니터링
- 예산 초과/Rate Limit 임박시 Graceful Degradation(단순화된 답변/스킵/알림)
- 비용 예측, LLM 사용량 월간 리포트

### 10.8 UX 및 시각화 도구
- Web UI에 Flow Editor(DAG/분기/병렬 시각화), 실시간 실행/로그/피드백 창 탑재
- 실행 현황, 병렬/분기 흐름, 에이전트 상태 색상 표시
- 피드백/에러/Alerting/개선안 승인 등 직관적 UX

---

## 11. Out-of-Scope

<!-- CHANGED: 누락된 Out-of-scope 요청 반영 -->
| 항목 | 이유 |
|------|------|
| 모바일 UX Mockup | Web UI 기능만 우선 고려, 모바일 최적화/설계는 추후 |
| Anthropic 관리형 런타임 배포 | 자체 인프라 철학 상 미포함 |
| 대규모 Swarm/자율 복제 | Graph/Agents-as-Tools로 MVP 범위 내 충분 |
| 자동 개선안 적용(무인 배포) | Human Approval 프로세스 후 적용만 우선, 완전 자동화는 추후 |
| 외부 LLM 프로바이더(예: Bedrock/OpenAI 직접 연결) | Claude Code/Router 우선, 추가 LLM 연동은 후속 |
| 대규모 운영 자동화(장애 복구 시나리오, DR 등) | MVP 및 초기 운영 범위 내에서만 고려 |
| 오프라인/내부망 운영 | Cloudflare 기반 온라인 서비스 우선 |

---

## 12. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 (v1) | 2026-04-13 | 최초 작성 — 인터뷰 + 분석 문서 3건 기반 | - |
| 1차 수정 (v2) | 2026-04-13 | ChatGPT, DeepSeek 피드백 반영: 문제-해결책 매핑, 비즈니스 KPI, 피드백 루