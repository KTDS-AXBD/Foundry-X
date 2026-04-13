---
id: FX-PLAN-281
title: Sprint 281 — F528 Graph Orchestration (L3)
sprint: 281
f_items: [F528]
req_codes: [FX-REQ-556]
date: 2026-04-13
status: active
---

# Sprint 281 Plan — F528 Graph Orchestration (L3)

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | OrchestrationLoop는 retry/adversarial/fix 3모드에 한정 — DAG 기반 조건부 분기/병렬 실행 불가. 발굴 9단계 파이프라인 수동 처리 중 |
| **Solution** | GraphEngine(GraphBuilder API) + 조건부 라우팅 + 병렬 실행 + Agents-as-Tools + SteeringHandler + ConversationManager + OrchestrationLoop 노드 래핑 |
| **Functional UX Effect** | CLI에서 `runGraph(discoveryGraph, ctx)` 한 번으로 발굴 2-0~2-8 전체가 자동 실행 — 조건부 gate, 병렬 분석 지원 |
| **Core Value** | HyperFX L3 완성 → 발굴 파이프라인 처리 시간 30%+ 단축, 멀티에이전트 데모 레퍼런스 확보 |

## 목표

HyperFX Agent Stack의 Layer 3(Orchestration Layer)을 구현한다.  
F527(L2 Agent Runtime) 위에 GraphEngine을 얹어, 에이전트 간 DAG 기반 오케스트레이션을 가능하게 한다.

## 선행 완료 (F527, Sprint 280)

| 파일 | 내용 |
|------|------|
| `runtime/define-tool.ts` | `defineTool()` 유틸리티 |
| `runtime/tool-registry.ts` | `ToolRegistry` — 등록/검색/카테고리화 |
| `runtime/token-tracker.ts` | `TokenTracker` — 에이전트별 토큰 추적 |
| `runtime/agent-runtime.ts` | `AgentRuntime` — 추론→도구→결과→반복 루프 + Hooks |
| `runtime/agent-spec-loader.ts` | `AgentSpecLoader` — YAML 파싱 |
| `specs/*.agent.yaml` | 7개 에이전트 선언적 정의 |

## 범위 (F-L3-1 ~ F-L3-8)

| 서브기능 | 설명 | 파일 |
|---------|------|------|
| F-L3-1 | `GraphEngine` — GraphBuilder API (`addNode`, `addEdge`, `setEntryPoint`, `setMaxExecutions`, `build`, `run`) | `orchestration/graph-engine.ts` |
| F-L3-2 | 조건부 라우팅 — 엣지에 condition 함수 부착 (분기/루프/합류) | `orchestration/graph-engine.ts` |
| F-L3-3 | 병렬 실행 — 독립 노드 동시 실행, 의존 노드 대기 (`Promise.all`) | `orchestration/graph-engine.ts` |
| F-L3-4 | `Agents-as-Tools` — `agent.asTool()` 자동 변환 + `preserve_context` 옵션 | `orchestration/agents-as-tools.ts` |
| F-L3-5 | `SteeringHandler` — before-tool(Proceed/Guide/Interrupt) + after-model(Proceed/Guide) | `orchestration/steering-handler.ts` |
| F-L3-6 | `ConversationManager` — SlidingWindow + Summarizing(Compaction) | `orchestration/conversation-manager.ts` |
| F-L3-7 | OrchestrationLoop 래핑 — 기존 O-G-D Loop를 GraphEngine 노드로 래핑 | `orchestration/orchestration-loop-node.ts` |
| F-L3-8 | AX BD 발굴 Graph 정의 — 9단계(2-0~2-8) Graph, 조건부 분기 포함 | `orchestration/graphs/discovery-graph.ts` |

## 아키텍처 결정

### GraphEngine 설계
- **노드** = `GraphNode`: `id`, `agentId | handlerFn`, `inputs`, `outputs` 구조
- **엣지** = `GraphEdge`: `from`, `to`, `condition?: (ctx) => boolean`
- `build()` 시 DAG 검증 (사이클 감지, 진입점 확인)
- `run(ctx)` 시 토폴로지 순서 계산 → 병렬 가능 노드는 `Promise.all`로 실행
- 최대 실행 횟수(`setMaxExecutions`) — 루프 무한 방지

### Agents-as-Tools 패턴
- `AgentRuntime` 인스턴스에 `asTool()` 메서드 추가
- 반환값: `ToolDefinition` (defineTool 호환)
- `preserve_context: true` 시 에이전트의 이전 대화 이력 유지

### 기존 코드 영향
- `OrchestrationLoop`: **수정 없음** — `OrchestrationLoopNode`가 래핑
- `AgentRuntime`: `asTool()` 메서드만 추가 (additive only)
- `AgentAdapterFactory`: 수정 없음

