---
code: FX-RPRT-S118
title: Sprint 118 완료 보고서 — 사업계획서 HITL + Prototype HITL (F292+F297)
version: 1.0
status: Active
category: RPRT
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 118
f-items: F292, F297
match-rate: 100
---

# Sprint 118 완료 보고서 — F292+F297

---

## Executive Summary

| Field | Value |
|-------|-------|
| **Feature** | F292 사업계획서 HITL + F297 Prototype HITL |
| **Sprint** | 118 |
| **Phase** | Phase 11-B/C (기능 확장 + 고도화) |
| **Duration** | ~15분 (autopilot) |
| **Match Rate** | 100% (29/29 PASS) |

| Perspective | Content |
|-------------|---------|
| **Problem** | 사업계획서와 Prototype에 체계적 검토 UI가 없어 AI 초안을 사용자가 검증할 수 없었음 |
| **Solution** | F286 HITL 에디터 패턴을 공유 컴포넌트로 추출 → BDP/Prototype에 적용 |
| **Function/UX Effect** | 섹션별 승인/수정/반려 + 진행률 시각화 + 프레임워크 선택 |
| **Core Value** | Human-in-the-Loop 패턴이 형상화 전 단계에 확산 — 품질과 신뢰 동시 확보 |

---

## Results

### 신규 파일 (15개)

| Category | File | Lines |
|----------|------|------:|
| Migration | `0087_hitl_section_reviews.sql` | 25 |
| Schema | `hitl-section.schema.ts` | 15 |
| Service | `bdp-review-service.ts` | 100 |
| Service | `prototype-review-service.ts` | 105 |
| Web Component | `HitlSectionReview.tsx` | 85 |
| Web Component | `ReviewStatusBadge.tsx` | 22 |
| Web Component | `ReviewSummaryBar.tsx` | 50 |
| Web Page | `shaping-prototype.tsx` | 135 |
| Test | `bdp-review.test.ts` | 150 |
| Test | `prototype-review.test.ts` | 165 |
| Test | `hitl-components.test.tsx` | 65 |
| Design | `sprint-118-hitl-dual.design.md` | 190 |
| Analysis | `sprint-118-hitl-dual.analysis.md` | 115 |
| Report | `sprint-118-hitl-dual.report.md` | - |

### 수정 파일 (4개)

| File | Changes |
|------|---------|
| `routes/bdp.ts` | +3 endpoints (F292 HITL) |
| `routes/ax-bd-prototypes.ts` | +3 endpoints (F297 HITL) |
| `routes/ax-bd/bdp-detail.tsx` | HITL 패널 추가 |
| `sidebar.tsx` | Prototype 메뉴 추가 |
| `router.tsx` | /shaping/prototype 등록 |

### API Endpoints 추가 (+6)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/bdp/:bizItemId/sections/:sectionId/review` | BDP 섹션 리뷰 |
| GET | `/api/bdp/:bizItemId/reviews` | BDP 리뷰 목록 |
| GET | `/api/bdp/:bizItemId/review-summary` | BDP 리뷰 요약 |
| POST | `/api/ax-bd/prototypes/:id/sections/:sectionId/review` | Prototype 섹션 리뷰 |
| GET | `/api/ax-bd/prototypes/:id/reviews` | Prototype 리뷰 목록 |
| GET | `/api/ax-bd/prototypes/:id/review-summary` | Prototype 리뷰 요약 |

### Tests

| Suite | Tests | Result |
|-------|------:|:------:|
| bdp-review.test.ts | 8 | PASS |
| prototype-review.test.ts | 8 | PASS |
| hitl-components.test.tsx | 8 | PASS |
| **Total New** | **24** | **ALL PASS** |

---

## Architecture Decisions

1. **공유 컴포넌트 추출**: F286의 `SectionReviewAction.tsx`를 `HitlSectionReview.tsx`로 일반화 — `entityType` prop으로 BDP/Prototype API 분기
2. **독립 리뷰 테이블**: BDP/Prototype 각각 별도 테이블 — JOIN 없이 빠른 조회, 스키마 독립 진화 가능
3. **기존 라우트 확장**: 새 route 파일 생성 대신 기존 `bdp.ts`, `ax-bd-prototypes.ts`에 엔드포인트 추가 — 일관성 유지

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial report — Sprint 118 완료 | Sinclair Seo |
