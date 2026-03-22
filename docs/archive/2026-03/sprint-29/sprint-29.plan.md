---
code: FX-PLAN-030
title: "Sprint 29 Plan — 실사용자 온보딩 기반: 가이드 UI + 피드백 시스템 + 체크리스트"
version: 0.1
status: Draft
category: PLAN
system-version: 2.2.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 29 Planning Document

> **Summary**: 내부 5명 온보딩을 위한 기술 기반 — 가이드 UI, 피드백 수집 API, 온보딩 체크리스트
>
> **Project**: Foundry-X
> **Version**: 2.3.0 (target)
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | PRD v5 Phase 4 Go 조건(NPS 6+, WAU 60%)을 충족하려면 내부 5명 온보딩이 필수인데, 교육 자료·피드백 수집·진행 추적 인프라가 전무 |
| **Solution** | /getting-started 가이드 페이지 + NPS 피드백 API(D1) + 사용자별 온보딩 체크리스트로 온보딩 전체 라이프사이클 지원 |
| **Function/UX Effect** | 신규 사용자가 5분 내 핵심 기능 파악, NPS 설문 1-click 제출, 온보딩 진행률 실시간 확인 |
| **Core Value** | Phase 4 Go 판정의 데이터 근거 확보 — K7(WAU) + K12(NPS) 측정 인프라 완성으로 사용자 채택률 추적 가능 |

---

## 1. Overview

### 1.1 Purpose

PRD v5 §7.17(온보딩/전환 전략) + §8 Phase 4-F(G10: 내부 5명 강제 온보딩)를 기술적으로 지원하는 인프라를 구축한다. 교육 자료·피드백 수집·진행 추적 3가지 축으로 온보딩 전체 라이프사이클을 커버한다.

### 1.2 Background

- Phase 1~3까지 모든 코드 기능(F1~F105)은 완료되었으나, 실사용자는 0명
- PRD Go 조건 K7(WAU 60%), K12(NPS 6+)를 충족하려면 측정 + 온보딩 인프라 선행 필수
- Sprint 27에서 KPI 로깅(F100)은 완성했으나, 사용자 대면 온보딩 도구는 미구축
- PRD §7.17: 사전 안내 → 병행 운영 → 교육 자료 → 지원 채널 → 피드백 수집 5단계 전략 중 "교육 자료" + "피드백 수집" 단계를 코드로 구현

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V5]] §7.17, §8 Phase 4-F
- SPEC: [[FX-SPEC-001]] v5.7, F114/F120/F121/F122
- KPI 인프라: Sprint 27 Report [[FX-RPRT-028]]
- 성공 지표: PRD §4 K7(WAU), K12(NPS)

---

## 2. Scope

### 2.1 In Scope

- [ ] F120: 온보딩 가이드 UI — `/getting-started` 페이지 (대시보드 레이아웃 내)
  - 핵심 기능 5가지 소개 카드 (Dashboard, Agents, Spec Generator, Architecture, Wiki)
  - 인터랙티브 스텝 가이드 (3단계: 프로젝트 생성 → 에이전트 실행 → 결과 확인)
  - FAQ 아코디언 섹션 (10개 이내)
- [ ] F121: 피드백 수집 시스템
  - API: POST /feedback (NPS 점수 + 코멘트), GET /feedback/summary (집계)
  - D1 테이블: `onboarding_feedback` (user_id, nps_score, comment, created_at)
  - 대시보드 위젯: NPS 점수 평균 + 최근 피드백 (settings 페이지 또는 /analytics)
- [ ] F122: 온보딩 체크리스트
  - API: GET/PATCH /onboarding/progress (사용자별 체크리스트 상태)
  - D1 테이블: `onboarding_progress` (user_id, step_id, completed, completed_at)
  - 사이드바 위젯: 진행률 바 + 미완료 항목 안내
  - 완료 시 KPI 이벤트 기록 (KpiLogger 연동)
- [ ] D1 migration 0019: onboarding_feedback + onboarding_progress 테이블
- [ ] typecheck + tests + PDCA 분석

### 2.2 Out of Scope

