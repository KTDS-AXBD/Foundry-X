---
code: FX-PLAN-025
title: "Sprint 24 — Phase 3 마무리: 멀티 프로젝트 + Jira + 모니터링 + 워크플로우"
version: 0.1
status: Draft
category: PLAN
system-version: 1.8.1
created: 2026-03-20
updated: 2026-03-20
author: Sinclair Seo
---

# Sprint 24 — Phase 3 마무리: 멀티 프로젝트 + Jira + 모니터링 + 워크플로우

> **Summary**: Phase 3의 미구현 4개 핵심 영역을 완성하여 Phase 4 고객 파일럿 준비를 마무리한다.
>
> **Project**: Foundry-X
> **Version**: v2.0.0 (목표)
> **Author**: Sinclair Seo
> **Date**: 2026-03-20
> **Status**: Draft

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 24 — Phase 3 마무리 (F98~F101) |
| **시작** | 2026-03-20 |
| **목표 버전** | v2.0.0 |

| Perspective | Content |
|-------------|---------|
| **Problem** | Phase 3의 핵심 4개 영역(멀티 프로젝트 뷰, Jira 연동, 모니터링, 워크플로우 빌더)이 미구현 — Phase 4 고객 파일럿 진입 불가 |
| **Solution** | 멀티 프로젝트 대시보드 + WebhookRegistry/Jira 양방향 동기화 + Workers Analytics/Sentry + 워크플로우 에디터 |
| **Function/UX Effect** | 조직 내 여러 프로젝트를 한눈에 관리, 기존 Jira 워크플로우와 자연스러운 통합, 운영 가시성 확보, 에이전트 파이프라인 시각적 편집 |
| **Core Value** | "Git이 진실, Foundry-X는 렌즈" 철학을 엔터프라이즈 수준으로 확장 — 고객사 온보딩 준비 완료 |

---

## 1. Overview

### 1.1 Purpose

Sprint 24는 PRD v4 §8의 Phase 3 잔여 범위를 모두 완성하여 v2.0.0 마일스톤을 달성한다.
Phase 4 "고객 파일럿"에 필요한 기술적 기반(멀티 프로젝트 관리, 외부 도구 연동, 운영 모니터링, 워크플로우 자동화)을 확보하는 것이 목표이다.

### 1.2 Background

- Phase 3 Sprint 18~23에서 멀티테넌시, GitHub/Slack 연동, PlannerAgent 고도화 완료
- 그러나 PRD Phase 3에 명시된 4개 핵심 영역이 미구현:
  1. 멀티 프로젝트 대시보드 (PRD Sprint 18 범위)
  2. Webhook 일반화 + Jira 연동 (PRD Sprint 17 범위)
  3. 모니터링/옵저버빌리티 (PRD Sprint 19 범위)
  4. 에이전트 워크플로우 빌더 (PRD Sprint 18 범위)
- 현재 수치: 79 endpoints, 33 services, 502 API tests, 51 E2E, D1 23 tables

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V4]] §8 Phase 3 마일스톤
- Phase 3 로드맵: [[FX-PLAN-016]]
- SPEC: [[FX-SPEC-001]] v5.3

---

## 2. Scope

### 2.1 In Scope

- [ ] **F98**: 멀티 프로젝트 대시보드 — 크로스 프로젝트 건강도, 에이전트 활동 요약, 프로젝트 목록
- [ ] **F99**: Webhook 일반화 + Jira 연동 — WebhookRegistry 범용 프레임워크, JiraAdapter 양방향 동기화
- [ ] **F100**: 모니터링 + 옵저버빌리티 — Workers Analytics, Sentry 에러 트래킹, 알림 규칙
- [ ] **F101**: 에이전트 워크플로우 빌더 — drag-and-drop 파이프라인 에디터, 워크플로우 템플릿

### 2.2 Out of Scope

- DB 전환 (D1→PostgreSQL) — 현재 규모에서 불필요, Phase 4 이후 재검토
- 모노리포 분리 — 현재 규모에서 불필요
- Phase 4 고객 온보딩 실행 — 이 Sprint은 기술 준비만

---

## 3. Requirements

### 3.1 F98 — 멀티 프로젝트 대시보드

