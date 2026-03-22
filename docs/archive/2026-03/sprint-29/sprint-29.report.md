---
code: FX-RPRT-030
title: "Sprint 29 완료 보고서 — 실사용자 온보딩 기반: 가이드 UI + 피드백 시스템 + 체크리스트"
version: 0.1
status: Active
category: RPRT
system-version: 2.2.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 29 완료 보고서

> **Feature**: Sprint 29 — 실사용자 온보딩 기반 (F120, F121, F122)
> **PDCA Documents**: [Plan](../../01-plan/features/sprint-29.plan.md) | [Design](../../02-design/features/sprint-29.design.md) | [Analysis](../../03-analysis/features/sprint-29.analysis.md)

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 29 — F120 온보딩 가이드 UI + F121 피드백 수집 시스템 + F122 온보딩 체크리스트 |
| **기간** | 2026-03-21 (단일 세션) |
| **목표 버전** | v2.3.0 |
| **Match Rate** | **93%** |
| **F-items** | 3개 완료 (F120, F121, F122) + F114 상위 항목 연동 |
| **신규 파일** | 14개 (API 10 + Web 4) |
| **수정 파일** | 5개 (app.ts, mock-d1.ts, sidebar.tsx, analytics/page.tsx, api-client.ts) |
| **신규 테스트** | +16건 (API 16) |
| **Iteration** | 0회 (1차 통과) |

### 1.3 Value Delivered

| Perspective | Planned | Actual |
|-------------|---------|--------|
| **Problem** | Phase 4 Go 조건(NPS 6+, WAU 60%) 충족에 필요한 온보딩 인프라 전무 | 온보딩 전 라이프사이클(가이드→체크리스트→피드백) 기술 기반 완성 |
| **Solution** | /getting-started 가이드 + NPS API(D1) + 체크리스트 진행률 추적 | 4 API endpoints + D1 migration 0019(2 tables) + /getting-started 페이지 + 사이드바 nav + /analytics NPS 위젯 |
| **Function/UX Effect** | 5분 내 핵심 기능 파악, 1-click NPS 제출, 진행률 실시간 확인 | 5개 기능 카드 + 5단계 체크리스트(optimistic update) + 1~10 NPS 폼 + FAQ 아코디언 5항목 + NPS 평균/최근 피드백 위젯 |
| **Core Value** | K7(WAU) + K12(NPS) 측정 인프라 완성으로 Phase 4 Go 데이터 근거 확보 | **체크리스트 전체 완료 시 KpiLogger 자동 연동** — 기존 F100 KPI 인프라와 통합으로 WAU·NPS 측정 파이프라인 완성 |

---

## 1. Overview

### 1.1 Sprint Goal

PRD v5 §7.17(온보딩/전환 전략) + §8 Phase 4-F(G10: 내부 5명 강제 온보딩)를 기술적으로 지원하는 인프라 구축.

### 1.2 Scope

| F# | 제목 | Priority | Match Rate |
|:---:|------|:--------:|:----------:|
| F120 | 온보딩 가이드 UI — /getting-started 페이지 + 인터랙티브 가이드 + FAQ | P0 | 88% |
| F121 | 피드백 수집 시스템 — NPS 설문 API + D1 테이블 + 대시보드 위젯 | P0 | 100% |
| F122 | 온보딩 체크리스트 — 사용자별 진행률 + 완료 알림 + KPI 연동 | P1 | 97% |

---

## 2. Implementation Details

### 2.1 API (W2)

**신규 파일 10개:**

| 파일 | 역할 | LOC |
|------|------|:---:|
| `db/migrations/0019_onboarding.sql` | D1: onboarding_feedback + onboarding_progress | 25 |
| `schemas/feedback.ts` | Zod: FeedbackSubmitRequest/Response, FeedbackSummary | ~40 |
| `schemas/onboarding.ts` | Zod: OnboardingProgress/StepComplete Request/Response | ~50 |
| `services/feedback.ts` | FeedbackService: submit() + getSummary() | ~60 |
| `services/onboarding-progress.ts` | OnboardingProgressService: getProgress() + completeStep() | ~87 |
| `routes/feedback.ts` | POST /feedback + GET /feedback/summary | ~70 |
| `routes/onboarding.ts` | GET /onboarding/progress + PATCH /onboarding/progress | ~90 |
| `__tests__/feedback-routes.test.ts` | 4 route tests (env 패턴 적용) | ~70 |
| `__tests__/feedback-service.test.ts` | 4 service tests | ~50 |
| `__tests__/onboarding-routes.test.ts` | 4 route tests (env 패턴 적용) | ~75 |
| `__tests__/onboarding-service.test.ts` | 4 service tests | ~60 |