- 동영상 가이드 제작 (콘텐츠 작업, 코드 외)
- Slack #foundry-x-support 채널 운영 (운영 프로세스)
- 주간 피드백 인터뷰 스케줄링 (프로세스)
- 온보딩 대상자 선정/공지 (PM 작업)
- 실사용자 데이터 기반 NPS 분석 (온보딩 시작 후)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | /getting-started 페이지에서 핵심 기능 5가지를 카드 형태로 소개 | High | Pending |
| FR-02 | 3단계 인터랙티브 가이드 (프로젝트 생성 → 에이전트 → 결과) | High | Pending |
| FR-03 | FAQ 아코디언 (질문/답변 10개 이내) | Medium | Pending |
| FR-04 | POST /feedback — NPS 1~10 점수 + 선택 코멘트 제출 | High | Pending |
| FR-05 | GET /feedback/summary — NPS 평균 + 응답 수 + 최근 5건 | Medium | Pending |
| FR-06 | GET /onboarding/progress — 현재 사용자의 체크리스트 상태 | High | Pending |
| FR-07 | PATCH /onboarding/progress — 특정 step 완료 처리 | High | Pending |
| FR-08 | 사이드바 온보딩 진행률 위젯 (프로그레스 바 + 남은 항목) | Medium | Pending |
| FR-09 | 전체 체크리스트 완료 시 KPI 이벤트 'onboarding_complete' 기록 | Medium | Pending |
| FR-10 | /analytics 페이지에 NPS 요약 위젯 추가 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | /getting-started 페이지 로딩 < 1s | Lighthouse |
| Accessibility | 가이드 페이지 키보드 탐색 가능 | 수동 검증 |
| Responsiveness | 모바일/태블릿 레이아웃 지원 | Playwright viewport |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] F120: /getting-started 페이지 렌더링 + 5개 기능 카드 + 3단계 가이드 + FAQ
- [ ] F121: feedback API 2 endpoints + D1 테이블 + NPS 위젯
- [ ] F122: onboarding progress API 2 endpoints + D1 테이블 + 사이드바 위젯 + KPI 연동
- [ ] D1 migration 0019 로컬 적용
- [ ] typecheck 5/5 패스 (에러 0건)
- [ ] 신규 API 테스트 작성 (최소 12건)

### 4.2 Quality Criteria

- [ ] PDCA Match Rate >= 90%
- [ ] Zero lint errors
- [ ] Build succeeds (turbo build)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 온보딩 단계 정의가 실사용에 안 맞을 수 있음 | Medium | Medium | 5명 피드백 후 1주 내 조정 가능하게 체크리스트 항목을 D1 기반 동적 관리 |
| NPS 수집 응답률 저조 | Medium | Low | 대시보드 첫 접속 시 NPS 팝업 표시 (비침습적) |
| 기존 /analytics와 NPS 위젯 중복 | Low | Low | /analytics 기존 레이아웃에 NPS 섹션 추가 (별도 페이지 불필요) |

---

## 6. Architecture Considerations

### 6.1 Project Level

- **Selected**: Dynamic (기존 프로젝트 구조 유지)
- 모노리포 4패키지 (cli, shared, api, web) 구조 그대로

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 온보딩 데이터 저장 | D1 / KV / 로컬스토리지 | D1 | 서버사이드 집계 필요 (NPS 평균, 사용자별 진행률) |
| NPS UI 위치 | 별도 팝업 / 설정 페이지 / /analytics | /analytics 통합 | Sprint 27 KPI 인프라와 일관성 유지 |
| 체크리스트 스텝 정의 | 하드코딩 / D1 동적 | 하드코딩 + D1 진행률 | 스텝 정의는 코드, 완료 상태만 D1 추적 |
| 가이드 페이지 라우트 | /getting-started / /onboarding / /docs | /getting-started | 직관적 URL, 대시보드 사이드바에 추가 |

### 6.3 Agent Team 구성

```
Agent Team: 2-worker 병렬
┌─────────────────────────────────────────────┐
│ W1 (Web):                                   │
│   - /getting-started 페이지 + 컴포넌트      │
│   - 사이드바 온보딩 위젯                     │
│   - /analytics NPS 위젯                      │
├─────────────────────────────────────────────┤
│ W2 (API):                                   │
│   - feedback 라우트 + 서비스 + 스키마        │
│   - onboarding-progress 라우트 + 서비스      │
│   - D1 migration 0019                        │
│   - API 테스트 (최소 12건)                   │
└─────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions (확인됨)

- [x] CLAUDE.md has coding conventions
- [x] ESLint flat config (커스텀 3룰 포함)
- [x] TypeScript strict mode
- [x] Zod 스키마 기반 API 계약
- [x] Hono createRoute 패턴
- [x] AXIS DS 디자인 토큰

### 7.2 신규 컨벤션 불필요

기존 패턴 (라우트 + 서비스 + 스키마 + 테스트) 그대로 적용.

---

## 8. Implementation Order

1. **D1 migration 0019** — onboarding_feedback + onboarding_progress 테이블
2. **API 서비스** — FeedbackService + OnboardingProgressService
3. **API 라우트** — feedback (2ep) + onboarding (2ep) + Zod 스키마
4. **API 테스트** — 신규 4 endpoints × 3건 = 12건+
5. **Web 페이지** — /getting-started (기능 카드 + 가이드 + FAQ)
6. **Web 위젯** — 사이드바 온보딩 진행률 + /analytics NPS 섹션
7. **KPI 연동** — 체크리스트 완료 시 KpiLogger.log('onboarding_complete')

---

## 9. Next Steps

1. [ ] Write design document (`sprint-29.design.md`)
2. [ ] Agent Team 2-worker 병렬 구현
3. [ ] PDCA Gap Analysis
4. [ ] D1 migration 0019 remote 적용

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | Sinclair Seo |
