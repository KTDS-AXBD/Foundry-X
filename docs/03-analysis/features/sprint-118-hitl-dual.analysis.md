---
code: FX-ANLS-118
title: Sprint 118 Gap Analysis — 사업계획서 HITL + Prototype HITL (F292+F297)
version: 1.0
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 118
f-items: F292, F297
match-rate: 100
---

# Sprint 118 Gap Analysis — F292+F297 HITL Dual

> **Design**: [[FX-DSGN-118]] | **Plan**: [[FX-PLAN-118]]
> **Match Rate**: **100% (29/29 PASS)**

---

## 1. Summary

| Category | Items | Pass | Fail | Rate |
|----------|------:|-----:|-----:|-----:|
| D1 Migration (§2) | 4 | 4 | 0 | 100% |
| API Schema (§3.1) | 2 | 2 | 0 | 100% |
| API Services (§3.2-3.3) | 6 | 6 | 0 | 100% |
| API Routes (§3.4) | 6 | 6 | 0 | 100% |
| Web Components (§4.1) | 3 | 3 | 0 | 100% |
| Web Pages (§4.2-4.3) | 2 | 2 | 0 | 100% |
| Sidebar + Router (§4.4-4.5) | 2 | 2 | 0 | 100% |
| API Tests (§6.1) | 2 | 2 | 0 | 100% |
| Web Tests (§6.2) | 1 | 1 | 0 | 100% |
| Success Criteria (§7) | 1 | 1 | 0 | 100% |
| **Total** | **29** | **29** | **0** | **100%** |

---

## 2. Detail

### 2.1 D1 Migration — 4/4 PASS

| Item | Status | Notes |
|------|:------:|-------|
| bdp_section_reviews 테이블 | PASS | 8 컬럼 + FK + INDEX |
| prototype_section_reviews 테이블 | PASS | 9 컬럼 (framework 추가) + FK + INDEX |
| idx_bdp_section_reviews_bdp 인덱스 | PASS | |
| idx_proto_section_reviews_proto 인덱스 | PASS | |

### 2.2 API Schema — 2/2 PASS

| Item | Status | Notes |
|------|:------:|-------|
| sectionReviewSchema | PASS | action(3종) + sectionId + comment(optional) |
| sectionReviewQuerySchema | PASS | limit + offset with defaults |

### 2.3 API Services — 6/6 PASS

| Service | Method | Status |
|---------|--------|:------:|
| BdpReviewService | reviewSection | PASS |
| BdpReviewService | listReviews | PASS |
| BdpReviewService | getSummary | PASS |
| PrototypeReviewService | reviewSection | PASS |
| PrototypeReviewService | listReviews | PASS |
| PrototypeReviewService | getSummary | PASS |

### 2.4 API Routes — 6/6 PASS

| Endpoint | Status |
|----------|:------:|
| POST /api/bdp/:bizItemId/sections/:sectionId/review | PASS |
| GET /api/bdp/:bizItemId/reviews | PASS |
| GET /api/bdp/:bizItemId/review-summary | PASS |
| POST /api/ax-bd/prototypes/:id/sections/:sectionId/review | PASS |
| GET /api/ax-bd/prototypes/:id/reviews | PASS |
| GET /api/ax-bd/prototypes/:id/review-summary | PASS |

### 2.5 Web Components — 3/3 PASS

| Component | Status | Notes |
|-----------|:------:|-------|
| HitlSectionReview | PASS | entityType별 API 분기, 3버튼 + 코멘트 |
| ReviewStatusBadge | PASS | 4종 상태 매핑 |
| ReviewSummaryBar | PASS | 진행률 바 + 색상 세그먼트 |

### 2.6 Web Pages — 2/2 PASS

| Page | Status | Notes |
|------|:------:|-------|
| bdp-detail.tsx (F292) | PASS | HITL 패널 + 섹션 파싱 + 요약 바 |
| shaping-prototype.tsx (F297) | PASS | 목록/상세 + 프레임워크 선택 + HITL |

### 2.7 Sidebar + Router — 2/2 PASS

| Item | Status | Notes |
|------|:------:|-------|
| Sidebar Prototype 메뉴 | PASS | Code 아이콘 + /shaping/prototype |
| Router 등록 | PASS | lazy import shaping-prototype |

### 2.8 Tests — 3/3 PASS

| Test File | Tests | Status |
|-----------|------:|:------:|
| bdp-review.test.ts | 8 | PASS |
| prototype-review.test.ts | 8 | PASS |
| hitl-components.test.tsx | 8 | PASS |

---

## 3. Deviations

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| BDP 페이지 경로 | `shaping-proposal-detail.tsx` | `routes/ax-bd/bdp-detail.tsx` | None — 기존 파일이 실제 BDP 상세 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial gap analysis — 100% match | Sinclair Seo |
