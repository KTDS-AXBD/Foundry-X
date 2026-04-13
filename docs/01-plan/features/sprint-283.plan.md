---
id: FX-PLAN-283
title: Sprint 283 — F530 Meta Layer (L4)
sprint: 283
f_items: [F530]
req_codes: [FX-REQ-558]
date: 2026-04-13
status: active
---

# Sprint 283 Plan — F530 Meta Layer (L4)

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | HyperFX Stack(L1~L3)이 완성됐지만 에이전트 품질 저하가 무감지 상태 — 도구 효율/메모리/계획/검증/비용/수렴 6축 메트릭이 없어 개선 방향이 불명확 |
| **Solution** | DiagnosticCollector(6축 수집) + MetaAgent(진단→YAML diff 개선안) + Human Approval Web UI(승인/거부) |
| **Functional UX Effect** | `/agent-meta` 페이지에서 에이전트 진단 결과와 개선 제안 목록을 보고, 클릭 한 번으로 승인/거부 가능 |
| **Core Value** | HyperFX L4 완성 → Phase 41 4-Layer Stack 완전체. 자기개선 루프 기반 에이전트 품질 지속 향상 |

## 목표

HyperFX Agent Stack의 Layer 4(Meta Layer)를 구현한다.
F527~F529(L2+L3+L1) 위에 자기진단/자기개선 레이어를 얹어, 에이전트 품질을 지속적으로 측정하고 개선 제안을 생성한다.

## 선행 완료

| Sprint | F-item | 산출물 |
|--------|--------|--------|
| S280 | F527 L2 Runtime | `runtime/` — AgentRuntime + AgentSpec YAML + TokenTracker |
| S281 | F528 L3 Graph | `orchestration/` — GraphEngine + SteeringHandler + DiscoveryGraph |
| S282 | F529 L1 Streaming | `streaming/` — SSE/WebSocket + AgentMetricsService + D1 0132 |

## 범위 (F-L4-1 ~ F-L4-3)

| 서브기능 | 설명 | 파일 |
|---------|------|------|
| F-L4-1 | `DiagnosticCollector` — 6축 메트릭 수집 (ToolEffectiveness, Memory, Planning, Verification, Cost, Convergence) | `services/diagnostic-collector.ts` |
| F-L4-2 | `MetaAgent` — 6축 진단 결과 → 개선 제안 YAML diff 생성 | `services/meta-agent.ts` |
| F-L4-3 | Human Approval API + Web UI — 개선 제안 목록/승인/거부 | `routes/meta.ts` + `web/agent-meta.tsx` |
| F-L4-D | D1 migration 0133 — `agent_improvement_proposals` 테이블 | `migrations/0133_agent_improvement_proposals.sql` |

## 아키텍처 결정

### 6축 메트릭 정의

| 축 | 의미 | 데이터 소스 |
|---|------|-------------|
| ToolEffectiveness | 도구 호출 대비 유효 결과 비율 | `agent_run_metrics.rounds` + tool call 이력 |
| Memory | 대화 컨텍스트 활용 효율 | 라운드당 입력 토큰 추이 |
| Planning | 에이전트가 목표를 얼마나 분해했는가 | 라운드 수 / 예상 복잡도 |
| Verification | 자기반성(SelfReflection) 점수 | `AgentSelfReflection.score` |
| Cost | 라운드당 토큰 비용 효율 | `input_tokens + output_tokens / rounds` |
| Convergence | 반복 대비 수렴 속도 | `stop_reason='end_turn'` 비율 |

### MetaAgent 프롬프트 패턴

- 입력: 6축 DiagnosticReport JSON
- 출력: `ImprovementProposal[]` — 각 제안은 `type(prompt|tool|model|graph)` + YAML diff + reasoning
- AgentRuntime 재사용 (claude-opus-4-6 권장, 비용 예산: ~2K 토큰/진단)

### Human Approval API

```
GET  /api/meta/proposals          — 제안 목록 (status 필터)
POST /api/meta/proposals/:id/approve — 승인 (status='approved')
POST /api/meta/proposals/:id/reject  — 거부 + reason (status='rejected')
```

### Human Approval Web UI

- 라우트: `/agent-meta` (신규 페이지)
- 컴포넌트: `AgentMetaDashboard` — 진단 요약 카드 + 제안 목록 + 승인/거부 버튼

## Out of Scope

- F-L4-4 개선안 자동 적용 워크플로 (후속 Sprint)
- A/B 평가 프레임워크 (후속)
- 완전 자동 배포/롤백 (인력 부족 + 위험성)

## TDD 계약 (Red Phase 대상)

| 테스트 | 파일 |
|--------|------|
| DiagnosticCollector: 6축 계산 정확성 | `__tests__/services/diagnostic-collector.test.ts` |
| MetaAgent: 제안 생성 구조 검증 | `__tests__/services/meta-agent.test.ts` |
| Human Approval API: approve/reject 엔드포인트 | `__tests__/services/meta-approval.test.ts` |

## 성공 기준

- [ ] DiagnosticCollector가 6축 메트릭 JSON 반환
- [ ] MetaAgent가 적어도 1개 이상의 ImprovementProposal 생성
- [ ] `/agent-meta` Web 페이지에서 approve/reject 버튼 동작
- [ ] TDD Match Rate ≥ 90%
