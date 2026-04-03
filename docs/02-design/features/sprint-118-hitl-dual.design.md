---
code: FX-DSGN-118
title: Sprint 118 — 사업계획서 HITL + Prototype HITL Design (F292+F297)
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 118
f-items: F292, F297
phase: "Phase 11-B/C"
---

# Sprint 118 Design — 사업계획서 HITL + Prototype HITL (F292+F297)

> **Plan**: [[FX-PLAN-118]]
> **Pattern**: F286 ShapingReviewService 패턴을 BDP/Prototype에 확장 적용

---

## 1. Overview

F286에서 구현한 형상화 HITL(섹션별 승인/수정/반려) 패턴을 사업계획서(BDP)와 Prototype에 확장.
핵심: 공유 HITL 컴포넌트 추출 + 도메인별 리뷰 서비스 추가.

### 1.1 변경 범위 요약

| 영역 | 신규 | 수정 | 삭제 |
|------|------|------|------|
| D1 Migration | 1 (0087) | - | - |
| API Schema | 1 | - | - |
| API Service | 2 | - | - |
| API Route | - | 2 (bdp.ts, ax-bd-prototypes.ts) | - |
| Web Component | 3 (HITL 공유) | 1 (sidebar.tsx) | - |
| Web Route | 1 (shaping-prototype.tsx) | 1 (shaping-proposal-detail.tsx) | - |
| Test | 2 (API) + 1 (Web) | - | - |

---

## 2. Database — D1 Migration 0087

파일: `packages/api/src/db/migrations/0087_hitl_section_reviews.sql`

```sql
-- F292: BDP 섹션 리뷰
CREATE TABLE IF NOT EXISTS bdp_section_reviews (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  bdp_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_bdp_section_reviews_bdp ON bdp_section_reviews(bdp_id);

-- F297: Prototype 섹션 리뷰
CREATE TABLE IF NOT EXISTS prototype_section_reviews (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  prototype_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  comment TEXT,
  framework TEXT NOT NULL DEFAULT 'react',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_proto_section_reviews_proto ON prototype_section_reviews(prototype_id);
```

---

## 3. API Layer

### 3.1 공유 HITL Schema

파일: `packages/api/src/schemas/hitl-section.schema.ts`

```typescript
import { z } from "zod";

export const sectionReviewSchema = z.object({
  action: z.enum(["approved", "revision_requested", "rejected"]),
  sectionId: z.string().min(1).max(200),
  comment: z.string().max(5000).optional(),
});

export type SectionReviewInput = z.infer<typeof sectionReviewSchema>;

export const sectionReviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
```

### 3.2 BDP Review Service (F292)

파일: `packages/api/src/services/bdp-review-service.ts`

```typescript
export class BdpReviewService {
  constructor(private db: D1Database) {}

  // 섹션 리뷰 제출 (approved/revision_requested/rejected)
  async reviewSection(orgId: string, bdpId: string, input: SectionReviewInput, reviewerId: string)
    → { id, bdpId, sectionId, status, reviewerId, comment, createdAt }

  // 특정 BDP의 모든 섹션 리뷰 조회
  async listReviews(orgId: string, bdpId: string)
    → SectionReview[]

  // 섹션별 최신 상태 요약 (approved/pending/rejected 카운트)
  async getSummary(orgId: string, bdpId: string)
    → { total, approved, pending, rejected, revisionRequested }
}
```

**로직**:
- `reviewSection`: INSERT into `bdp_section_reviews` + 결과 반환
- `listReviews`: bdp_id 기준 전체 조회 (최신순)
- `getSummary`: GROUP BY status 집계

### 3.3 Prototype Review Service (F297)

파일: `packages/api/src/services/prototype-review-service.ts`

```typescript
export class PrototypeReviewService {
  constructor(private db: D1Database) {}

  // 섹션 리뷰 제출
  async reviewSection(orgId: string, prototypeId: string, input: SectionReviewInput, reviewerId: string, framework?: string)
    → { id, prototypeId, sectionId, status, framework, reviewerId, comment, createdAt }

  // 특정 Prototype의 모든 섹션 리뷰 조회
  async listReviews(orgId: string, prototypeId: string)
    → SectionReview[]

  // 섹션별 최신 상태 요약
  async getSummary(orgId: string, prototypeId: string)
    → { total, approved, pending, rejected, revisionRequested }
}
```

### 3.4 Route 변경

#### bdp.ts — 3 엔드포인트 추가

```
POST /api/bdp/:bizItemId/sections/:sectionId/review  ← 섹션 리뷰 제출
GET  /api/bdp/:bizItemId/reviews                      ← 리뷰 목록
GET  /api/bdp/:bizItemId/review-summary               ← 상태 요약
```

#### ax-bd-prototypes.ts — 3 엔드포인트 추가

```
POST /api/ax-bd/prototypes/:id/sections/:sectionId/review  ← 섹션 리뷰 제출
GET  /api/ax-bd/prototypes/:id/reviews                      ← 리뷰 목록
GET  /api/ax-bd/prototypes/:id/review-summary               ← 상태 요약
```

