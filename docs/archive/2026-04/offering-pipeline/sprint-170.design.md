---
code: FX-DSGN-S170
title: "Sprint 170 Design — 섹션 에디터 + 교차검증 대시보드"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S170]], [[FX-DSGN-S168]], [[FX-SPEC-001]]"
---

# Sprint 170 Design: 섹션 에디터 + 교차검증 대시보드

## 1. Overview

Sprint 167-168에서 구축한 Offering API 인프라(Sections CRUD, Export HTML, Validate) 위에 프론트엔드 UI를 구현한다.

- **F376**: 섹션 에디터 + 실시간 HTML 프리뷰 — 좌우 분할 레이아웃
- **F377**: 교차검증 대시보드 — GAN/Six Hats/Expert 시각화

## 2. F376: 섹션 에디터 + HTML 프리뷰

### 2-1. 페이지 구조

```
┌──────────────────────────────────────────────────────────┐
│ ← Offering: {title}                    [프리뷰] [검증]    │
├────────────────────────┬─────────────────────────────────┤
│ 섹션 리스트             │ HTML 프리뷰 (iframe srcdoc)      │
│ ┌────────────────────┐ │                                 │
│ │ ☑ Hero [필수]      │ │  ┌─────────────────────────┐   │
│ │ ☑ Exec Summary     │ │  │  사업기획서 HTML 렌더링   │   │
│ │ ☑ 추진 배경        │ │  │                         │   │
│ │ ☐ 기존 사업 현황    │ │  │  섹션별 콘텐츠...       │   │
│ │ ...                │ │  │                         │   │
│ ├────────────────────┤ │  └─────────────────────────┘   │
│ │ 섹션 에디터 (선택)  │ │                                 │
│ │ ┌────────────────┐ │ │                                 │
│ │ │ 제목: [       ] │ │ │                                 │
│ │ │ ────────────── │ │ │                                 │
│ │ │ 마크다운 편집   │ │ │                                 │
│ │ │               │ │ │                                 │
│ │ └────────────────┘ │ │                                 │
│ │ [저장] [취소]       │ │                                 │
│ └────────────────────┘ │                                 │
└────────────────────────┴─────────────────────────────────┘
```

### 2-2. API 호출 흐름

```
Page Mount
  ├─ GET /offerings/:id → offering 메타 (title, status, purpose)
  ├─ GET /offerings/:id/sections → 섹션 리스트
  └─ GET /offerings/:id/export?format=html → 프리뷰 HTML

섹션 선택 → 에디터 표시

저장 클릭
  ├─ PUT /offerings/:id/sections/:sectionId → { title?, content? }
  └─ GET /offerings/:id/export?format=html → 프리뷰 갱신

포함/제외 토글
  ├─ PUT /offerings/:id/sections/:sectionId → { isIncluded: boolean }
  └─ GET /offerings/:id/export?format=html → 프리뷰 갱신

순서 변경 (위/아래 버튼)
  ├─ PUT /offerings/:id/sections/reorder → { sectionIds: [...] }
  └─ GET /offerings/:id/export?format=html → 프리뷰 갱신
```

### 2-3. API 확장 (최소)

`PUT /offerings/:id/sections/:sectionId`에 `isIncluded` 필드를 추가해야 한다:

```typescript
// offering-section.schema.ts — UpdateSectionSchema 확장
export const UpdateSectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  isIncluded: z.boolean().optional(),  // ← 추가
});
```

```typescript
// offering-section-service.ts — update() 메서드에 isIncluded 처리 추가
if (input.isIncluded !== undefined) {
  sets.push("is_included = ?");
  params.push(input.isIncluded ? 1 : 0);
}
```

### 2-4. api-client 확장

```typescript
// lib/api-client.ts — 새 함수 추가

// Offering 단건 조회
export async function fetchOffering(id: string): Promise<Offering> {
  return fetchApi(`/offerings/${id}`);
}

// Offering 섹션 목록
export async function fetchOfferingSections(offeringId: string): Promise<OfferingSection[]> {
  const res = await fetchApi<{ sections: OfferingSection[] }>(`/offerings/${offeringId}/sections`);
  return res.sections;
}

// 섹션 수정
export async function updateOfferingSection(
  offeringId: string,
  sectionId: string,
  data: { title?: string; content?: string; isIncluded?: boolean },
): Promise<OfferingSection> {
  return putApi(`/offerings/${offeringId}/sections/${sectionId}`, data);
}

// 섹션 순서 변경
export async function reorderOfferingSections(
  offeringId: string,
  sectionIds: string[],
): Promise<void> {
  await putApi(`/offerings/${offeringId}/sections/reorder`, { sectionIds });
}

// HTML 프리뷰
export async function fetchOfferingHtmlPreview(offeringId: string): Promise<string> {
  const baseUrl = import.meta.env.VITE_API_URL || "/api";
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${baseUrl}/offerings/${offeringId}/export?format=html`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return res.text();
}

