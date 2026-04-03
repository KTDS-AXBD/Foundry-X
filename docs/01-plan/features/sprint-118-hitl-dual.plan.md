---
code: FX-PLAN-118
title: Sprint 118 — 사업계획서 HITL + Prototype HITL (F292+F297)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 118
f-items: F292, F297
phase: "Phase 11-B/C"
---

# Sprint 118 — 사업계획서 HITL + Prototype HITL (F292+F297)

> **Summary**: F286 형상화 HITL 패턴을 재활용하여 사업계획서(BDP)와 Prototype에 HITL 패널을 추가. 섹션별 승인/수정/반려 + 멀티 템플릿 지원.
>
> **Project**: Foundry-X  |  **Sprint**: 118  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 사업계획서와 Prototype 생성은 AI 초안만 제공하고, 사용자가 직접 검토/수정할 수 있는 체계적 UI가 없음 |
| **Solution** | F286 HITL 에디터 패턴을 재활용하여 BDP와 Prototype에 섹션별 승인/수정/반려 패널 + 멀티 템플릿 |
| **Function/UX Effect** | `/shaping/proposal/:id/review` HITL 에디터 + `/shaping/prototype` HITL 에디터. 섹션별 상태 뱃지로 진행률 시각화 |
| **Core Value** | AI 초안을 사람이 검증하는 "Human-in-the-Loop" 패턴이 형상화 전 단계에 적용 — 품질과 신뢰 동시 확보 |

---

## 1. Scope

### 1.1 F292 — 사업계획서 HITL 고도화

- [ ] HITL 에디터 공유 컴포넌트 추출 (F286 shaping-detail에서)
- [ ] BDP 상세 페이지에 HITL 패널 추가 — 섹션별 승인/수정/반려
- [ ] 멀티 템플릿 지원 — B2B/B2C/내부 3종
- [ ] API — PATCH /ax-bd/bdp/:id/sections/:sectionId (승인/수정/반려)
- [ ] D1 — bdp_section_reviews 테이블

### 1.2 F297 — Prototype HITL 고도화

- [ ] `/shaping/prototype` 신규 페이지 — Prototype 목록 + HITL 에디터
- [ ] 다중 프레임워크 지원 (React/Vue/HTML 선택)
- [ ] API — GET /prototype/list, POST /prototype/generate, PATCH /prototype/:id/review
- [ ] D1 — prototype_reviews 테이블
- [ ] sidebar 3단계 형상화에 "Prototype" 메뉴 추가

### 1.3 Out of Scope

- Prototype 실제 배포/프리뷰 → 향후
- BDP PDF 내보내기 → 향후

---

## 2. Architecture

### 2.1 HITL 공유 컴포넌트

```
packages/web/src/components/feature/hitl/
├── HitlEditor.tsx          ← 공유 (F286에서 추출)
├── SectionReviewPanel.tsx  ← 섹션별 승인/수정/반려 UI
├── ReviewStatusBadge.tsx   ← approved/modified/rejected 뱃지
└── types.ts                ← 공유 타입
```

### 2.2 변경 대상 파일

```
packages/api/src/
├── routes/ax-bd-discovery.ts    ← BDP HITL endpoint 추가
├── routes/prototype.ts          ← 신규 (3 endpoints)
├── services/bdp-service.ts      ← 섹션 리뷰 로직
├── services/prototype-service.ts ← HITL 리뷰 로직 추가
├── schemas/hitl.schema.ts       ← 공유 HITL 스키마
└── db/migrations/0088_hitl_reviews.sql

packages/web/src/
├── components/feature/hitl/     ← 신규 공유 컴포넌트
├── routes/shaping-prototype.tsx ← 신규
├── router.tsx                   ← shaping/prototype 등록
└── components/sidebar.tsx       ← Prototype 메뉴 추가
```

### 2.3 Implementation Order

1. D1 마이그레이션 (0088)
2. HITL 공유 스키마 + 서비스
3. BDP HITL API (F292)
4. Prototype API (F297)
5. Web HITL 공유 컴포넌트 추출
6. BDP HITL UI 연결
7. Prototype 페이지 + 라우터 + 사이드바
8. 테스트 + typecheck + build

---

## 3. D1 Migration (0088)

```sql
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

CREATE TABLE IF NOT EXISTS prototype_reviews (
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
```

---

## 4. Success Criteria

- [ ] BDP HITL 섹션 리뷰 동작 (승인/수정/반려)
- [ ] Prototype HITL 에디터 동작
- [ ] HITL 공유 컴포넌트 재사용 확인
- [ ] 기존 테스트 전체 통과 + typecheck + build

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft — F292+F297 HITL dual | Sinclair Seo |