---

## 4. Web Layer

### 4.1 HITL 공유 컴포넌트 (F286에서 추출)

디렉토리: `packages/web/src/components/feature/hitl/`

#### HitlSectionReview.tsx
- Props: `{ entityId, entityType: 'bdp' | 'prototype', sectionId, onReview }`
- 기존 `SectionReviewAction.tsx` 로직을 일반화
- 3 버튼 (승인/수정요청/반려) + 조건부 코멘트 입력
- API 호출 경로를 `entityType`에 따라 분기

#### ReviewStatusBadge.tsx
- Props: `{ status: 'approved' | 'pending' | 'revision_requested' | 'rejected' }`
- 색상: approved=green, pending=gray, revision_requested=yellow, rejected=red

#### ReviewSummaryBar.tsx
- Props: `{ summary: { total, approved, pending, rejected, revisionRequested } }`
- 진행률 바 + 숫자 표시

### 4.2 BDP HITL 페이지 (F292)

파일: `packages/web/src/routes/shaping-proposal-detail.tsx` (수정)

- BDP 상세 페이지에 HITL 패널 추가
- 섹션 목록 + 각 섹션별 `HitlSectionReview` + `ReviewStatusBadge`
- 상단에 `ReviewSummaryBar`
- BDP content를 섹션 단위로 파싱 (## 헤더 기준)

### 4.3 Prototype HITL 페이지 (F297)

파일: `packages/web/src/routes/shaping-prototype.tsx` (신규)

- 경로: `/shaping/prototype`
- Prototype 목록 + 클릭 시 상세 + HITL 에디터
- 프레임워크 선택 (React/Vue/HTML) — 표시용
- 각 섹션별 `HitlSectionReview` + `ReviewStatusBadge`

### 4.4 Sidebar 변경

파일: `packages/web/src/components/sidebar.tsx`

3단계 형상화 그룹에 "Prototype" 메뉴 추가:
```
{ href: "/shaping/prototype", label: "Prototype", icon: Code }
```

### 4.5 Router 변경

파일: `packages/web/src/router.tsx` 또는 라우트 설정 파일에 `/shaping/prototype` 등록.

---

## 5. Implementation Order

| 순서 | 작업 | 파일 | 예상 라인 |
|------|------|------|----------|
| 1 | D1 마이그레이션 | `migrations/0087_hitl_section_reviews.sql` | ~25 |
| 2 | 공유 HITL 스키마 | `schemas/hitl-section.schema.ts` | ~20 |
| 3 | BDP Review Service | `services/bdp-review-service.ts` | ~90 |
| 4 | Prototype Review Service | `services/prototype-review-service.ts` | ~95 |
| 5 | BDP Route 확장 | `routes/bdp.ts` (수정) | +50 |
| 6 | Prototype Route 확장 | `routes/ax-bd-prototypes.ts` (수정) | +50 |
| 7 | API 테스트 (BDP HITL) | `__tests__/bdp-review.test.ts` | ~120 |
| 8 | API 테스트 (Proto HITL) | `__tests__/prototype-review.test.ts` | ~120 |
| 9 | Web HITL 공유 컴포넌트 | `components/feature/hitl/*.tsx` | ~130 |
| 10 | BDP HITL 페이지 수정 | `routes/shaping-proposal-detail.tsx` | +60 |
| 11 | Prototype HITL 페이지 | `routes/shaping-prototype.tsx` | ~120 |
| 12 | Sidebar + Router | `sidebar.tsx` + router 수정 | +5 |

---

## 6. Test Strategy

### 6.1 API Tests

**bdp-review.test.ts** (~120 lines):
- POST review → 201 + 올바른 status
- POST review with comment → comment 저장 확인
- GET reviews → 리스트 반환
- GET review-summary → 집계 정확성
- 인증 없이 → 401

**prototype-review.test.ts** (~120 lines):
- POST review → 201 + framework 기본값 'react'
- POST review with framework → 지정 framework 저장
- GET reviews → 리스트 반환
- GET review-summary → 집계 정확성
- 인증 없이 → 401

### 6.2 Web Tests

**hitl-components.test.tsx** (~80 lines):
- HitlSectionReview 렌더링 + 버튼 존재
- ReviewStatusBadge 색상 매핑
- ReviewSummaryBar 퍼센트 계산

---

## 7. Success Criteria

- [ ] BDP 섹션 리뷰 CRUD 동작 (3 endpoints)
- [ ] Prototype 섹션 리뷰 CRUD 동작 (3 endpoints)
- [ ] HITL 공유 컴포넌트 3종 생성
- [ ] Prototype 페이지 + 사이드바 메뉴
- [ ] 기존 테스트 전체 통과 + typecheck + build
- [ ] 신규 테스트 전체 통과

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial design — F292+F297 HITL dual | Sinclair Seo |