| ID | Requirement | Priority | Status |
|----|-------------|:--------:|:------:|
| FR-01 | 프로젝트 목록 페이지 — org 내 모든 프로젝트 카드 뷰 | High | Pending |
| FR-02 | 크로스 프로젝트 건강도 — SDD Triangle 점수 집계 + 색상 표시 | High | Pending |
| FR-03 | 에이전트 활동 요약 — 최근 24h 에이전트 태스크/PR/메시지 통계 | High | Pending |
| FR-04 | 프로젝트 전환 — 카드 클릭으로 개별 프로젝트 대시보드 진입 | Medium | Pending |
| FR-05 | API: GET /orgs/:orgId/projects/overview (건강도+활동 집계) | High | Pending |

### 3.2 F99 — Webhook 일반화 + Jira 연동

| ID | Requirement | Priority | Status |
|----|-------------|:--------:|:------:|
| FR-06 | WebhookRegistry 서비스 — 등록/삭제/목록/테스트 | High | Pending |
| FR-07 | 인바운드 핸들러 — signature 검증 + 이벤트 라우팅 (GitHub/Slack/Jira 공통) | High | Pending |
| FR-08 | 아웃바운드 핸들러 — 이벤트 필터 + 재시도 3회 + dead letter | Medium | Pending |
| FR-09 | D1 테이블: webhooks, webhook_deliveries | High | Pending |
| FR-10 | JiraAdapter — REST API v3 클라이언트 (이슈 CRUD + 상태 매핑) | High | Pending |
| FR-11 | Jira↔Spec 양방향 동기화 — Issue 생성/상태변경 ↔ F-item 동기화 | High | Pending |
| FR-12 | Jira 설정 UI — 연결 설정 + 프로젝트 매핑 + 동기화 상태 | Medium | Pending |

### 3.3 F100 — 모니터링 + 옵저버빌리티

| ID | Requirement | Priority | Status |
|----|-------------|:--------:|:------:|
| FR-13 | Workers Analytics 수집 — 요청 수/응답시간/에러율 대시보드 | High | Pending |
| FR-14 | Sentry 연동 — toucan-js Workers SDK + 에러 자동 리포팅 | High | Pending |
| FR-15 | 알림 규칙 — 에러율 임계치 초과 시 Slack 알림 | Medium | Pending |
| FR-16 | 모니터링 대시보드 UI — Workers/D1/KV 상태 시각화 | Medium | Pending |
| FR-17 | API: GET /health/detailed — 서비스별 상세 상태 + 응답시간 | High | Pending |

### 3.4 F101 — 에이전트 워크플로우 빌더

| ID | Requirement | Priority | Status |
|----|-------------|:--------:|:------:|
| FR-18 | 워크플로우 정의 모델 — nodes(steps) + edges(transitions) + conditions | High | Pending |
| FR-19 | D1 테이블: workflows, workflow_steps, workflow_executions | High | Pending |
| FR-20 | 워크플로우 API — CRUD + 실행 + 상태 조회 (6 endpoints) | High | Pending |
| FR-21 | 드래그앤드롭 에디터 UI — React Flow 기반 노드 편집기 | High | Pending |
| FR-22 | 워크플로우 템플릿 — PR Review, Code Analysis, Deploy 3종 | Medium | Pending |
| FR-23 | Orchestrator 연동 — 워크플로우 실행 시 AgentOrchestrator 호출 | High | Pending |

### 3.5 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 프로젝트 목록 API < 500ms (10 projects) | curl 응답시간 |
| Performance | 워크플로우 에디터 FPS > 30 (20 nodes) | Chrome DevTools |
| Security | Jira OAuth 2.0 토큰 안전 저장 (D1 암호화) | 코드 리뷰 |
| Reliability | Webhook 재시도 3회 + dead letter 기록 | 테스트 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] F98~F101 전체 구현 + typecheck + lint 통과
- [ ] API 테스트 530건+ (현재 502 + 신규 ~30)
- [ ] E2E 테스트 55건+ (현재 51 + 신규 ~5)
- [ ] Workers 프로덕션 배포 완료
- [ ] PDCA Match Rate 85% 이상

### 4.2 Quality Criteria