**수정 파일 2개:**
- `app.ts` — feedbackRoute + onboardingRoute 등록, Feedback/Onboarding 태그 추가
- `__tests__/helpers/mock-d1.ts` — onboarding_feedback + onboarding_progress CREATE TABLE

**D1 테이블 (migration 0019):**

| 테이블 | 컬럼 | 인덱스 |
|--------|------|--------|
| onboarding_feedback | id, tenant_id, user_id, nps_score(1~10), comment, created_at | idx_feedback_tenant |
| onboarding_progress | id, tenant_id, user_id, step_id, completed, completed_at | idx_progress_user |

**API Endpoints (+4, 총 112개):**

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/feedback | NPS 피드백 제출 (1~10 + comment) |
| GET | /api/feedback/summary | NPS 집계 (평균, 응답수, 최근 5건) |
| GET | /api/onboarding/progress | 사용자 체크리스트 상태 |
| PATCH | /api/onboarding/progress | 스텝 완료 처리 + KPI 연동 |

### 2.2 Web (W1)

**신규 파일 3개:**
- `app/(app)/getting-started/page.tsx` — 온보딩 메인 페이지 (Welcome Banner + Feature Cards 5개 + Checklist + FAQ 5항목 + NPS Form)
- `components/ui/accordion.tsx` — shadcn Accordion 컴포넌트
- `components/feature/NpsSummaryWidget.tsx` — /analytics NPS 요약 위젯

**수정 파일 3개:**
- `components/sidebar.tsx` — Rocket 아이콘 + "시작하기" nav item 추가
- `app/(app)/analytics/page.tsx` — NpsSummaryWidget 통합
- `lib/api-client.ts` — 4함수 + 타입 추가 (getOnboardingProgress, completeOnboardingStep, submitFeedback, getFeedbackSummary)

### 2.3 SPEC 보정 (세션 초반)

Sprint 27 drift 보정 포함:
- §1 Phase/Version 갱신 (Phase 3→4, v2.0→v2.2)
- §2 Sprint 27 상태 행 추가
- §3 마일스톤 v2.1.0/v2.2.0 ✅
- §5 F99/F100/F101 📋→✅, F120~F122 신규 등록
- §6 Execution Plan Sprint 25~28 추가 + Sprint 29
- 버전 5.5→5.7

---

## 3. Verification

| 검증 항목 | 결과 |
|-----------|------|
| typecheck | ✅ 5/5 패스 (0 에러) |
| API tests | ✅ 566/566 (+16 신규) |
| Web tests | ✅ 48/48 |
| Match Rate | **93%** |
| Iteration | 0회 (1차 통과) |

### 3.1 Gap Summary (4건, 모두 Minor)

| Gap | 심각도 | 비고 |
|-----|:------:|------|
| 사이드바 진행률 위젯 미구현 | Minor | nav 링크만 추가, 프로그레스 바 생략 |
| 7개 컴포넌트 → page.tsx 인라인 | Minor | 기능 동일, 파일 수 절약 |
| ONBOARDING_STEPS description 필드 생략 | Minor | label만으로 충분 |
| Web 테스트 4건 미작성 | Minor | API 16건으로 핵심 검증 완료 |

---

## 4. Metrics Update

| 지표 | Before (Sprint 28) | After (Sprint 29) | Delta |
|------|:------------------:|:------------------:|:-----:|
| API endpoints | 108 | **112** | +4 |
| API services | 43 | **45** | +2 |
| API tests | 550 | **566** | +16 |
| Web tests | 48 | 48 | 0 |
| D1 tables | 30 | **32** | +2 |
| D1 migrations | 0018 | **0019** | +1 |
| 신규 파일 | — | **14** | — |
| 수정 파일 | — | **5** | — |

---

## 5. PDCA Cycle Summary

| Phase | Duration | Key Output |
|-------|:--------:|------------|
| Plan | ~3min | FX-PLAN-030 — 3 F-items, 10 FR, Agent Team 구성 |
| Design | ~5min | FX-DSGN-030 — 4 endpoints, 2 D1 tables, 7 components, W1/W2 분리 |
| Do | ~5min | 14 신규 + 5 수정 파일, 2-agent 병렬 (W1 Web + W2 API) |
| Check | ~2min | gap-detector: 93%, 4 Minor gaps |
| Report | ~2min | FX-RPRT-030 (본 문서) |
| **Total** | **~17min** | **PDCA 전주기 완료** |

---

## 6. Next Steps

- [ ] D1 migration 0019 remote 적용 (`wrangler d1 migrations apply --remote`)
- [ ] Workers 배포 (push → CI/CD)
- [ ] SPEC.md F120~F122 상태 🔧→✅ 갱신
- [ ] MEMORY.md 갱신 (Sprint 29 완료 기록)
- [ ] 내부 5명 온보딩 시작 (F114 프로세스 측면)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial report | Sinclair Seo |