### 발굴 Graph 구조 (F-L3-8)
```
[Coordinator] → [2-0 구체화/분류]
                    │
              ┌─────┴─────┐
              ▼           ▼
       [2-1 레퍼런스]  [2-2 수요/시장]  ← 병렬
              │           │
              └─────┬─────┘
                    ▼
             [2-3 경쟁/지사]
                    │
                    ▼
             [2-4 아이템 도출]
                    │ (gate: 충분한 아이템 도출 여부)
              ┌─────┴─────┐
       ready ▼           ▼ not-ready
     [2-5 접근방식]   [보완루프 → 2-3]
              │
       ┌──────┴──────┐
       ▼             ▼
 [2-6 협력사]   [2-7 위험요소]  ← 병렬
       │             │
       └──────┬──────┘
              ▼
       [2-8 발굴완료]
```

## TDD 계획

**적용 등급**: 필수 (새 서비스 로직)

| 테스트 대상 | Red 시나리오 |
|------------|-------------|
| `GraphEngine` | 노드 추가, 엣지 연결, 진입점 설정, 순차 실행 |
| `GraphEngine` 조건부 분기 | condition=true/false 분기 라우팅 |
| `GraphEngine` 병렬 실행 | 독립 노드 Promise.all 동시 실행 |
| `GraphEngine` 루프 방지 | maxExecutions 초과 시 오류 |
| `AgentsAsTools` | `asTool()` 반환 구조, preserve_context |
| `SteeringHandler` | Proceed/Guide/Interrupt 3가지 결과 |
| `ConversationManager` | SlidingWindow 메시지 수 제한, Summarizing |
| `OrchestrationLoopNode` | 기존 O-G-D 루프를 노드로 래핑 후 실행 |
| `discoveryGraph` | 9단계 노드 모두 정의, gate 조건 분기 |

## 파일 매핑

| 파일 | 유형 | 목적 |
|------|------|------|
| `packages/api/src/core/agent/orchestration/graph-engine.ts` | NEW | GraphEngine + GraphBuilder + 조건부/병렬 실행 |
| `packages/api/src/core/agent/orchestration/agents-as-tools.ts` | NEW | agent.asTool() 변환 로직 |
| `packages/api/src/core/agent/orchestration/steering-handler.ts` | NEW | SteeringHandler |
| `packages/api/src/core/agent/orchestration/conversation-manager.ts` | NEW | ConversationManager |
| `packages/api/src/core/agent/orchestration/orchestration-loop-node.ts` | NEW | OrchestrationLoop 래퍼 노드 |
| `packages/api/src/core/agent/orchestration/graphs/discovery-graph.ts` | NEW | AX BD 발굴 9단계 Graph |
| `packages/api/src/core/agent/orchestration/index.ts` | NEW | barrel export |
| `packages/api/src/core/agent/runtime/agent-runtime.ts` | MODIFY | `asTool()` 메서드 추가 |
| `packages/api/src/core/agent/index.ts` | MODIFY | orchestration re-export |
| `packages/api/src/__tests__/services/graph-engine.test.ts` | NEW | GraphEngine TDD 테스트 |
| `packages/api/src/__tests__/services/agents-as-tools.test.ts` | NEW | Agents-as-Tools 테스트 |
| `packages/api/src/__tests__/services/steering-handler.test.ts` | NEW | SteeringHandler 테스트 |
| `packages/api/src/__tests__/services/conversation-manager.test.ts` | NEW | ConversationManager 테스트 |
| `packages/api/src/__tests__/services/discovery-graph.test.ts` | NEW | 발굴 Graph 통합 테스트 |
| `packages/shared/src/agent-runtime.ts` | MODIFY | Graph 관련 타입 추가 |

## 완료 기준

- [ ] `GraphEngine` — 순차/분기/병렬 실행 모두 동작
- [ ] 조건부 엣지 2개 이상 (gate ready/not-ready, 단계 스킵)
- [ ] 독립 노드 3개 이상 병렬 실행 (`Promise.all`) 동작
- [ ] `Agents-as-Tools` — `asTool()` 변환 후 ToolRegistry 등록 가능
- [ ] `SteeringHandler` — Proceed/Guide/Interrupt 동작
- [ ] `ConversationManager` — SlidingWindow 메시지 수 제한 동작
- [ ] 발굴 9단계 Graph 정의 완료 (2-0~2-8 노드 전부)
- [ ] TDD Red→Green 전 테스트 PASS (`turbo test`)
- [ ] typecheck PASS (`turbo typecheck`)
- [ ] Gap Analysis ≥ 90%