// 검증 실행
export async function triggerOfferingValidation(
  offeringId: string,
  mode: "full" | "quick" = "full",
): Promise<OfferingValidation> {
  return postApi(`/offerings/${offeringId}/validate`, { mode });
}

// 검증 히스토리
export async function fetchOfferingValidations(offeringId: string): Promise<OfferingValidation[]> {
  const res = await fetchApi<{ validations: OfferingValidation[] }>(`/offerings/${offeringId}/validations`);
  return res.validations;
}
```

### 2-5. 타입 정의

```typescript
// lib/api-client.ts 상단에 타입 추가

export interface Offering {
  id: string;
  orgId: string;
  bizItemId: string;
  title: string;
  purpose: "report" | "proposal" | "review";
  format: "html" | "pptx";
  status: "draft" | "generating" | "review" | "approved" | "shared";
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferingSection {
  id: string;
  offeringId: string;
  sectionKey: string;
  title: string;
  content: string | null;
  sortOrder: number;
  isRequired: boolean;
  isIncluded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfferingValidation {
  id: string;
  offeringId: string;
  orgId: string;
  mode: "full" | "quick";
  status: "running" | "passed" | "failed" | "error";
  ogdRunId: string | null;
  ganScore: number | null;
  ganFeedback: string | null;
  sixhatsSummary: string | null;
  expertSummary: string | null;
  overallScore: number | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}
```

### 2-6. 컴포넌트 분리

| 컴포넌트 | 파일 | 역할 |
|---------|------|------|
| SectionList | `components/feature/offering-editor/section-list.tsx` | 섹션 목록 — 선택, 포함 토글, 순서 이동 |
| SectionEditor | `components/feature/offering-editor/section-editor.tsx` | 마크다운 textarea 에디터 + 저장/취소 |
| HtmlPreview | `components/feature/offering-editor/html-preview.tsx` | iframe srcdoc 기반 HTML 프리뷰 |

## 3. F377: 교차검증 대시보드

### 3-1. 페이지 구조

```
┌──────────────────────────────────────────────────────────┐
│ ← Offering: {title}                    [에디터] [검증]    │
├──────────────────────────────────────────────────────────┤
│ [검증 시작 (full)] [검증 시작 (quick)]                      │
├──────────────────────────────────────────────────────────┤
│ 최신 검증 결과                                            │
│ ┌─────────────────┐ ┌─────────────────┐                  │
│ │ Overall Score    │ │ GAN Score       │                  │
│ │ ████████░░ 78%   │ │ ████████░░ 82%  │                  │
│ │ Status: passed   │ │                 │                  │
│ └─────────────────┘ └─────────────────┘                  │
│                                                          │
│ GAN 교차검증                                              │
│ ┌────────────────────────────────────────────────────┐    │
│ │ 추진론 (Generator 관점)      │ 반대론 (Discriminator)  │    │
│ │ • 시장 성장성 확인...        │ • 경쟁 리스크 미약...   │    │
│ └────────────────────────────────────────────────────┘    │
│                                                          │
│ Six Hats 분석                                            │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │⚪흰색│ │🔴빨강│ │⚫검정│ │🟡노랑│ │🟢초록│ │🔵파랑│   │
│ │사실  │ │감정  │ │비판  │ │낙관  │ │창의  │ │관리  │   │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
│                                                          │
│ Expert 리뷰 (5종)                                        │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│ │TA    │ │AA    │ │CA    │ │DA    │ │QA    │             │
│ │기술  │ │앱    │ │클라우│ │데이터│ │품질  │             │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
│                                                          │
│ 검증 히스토리                                             │
│ ┌────────────────────────────────────────────────────┐    │
│ │ #3 | 2026-04-06 | full | passed | 82% | 상세 보기  │    │
│ │ #2 | 2026-04-05 | quick | failed | 45% | 상세 보기 │    │
│ │ #1 | 2026-04-04 | full | passed | 76% | 상세 보기  │    │
│ └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 3-2. JSON 파싱 전략

`ganFeedback`, `sixhatsSummary`, `expertSummary`는 JSON string으로 D1에 저장됨:

```typescript
// ganFeedback 파싱
interface GanFeedbackParsed {
  generator: { points: string[] };   // 추진론
  discriminator: { points: string[] }; // 반대론
}

// sixhatsSummary 파싱
interface SixHatsParsed {
  white: string;   // 사실/데이터
  red: string;     // 감정/직관
  black: string;   // 비판/리스크
  yellow: string;  // 낙관/이점
  green: string;   // 창의/대안
  blue: string;    // 관리/프로세스
}

// expertSummary 파싱
interface ExpertParsed {
  ta?: string;   // Technical Architect
  aa?: string;   // Application Architect
  ca?: string;   // Cloud Architect
  da?: string;   // Data Architect
  qa?: string;   // Quality Assurance
}
```

안전한 파싱: `JSON.parse()` 실패 시 원본 문자열을 그대로 표시.

### 3-3. 컴포넌트 분리

| 컴포넌트 | 파일 | 역할 |
|---------|------|------|
| ValidationDashboard | `routes/offering-validate.tsx` | 전체 대시보드 페이지 |
| ScoreBar | `components/feature/offering-validate/score-bar.tsx` | 진행 바 + 수치 표시 |
| GanPanel | `components/feature/offering-validate/gan-panel.tsx` | 추진론/반대론 좌우 분할 |
| SixHatsGrid | `components/feature/offering-validate/six-hats-grid.tsx` | 6색 카드 그리드 |
| ExpertCards | `components/feature/offering-validate/expert-cards.tsx` | 5종 전문가 카드 |
| ValidationHistory | `components/feature/offering-validate/validation-history.tsx` | 검증 히스토리 테이블 |

## 4. 라우터 변경

```typescript
// router.tsx — 3단계 형상화 (shaping) 섹션에 추가
{ path: "shaping/offering/:id/edit", lazy: () => import("@/routes/offering-editor") },
{ path: "shaping/offering/:id/validate", lazy: () => import("@/routes/offering-validate") },
```

## 5. 파일 매핑 (구현 순서)

### Worker 매핑 없음 — 단일 구현

파일 수가 관리 가능하고 상호 의존성이 높아 단일 구현이 효율적.

| # | 파일 | F | 작업 |
|---|------|---|------|
| 1 | `packages/api/src/schemas/offering-section.schema.ts` | F376 | UpdateSectionSchema에 isIncluded 추가 |
| 2 | `packages/api/src/services/offering-section-service.ts` | F376 | update()에 isIncluded 처리 |
| 3 | `packages/web/src/lib/api-client.ts` | F376+F377 | Offering 타입 + 7개 함수 추가 |
| 4 | `packages/web/src/components/feature/offering-editor/section-list.tsx` | F376 | 섹션 리스트 컴포넌트 |
| 5 | `packages/web/src/components/feature/offering-editor/section-editor.tsx` | F376 | 마크다운 에디터 |
| 6 | `packages/web/src/components/feature/offering-editor/html-preview.tsx` | F376 | iframe 프리뷰 |
| 7 | `packages/web/src/routes/offering-editor.tsx` | F376 | 에디터 페이지 |
| 8 | `packages/web/src/components/feature/offering-validate/score-bar.tsx` | F377 | 점수 바 |
| 9 | `packages/web/src/components/feature/offering-validate/gan-panel.tsx` | F377 | GAN 패널 |
| 10 | `packages/web/src/components/feature/offering-validate/six-hats-grid.tsx` | F377 | 6색 카드 |
| 11 | `packages/web/src/components/feature/offering-validate/expert-cards.tsx` | F377 | 전문가 카드 |
| 12 | `packages/web/src/components/feature/offering-validate/validation-history.tsx` | F377 | 히스토리 |
| 13 | `packages/web/src/routes/offering-validate.tsx` | F377 | 검증 대시보드 페이지 |
| 14 | `packages/web/src/router.tsx` | F376+F377 | 라우트 등록 2건 |
| 15 | `packages/api/src/__tests__/offering-section-update.test.ts` | F376 | isIncluded 업데이트 테스트 |

## 6. 테스트 전략

| 영역 | 테스트 |
|------|--------|
| API | isIncluded PUT 업데이트 테스트 (기존 offering-sections 테스트 확장) |
| typecheck | turbo typecheck 통과 |
| lint | turbo lint 통과 |
| regression | 기존 테스트 전체 통과 |
