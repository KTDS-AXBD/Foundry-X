---
id: FX-PLAN-289
title: Sprint 289 Plan — F536 MetaAgent 자동 진단 훅
sprint: 289
f_items: [F536]
req_codes: [FX-REQ-566]
status: done
created: 2026-04-14
---

# Sprint 289 Plan — F536 MetaAgent 자동 진단 훅

## 목표

Graph/Agent 실행 완료 시점에 `MetaAgent.diagnose()`를 자동 트리거하여,
경계 점수 미달 축에 대한 개선 제안(ImprovementProposal)을 자동 생성·저장한다.

Dogfood 확증된 증상: "MetaAgent diagnose API는 동작하지만, 수동 호출 시에만 실행된다.
Agent 실행 완료 시점에 자동으로 진단이 트리거되지 않는다." (phase-42-dogfood.analysis.md)

## 배경

| F-item | 상태 | 역할 |
|--------|------|------|
| F530 | ✅ | MetaAgent + DiagnosticCollector + MetaApprovalService 기반 구축 |
| F534 | ✅ | DiagnosticCollector record() 훅 삽입 — agent_run_metrics 데이터 수집 |
| F535 | ✅ | Graph 정식 API (POST /biz-items/:id/discovery-graph/run-all) |
| **F536** | 📋 | **이 Sprint** — 실행 완료 → 자동 진단 → proposal 저장 |

## 범위

### In Scope
- `POST /biz-items/:id/discovery-graph/run-all` 성공 후 MetaAgent 자동 트리거
- `OrchestrationLoop.run()` graphDiscovery 분기 완료 후 MetaAgent 자동 트리거
- DiagnosticReport score < 70 시 ImprovementProposal 자동 저장
- TDD Red→Green 테스트

### Out of Scope
- MetaAgent proposal 적용 자동화 (Human Approval 유지)
- 일반(비-graph) OrchestrationLoop 경로 자동 트리거 (데이터 부재로 의미 없음)
- UI 변경 (기존 /meta-proposals 페이지로 확인)

## 의존성

- F534 완료 필수 (agent_run_metrics 데이터 존재해야 진단 가능) ✅
- F535 완료 필수 (graph run-all API가 진단 트리거 시점) ✅

## 구현 접근법

**패턴**: F534의 DiagnosticCollector 훅 삽입과 동일한 옵셔널 훅 패턴.
`MetaAgentHook` 인터페이스를 OrchestrationLoop에 추가하고,
discovery-stage-runner.ts에서도 동일 패턴으로 실행 완료 후 자동 트리거.

## 성공 기준

- [ ] Graph 실행 후 agent_improvement_proposals에 자동 행 생성
- [ ] score >= 70 전축이면 proposal 0건 (빈 배열 조용히 처리)
- [ ] TDD 테스트 PASS

## Sprint 배정

Sprint 289, 브랜치 `sprint/289`