- [ ] typecheck 에러 0건
- [ ] lint 에러 0건
- [ ] 신규 서비스 단위 테스트 커버리지 80%+
- [ ] D1 migration remote 적용 완료

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|:------:|:----------:|------------|
| Sprint 범위 과대 (4개 F-item) | High | High | 우선순위: F98→F99→F100→F101, P2 항목은 다음 Sprint 이관 가능 |
| Jira REST API 인증 복잡도 | Medium | Medium | OAuth 2.0 대신 API Token 방식 먼저 구현, OAuth는 Phase 4 |
| React Flow 번들 사이즈 | Medium | Low | dynamic import + lazy loading으로 초기 로딩 영향 최소화 |
| Workers Analytics API 제한 | Low | Medium | Cloudflare GraphQL Analytics API 사용, KV 캐시로 호출 최소화 |

---

## 6. Architecture Considerations

### 6.1 Project Level

**Dynamic** — 기존 아키텍처 유지 (Hono API + Next.js + D1)

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 워크플로우 에디터 | React Flow / @xyflow/react | React Flow | 가장 성숙한 노드 에디터, Next.js 호환 |
| Jira 인증 | OAuth 2.0 / API Token | API Token (Phase 1) | 설정 간소화, OAuth는 Phase 4 |
| Sentry SDK | @sentry/browser / toucan-js | toucan-js | Workers 환경 최적화 SDK |
| Webhook 큐 | D1 폴링 / Workers Queue | D1 폴링 | 기존 인프라 활용, Queue는 추후 |

### 6.3 새 D1 테이블 (예상 4개)

| 테이블 | 용도 | F-item |
|--------|------|--------|
| webhooks | WebhookRegistry 등록 정보 | F99 |
| webhook_deliveries | 아웃바운드 배달 이력 + dead letter | F99 |
| workflows | 워크플로우 정의 (nodes/edges JSON) | F101 |
| workflow_executions | 워크플로우 실행 이력 + 상태 | F101 |

### 6.4 새 서비스 (예상 5개)

| 서비스 | 용도 | F-item |
|--------|------|--------|
| webhook-registry.ts | 범용 웹훅 등록/발송/재시도 | F99 |
| jira-adapter.ts | Jira REST API 클라이언트 | F99 |
| monitoring.ts | Workers Analytics + Sentry 통합 | F100 |
| workflow-engine.ts | 워크플로우 정의/실행/상태 관리 | F101 |
| project-overview.ts | 크로스 프로젝트 건강도 집계 | F98 |

### 6.5 새 라우트 (예상 4개)

| 라우트 | 예상 endpoints | F-item |
|--------|:-----------:|--------|
| routes/project-overview.ts | 3 (overview, health, activity) | F98 |
| routes/webhook-registry.ts | 5 (CRUD + test) | F99 |
| routes/jira.ts | 4 (connect, sync, status, webhook) | F99 |
| routes/workflow.ts | 6 (CRUD + execute + status) | F101 |

---

## 7. Implementation Order

### Phase A: 기반 (F98 + F100) — 대시보드 + 모니터링
1. project-overview 서비스 + API (F98)
2. 멀티 프로젝트 대시보드 UI (F98)
3. monitoring 서비스 + Sentry 연동 (F100)
4. 모니터링 대시보드 UI (F100)

### Phase B: 외부 연동 (F99) — Webhook + Jira
5. D1 migration: webhooks + webhook_deliveries (F99)
6. WebhookRegistry 서비스 — 기존 GitHub/Slack 핸들러 리팩토링 (F99)
7. JiraAdapter 서비스 + 양방향 동기화 (F99)
8. Jira 설정 UI (F99)

### Phase C: 워크플로우 (F101) — 에이전트 파이프라인
9. D1 migration: workflows + workflow_executions (F101)
10. workflow-engine 서비스 + API (F101)
11. React Flow 워크플로우 에디터 UI (F101)
12. 워크플로우 템플릿 3종 + Orchestrator 연동 (F101)

### Phase D: 통합 + 배포
13. 통합 테스트 + E2E
14. Workers 프로덕션 배포 + D1 migration remote
15. PDCA 갭 분석

---

## 8. Next Steps

1. [ ] Write design document (`sprint-24.design.md`)
2. [ ] Team review and approval
3. [ ] Start implementation (Phase A first)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-20 | Initial draft — F98~F101 4개 F-item 계획 | Sinclair Seo |
