# Sprint 286 Plan — F533 MetaAgent 실전 검증

> 작성일: 2026-04-14 | 담당: Sinclair Seo | Sprint: 286

## F533 개요

**제목**: MetaAgent 실전 검증 — DiagnosticCollector로 실제 에이전트 실행 메트릭 수집 + MetaAgent 진단→개선안→Human Approval→반영 full loop 검증  
**REQ**: FX-REQ-563 (P1)  
**선행**: F529 (AgentMetricsService, Sprint 282) ✅ + F530 (MetaAgent/DiagnosticCollector, Sprint 283) ✅ + F532 (스트리밍 E2E, Sprint 285) ✅

## 선행 구현 현황

| 컴포넌트 | 파일 | 상태 |
|---------|------|------|
| AgentMetricsService | `core/agent/streaming/agent-metrics-service.ts` | ✅ |
| DiagnosticCollector | `core/agent/services/diagnostic-collector.ts` | ✅ |
| MetaAgent (LLM 진단) | `core/agent/services/meta-agent.ts` | ✅ |
| MetaApprovalService | `core/agent/services/meta-approval.ts` | ✅ |
| metaRoute | `core/agent/routes/meta.ts` | ✅ |
| AgentMetaDashboard (Web) | `components/feature/AgentMetaDashboard.tsx` | ✅ |
| D1 migrations 0132+0133 | `agent_run_metrics` + `agent_improvement_proposals` | ✅ |
| Unit 테스트 (3종) | `__tests__/services/meta-*.test.ts` | ✅ |

## F533 구현 범위

### 1. ProposalApplyService — "반영" 단계 구현 (신규)
- 승인된 proposal의 yamlDiff를 에이전트 정의(agent_definitions)에 반영
- `POST /api/meta/proposals/:id/apply` API 엔드포인트 추가
- 멱등성 보장: 이미 `applied` 상태이면 skip

### 2. Full Loop Integration Test (신규)
- 발굴 Graph 1회 실행 시뮬레이션 (agent_run_metrics seed)
- `/api/meta/diagnose` → proposals 생성 (fetch mock)
- approve → apply 전체 파이프라인 검증

### 3. E2E Test — AgentMetaDashboard UI (신규)
- 진단 실행 → 6축 결과 표시 → 제안 approve → 상태 변경 검증

## 파일 계획

| 신규/수정 | 파일 | 목적 |
|---------|------|------|
| 신규 | `core/agent/services/proposal-apply.ts` | ProposalApplyService |
| 수정 | `core/agent/routes/meta.ts` | `POST /meta/proposals/:id/apply` 추가 |
| 신규 | `__tests__/integration/meta-agent-full-loop.test.ts` | Integration 테스트 |
| 신규 | `web/e2e/meta-agent.spec.ts` | E2E 테스트 |

## 성공 기준

- [ ] ProposalApplyService: approved proposal → agent_definitions 반영
- [ ] POST /api/meta/proposals/:id/apply: 200 (applied), 409 (already applied), 404 (not found), 422 (not approved)
- [ ] Full loop integration test: 발굴 Graph 시뮬레이션 → 진단 → 승인 → 반영 E2E PASS
- [ ] E2E: AgentMetaDashboard 진단 실행 → 6축 결과 → 승인 버튼 클릭 → 상태 변경 확인
- [ ] pnpm test PASS + typecheck PASS

## TDD 계획

| Phase | 파일 | 내용 |
|-------|------|------|
| Red | `meta-agent-full-loop.test.ts` | integration 테스트 FAIL |
| Red | `meta-agent.spec.ts` (E2E) | E2E Playwright FAIL |
| Green | `proposal-apply.ts` + `meta.ts` 수정 | 테스트 통과 |
| Refactor | 코드 정리 | |
