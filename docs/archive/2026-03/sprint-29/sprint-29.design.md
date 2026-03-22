---
code: FX-DSGN-030
title: "Sprint 29 Design — 실사용자 온보딩 기반: 가이드 UI + 피드백 시스템 + 체크리스트"
version: 0.1
status: Draft
category: DSGN
system-version: 2.2.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 29 Design Document

> **Summary**: 온보딩 가이드 페이지 + NPS 피드백 API + 체크리스트 진행률 추적 — 내부 5명 온보딩 기술 기반
>
> **Project**: Foundry-X
> **Version**: 2.3.0 (target)
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft
> **Planning Doc**: [sprint-29.plan.md](../../01-plan/features/sprint-29.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 기존 패턴(Hono createRoute + Zod 스키마 + D1) 100% 준수
2. 신규 사용자가 5분 내 핵심 기능 파악 가능한 가이드 UI
3. NPS + 체크리스트 데이터를 기존 KPI 인프라(F100)와 통합
4. Agent Team 2-worker 병렬 구현 가능한 설계 (Web/API 독립)

### 1.2 Design Principles

- 기존 아키텍처 확장 (신규 패턴 도입 없음)
- KpiLogger 연동으로 측정 인프라 일관성 유지
- D1 테이블은 tenant_id 기반 멀티테넌시 준수

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Web (Next.js)                                          │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ /getting-started │  │ Sidebar      │  │ /analytics│ │
│  │ - FeatureCards   │  │ - Onboarding │  │ - NPS     │ │
│  │ - StepGuide     │  │   ProgressBar│  │   Widget  │ │
│  │ - FaqAccordion  │  └──────────────┘  └───────────┘ │
│  └──────────────────┘                                   │
│         │ api-client                                    │
├─────────┼───────────────────────────────────────────────┤
│  API (Hono Workers)                                     │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │ feedback route       │  │ onboarding route         │ │
│  │ POST /feedback       │  │ GET  /onboarding/progress│ │
│  │ GET  /feedback/summary│  │ PATCH /onboarding/progress│ │
│  └──────────┬───────────┘  └────────────┬─────────────┘ │
│  ┌──────────┴───────────┐  ┌────────────┴─────────────┐ │
│  │ FeedbackService      │  │ OnboardingProgressService │ │
│  │ - submit()           │  │ - getProgress()          │ │
│  │ - getSummary()       │  │ - completeStep()         │ │
│  └──────────┬───────────┘  │ - isAllComplete()        │ │
│             │              └────────────┬─────────────┘ │
│             │                           │               │
│  ┌──────────┴───────────────────────────┴─────────────┐ │
│  │  D1 Database                                        │ │
│  │  onboarding_feedback | onboarding_progress          │ │
│  └─────────────────────────────────────────────────────┘ │
│             │                                           │
│  ┌──────────┴─────────────┐                             │
│  │  KpiLogger (기존)      │                             │
│  │  .log('onboarding_*')  │                             │
│  └────────────────────────┘                             │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| FeedbackService | D1, KpiLogger | NPS 저장 + KPI 이벤트 |
| OnboardingProgressService | D1, KpiLogger | 체크리스트 진행 + 완료 이벤트 |
| /getting-started page | api-client | 체크리스트 상태 조회/업데이트 |
| Sidebar widget | api-client | 진행률 표시 |
| NPS widget | api-client | /analytics 페이지에 NPS 섹션 |

---

## 3. Data Model

### 3.1 D1 Migration 0019

```sql
-- ═══════════════════════════════════════════════════════
-- Migration 0019: Onboarding Feedback + Progress
-- Sprint 29: F121 + F122
-- ═══════════════════════════════════════════════════════

-- F121: NPS 피드백 수집
CREATE TABLE IF NOT EXISTS onboarding_feedback (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nps_score INTEGER NOT NULL CHECK(nps_score >= 1 AND nps_score <= 10),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant
  ON onboarding_feedback(tenant_id, created_at DESC);

-- F122: 온보딩 체크리스트 진행률
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES organizations(id),
  UNIQUE(tenant_id, user_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user
  ON onboarding_progress(tenant_id, user_id);
```

### 3.2 Entity Relationships

```
[User] 1 ──── N [onboarding_feedback]  (NPS 제출 이력)
   │
   └── 1 ──── N [onboarding_progress]  (스텝별 완료 상태)
```

### 3.3 온보딩 스텝 정의 (하드코딩)

```typescript
export const ONBOARDING_STEPS = [
  { id: 'view_dashboard', label: 'Dashboard 확인', description: '프로젝트 건강도 대시보드를 확인하세요' },
  { id: 'create_project', label: '프로젝트 연결', description: 'Git 리포지토리를 프로젝트에 연결하세요' },
  { id: 'run_agent', label: '에이전트 실행', description: '첫 에이전트 태스크를 실행하세요' },
  { id: 'check_spec', label: 'Spec 동기화', description: 'SDD Triangle 정합성을 확인하세요' },
  { id: 'submit_feedback', label: '피드백 제출', description: 'NPS 설문으로 첫인상을 공유하세요' },
] as const;
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/feedback | NPS 피드백 제출 | Required |
| GET | /api/feedback/summary | NPS 집계 (평균/응답수/최근) | Required |
| GET | /api/onboarding/progress | 현재 사용자 체크리스트 상태 | Required |
| PATCH | /api/onboarding/progress | 스텝 완료 처리 | Required |

### 4.2 Detailed Specification

#### `POST /api/feedback`

**Request:**
```json
{
  "npsScore": 8,
  "comment": "에이전트 자동 PR이 인상적이에요"
}
```

**Response (200):**
```json
{
  "success": true,
  "id": "fb_xxx",
  "npsScore": 8
}
```

#### `GET /api/feedback/summary`

**Response (200):**
```json
{
  "averageNps": 7.5,
  "totalResponses": 4,
  "recentFeedback": [
    { "npsScore": 8, "comment": "...", "createdAt": "2026-03-22T10:00:00Z" }
  ]
}
```

#### `GET /api/onboarding/progress`

**Response (200):**
```json
{
  "userId": "user_xxx",
  "completedSteps": ["view_dashboard", "create_project"],
  "totalSteps": 5,
  "progressPercent": 40,
  "steps": [
    { "id": "view_dashboard", "label": "Dashboard 확인", "completed": true, "completedAt": "..." },
    { "id": "create_project", "label": "프로젝트 연결", "completed": true, "completedAt": "..." },
    { "id": "run_agent", "label": "에이전트 실행", "completed": false, "completedAt": null },
    { "id": "check_spec", "label": "Spec 동기화", "completed": false, "completedAt": null },
    { "id": "submit_feedback", "label": "피드백 제출", "completed": false, "completedAt": null }
  ]
}
```

#### `PATCH /api/onboarding/progress`

**Request:**
```json
{
  "stepId": "run_agent",
  "completed": true
}
```

**Response (200):**
```json
{
  "success": true,
  "stepId": "run_agent",
  "progressPercent": 60,
  "allComplete": false
}
```

`allComplete: true`일 때 서버에서 자동으로 `KpiLogger.log('onboarding_complete')` 호출.

### 4.3 Zod Schemas

```typescript
// schemas/feedback.ts
export const FeedbackSubmitSchema = z.object({
  npsScore: z.number().int().min(1).max(10),
  comment: z.string().max(1000).optional(),
});

export const FeedbackSummarySchema = z.object({
  averageNps: z.number(),
  totalResponses: z.number(),
  recentFeedback: z.array(z.object({
    npsScore: z.number(),
    comment: z.string().nullable(),
    createdAt: z.string(),
  })),
});

// schemas/onboarding.ts
export const OnboardingProgressSchema = z.object({
  userId: z.string(),
  completedSteps: z.array(z.string()),
  totalSteps: z.number(),
  progressPercent: z.number(),
  steps: z.array(z.object({
    id: z.string(),
    label: z.string(),
    completed: z.boolean(),
    completedAt: z.string().nullable(),
  })),
});

export const OnboardingStepCompleteSchema = z.object({
  stepId: z.string(),
  completed: z.boolean().default(true),
});
```

---

## 5. UI/UX Design

### 5.1 /getting-started 페이지 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  Sidebar  │  Getting Started                         │
│           │                                          │
│  ...      │  ┌─ Welcome Banner ─────────────────┐   │
│  📊 Anal  │  │  "Foundry-X에 오신 것을 환영합니다" │   │
│  🚀 Start │  │  진행률: ████░░░░░░ 40% (2/5)    │   │
│           │  └──────────────────────────────────┘   │
│           │                                          │
│           │  ── 핵심 기능 소개 ──────────────────    │
│           │  ┌────────┐ ┌────────┐ ┌────────┐       │
│           │  │📊 Dash │ │🤖 Agent│ │📝 Spec │       │
│           │  │board   │ │  오케  │ │ 생성기 │       │
│           │  └────────┘ └────────┘ └────────┘       │
│           │  ┌────────┐ ┌────────┐                   │
│           │  │🏗️ Arch │ │📖 Wiki │                   │
│           │  │itecture│ │        │                   │
│           │  └────────┘ └────────┘                   │
│           │                                          │
│           │  ── 시작하기 체크리스트 ─────────────    │
│           │  ✅ Dashboard 확인                       │
│           │  ✅ 프로젝트 연결                        │
│           │  ⬜ 에이전트 실행                        │
│           │  ⬜ Spec 동기화                          │
│           │  ⬜ 피드백 제출                          │
│           │                                          │
│           │  ── FAQ ────────────────────────────     │
│           │  ▶ Foundry-X는 뭔가요?                   │
│           │  ▶ Git 리포지토리를 어떻게 연결하나요?    │
│           │  ▶ 에이전트는 어떤 일을 하나요?           │
│           │  ...                                     │
└─────────────────────────────────────────────────────┘
```

### 5.2 사이드바 온보딩 위젯

```
┌─────────────────┐
│  Foundry-X      │
│  ─────────────  │
│  📊 Dashboard   │
│  📖 Wiki        │
│  ...            │
│  📊 Analytics   │
│  🚀 시작하기    │ ← 신규 nav item
│  ─────────────  │
│  ┌─ Onboarding ┐│
│  │ ██░░░ 40%   ││ ← 미완료 시만 표시
│  │ 다음: 에이전트││
│  └─────────────┘│
└─────────────────┘
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| GettingStartedPage | `app/(app)/getting-started/page.tsx` | 온보딩 메인 페이지 |
| FeatureCard | `components/feature/FeatureCard.tsx` | 기능 소개 카드 (아이콘 + 설명 + 링크) |
| OnboardingChecklist | `components/feature/OnboardingChecklist.tsx` | 체크리스트 UI (스텝별 체크박스) |
| FaqAccordion | `components/feature/FaqAccordion.tsx` | FAQ 아코디언 (shadcn Accordion) |
| OnboardingProgress | `components/feature/OnboardingProgress.tsx` | 사이드바 진행률 위젯 |
| NpsFeedbackForm | `components/feature/NpsFeedbackForm.tsx` | NPS 점수 + 코멘트 폼 |
| NpsSummaryWidget | `components/feature/NpsSummaryWidget.tsx` | /analytics NPS 요약 위젯 |

### 5.4 api-client 함수

```typescript
// lib/api-client.ts 에 추가
export async function submitFeedback(data: { npsScore: number; comment?: string }) { ... }
export async function getFeedbackSummary() { ... }
export async function getOnboardingProgress() { ... }
export async function completeOnboardingStep(stepId: string) { ... }
```

---

## 6. Error Handling

| Code | Scenario | Handling |
|------|----------|----------|
| 400 | npsScore 범위 초과 (1~10) | Zod 유효성 검사 → 에러 메시지 |
| 400 | 존재하지 않는 stepId | ONBOARDING_STEPS에서 검증 |
| 401 | 미인증 접근 | JWT 미들웨어 (기존 패턴) |
| 409 | 이미 완료된 스텝 재완료 | UPSERT로 멱등 처리 (에러 아님) |

---

## 7. Security Considerations

- [x] Zod 스키마 입력 검증 (기존 패턴)
- [x] JWT 인증 필수 (모든 엔드포인트)
- [x] tenant_id 기반 격리 (tenantGuard 미들웨어)
- [x] npsScore 범위 제한 (1~10, 정수만)
- [x] comment 길이 제한 (1000자)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Count |
|------|--------|------|:-----:|
| Unit Test | FeedbackService, OnboardingProgressService | Vitest | 8건 |
| Integration Test | feedback route, onboarding route | Vitest + app.request() | 8건 |
| Web Test | 페이지 렌더링 + 컴포넌트 | Vitest | 4건 |

### 8.2 API Test Cases

**feedback route (4건):**
- POST /feedback — 유효한 NPS 제출 → 200 + id
- POST /feedback — npsScore 범위 초과 → 400
- POST /feedback — 미인증 → 401
- GET /feedback/summary — 집계 조회 → averageNps + totalResponses

**onboarding route (4건):**
- GET /onboarding/progress — 초기 상태 조회 → 0% + 빈 completedSteps
- PATCH /onboarding/progress — 스텝 완료 → progressPercent 증가
- PATCH /onboarding/progress — 존재하지 않는 stepId → 400
- PATCH /onboarding/progress — 전체 완료 → allComplete: true + KPI 이벤트

**서비스 테스트 (8건):**
- FeedbackService.submit() — 정상 저장 + ID 반환
- FeedbackService.submit() — 같은 사용자 다중 제출 가능
- FeedbackService.getSummary() — 평균 계산 정확도
- FeedbackService.getSummary() — 데이터 없을 때 기본값
- OnboardingProgressService.getProgress() — 신규 사용자 초기 상태
- OnboardingProgressService.completeStep() — 스텝 완료 + completedAt 기록
- OnboardingProgressService.completeStep() — 중복 완료 멱등성
- OnboardingProgressService.isAllComplete() — 전체 완료 판정 + KPI 연동

---

## 9. Implementation Order (Agent Team)

### W1 (Web) — 파일 목록

```
packages/web/src/
├── app/(app)/getting-started/
│   └── page.tsx                          # 신규: 온보딩 가이드 페이지
├── components/feature/
│   ├── FeatureCard.tsx                   # 신규: 기능 소개 카드
│   ├── OnboardingChecklist.tsx           # 신규: 체크리스트 UI
│   ├── FaqAccordion.tsx                  # 신규: FAQ 아코디언
│   ├── OnboardingProgress.tsx            # 신규: 사이드바 진행률 위젯
│   ├── NpsFeedbackForm.tsx              # 신규: NPS 폼
│   └── NpsSummaryWidget.tsx             # 신규: /analytics NPS 위젯
├── components/sidebar.tsx                # 수정: Getting Started 링크 + 위젯
├── app/(app)/analytics/page.tsx          # 수정: NPS 섹션 추가
└── lib/api-client.ts                     # 수정: 4함수 추가
```

### W2 (API) — 파일 목록

```
packages/api/src/
├── db/migrations/
│   └── 0019_onboarding.sql              # 신규: 2 테이블
├── routes/
│   ├── feedback.ts                       # 신규: 2 endpoints
│   └── onboarding.ts                     # 신규: 2 endpoints
├── services/
│   ├── feedback.ts                       # 신규: FeedbackService
│   └── onboarding-progress.ts            # 신규: OnboardingProgressService
├── schemas/
│   ├── feedback.ts                       # 신규: Zod 스키마
│   └── onboarding.ts                     # 신규: Zod 스키마
├── index.ts                              # 수정: 라우트 등록
└── __tests__/
    ├── feedback-routes.test.ts           # 신규: 4건
    ├── feedback-service.test.ts          # 신규: 4건
    ├── onboarding-routes.test.ts         # 신규: 4건
    └── onboarding-service.test.ts        # 신규: 4건
```

### 구현 순서

```
Phase 1 (W2 선행):
  1. D1 migration 0019
  2. Zod schemas (feedback.ts, onboarding.ts)
  3. Services (FeedbackService, OnboardingProgressService)
  4. Routes (feedback, onboarding) + index.ts 등록
  5. Tests (16건)

Phase 2 (W1 병렬):
  1. api-client 함수 4개 추가
  2. 컴포넌트 7개 구현
  3. /getting-started 페이지
  4. sidebar.tsx 수정 (nav + 위젯)
  5. /analytics 페이지 NPS 위젯 추가

Phase 3 (통합):
  1. typecheck 5패키지
  2. PDCA Gap Analysis
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | Sinclair Seo |
