---
code: FX-PLAN-116
title: Sprint 116 — 2-tier 검증 + 인터뷰/미팅 관리 (F294+F295)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 116
f-items: F294, F295
phase: "Phase 11-B"
---

# Sprint 116 — 2-tier 검증 + 인터뷰/미팅 관리 (F294+F295)

> **Summary**: 4단계 검증을 본부→전사 2-tier 워크플로로 확장하고, 전문가 인터뷰/미팅 기록 관리 기능을 추가.
>
> **Project**: Foundry-X  |  **Sprint**: 116  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 파이프라인은 단일 게이트(ORB/PRB)로 검증. 실제 BD 프로세스는 본부 검증 → 전사 검증 2단계이며, 오프라인 인터뷰/미팅 기록이 시스템에 없음 |
| **Solution** | /validation/division (본부) + /validation/company (전사) 2-tier 워크플로 + /validation/meetings 인터뷰·미팅 관리 |
| **Function/UX Effect** | 본부 승인 → 전사 검증 순차 진행. 전문가 인터뷰 일정/기록을 시스템에서 관리. 파이프라인 단계가 세분화 |
| **Core Value** | BD 실제 워크플로와 시스템이 1:1 매핑 — "검증 프로세스가 시스템에 그대로 녹아든다" |

---

## 1. Overview

### 1.1 Purpose

SPEC F294(FX-REQ-286, P2) + F295(FX-REQ-287, P2) — 4단계 검증 기능 확장.
F235(ORB/PRB 게이트)와 F239(의사결정 워크플로)를 기반으로 2-tier 확장 + 미팅 관리 추가.

### 1.2 Related Documents

- SPEC: [[FX-SPEC-001]] §5 Phase 11-B — F294, F295
- 선행: F235 (Sprint 80, ORB/PRB 게이트) ✅, F239 (Sprint 79, 의사결정 워크플로) ✅
- API: `pipeline.ts` (5 endpoints), `decision-service.ts` (198줄), `gate-package-service.ts` (177줄)

---

## 2. Scope

### 2.1 In Scope (F294 — 2-tier 검증)

- [ ] **F294-1**: 검증 단계 분리 — pipeline stage에 division_review, company_review 2단계 추가
- [ ] **F294-2**: Pre-PRB 분리 — ORB(본부) → Pre-PRB → PRB(전사) 워크플로
- [ ] **F294-3**: API — POST /validation/division/submit, POST /validation/company/submit
- [ ] **F294-4**: API — GET /validation/division/items, GET /validation/company/items
- [ ] **F294-5**: decision-service 확장 — tier별 승인/반려 로직
- [ ] **F294-6**: Web `/validation/division` + `/validation/company` 페이지

### 2.2 In Scope (F295 — 인터뷰/미팅)

- [ ] **F295-1**: D1 migration — expert_meetings 테이블 (type, date, attendees, notes, biz_item_id)
- [ ] **F295-2**: API — CRUD /validation/meetings (4 endpoints)
- [ ] **F295-3**: Web `/validation/meetings` 페이지 — 일정 목록 + 상세 기록
- [ ] **F295-4**: sidebar 4단계 검증에 "본부 검증", "전사 검증", "미팅 관리" 메뉴 추가

### 2.3 Out of Scope

- 캘린더 연동 (Google Calendar 등) → 향후 확장
- 알림/리마인더 → 기존 NPS 알림 패턴 재활용 가능하나 이 Sprint 범위 외

---

## 3. D1 Migration (0086)

```sql
-- F294: 검증 단계 확장
ALTER TABLE pipeline_items ADD COLUMN validation_tier TEXT DEFAULT 'none';
-- 'none' | 'division_pending' | 'division_approved' | 'company_pending' | 'company_approved'

-- F295: 미팅 관리
CREATE TABLE IF NOT EXISTS expert_meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'interview',
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  attendees TEXT NOT NULL DEFAULT '[]',
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
```

---

## 4. Architecture

### 4.1 변경 대상 파일

```
packages/api/src/
├── routes/pipeline.ts                 ← 확장 (validation tier endpoints)
├── routes/validation-meetings.ts      ← 신규 (미팅 CRUD)
├── services/pipeline-service.ts       ← 2-tier 로직 추가
├── services/decision-service.ts       ← tier별 승인 로직
├── services/meeting-service.ts        ← 신규
├── schemas/validation.schema.ts       ← 신규 (tier + meeting 스키마)
└── db/migrations/0086_validation_2tier.sql  ← D1 신규

packages/web/src/
├── routes/validation-division.tsx     ← 신규
├── routes/validation-company.tsx      ← 신규
├── routes/validation-meetings.tsx     ← 신규
├── components/sidebar.tsx             ← 4단계 검증 메뉴 3건 추가
└── router.tsx                         ← 3 라우트 등록
```

### 4.2 Implementation Order

1. D1 마이그레이션 작성
2. API 스키마 정의
3. meeting-service + pipeline-service 확장
4. API 라우트 (validation-meetings + pipeline 확장)
5. API 테스트
6. Web 페이지 3건 + 라우터 + 사이드바
7. Web 테스트
8. typecheck + lint + build

---

## 5. Success Criteria

- [ ] 2-tier 워크플로 API 동작 (본부→전사 순차)
- [ ] 미팅 CRUD 4 endpoints 동작
- [ ] D1 0086 마이그레이션 적용
- [ ] Web 3페이지 렌더링
- [ ] 기존 테스트 전체 통과

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft — F294+F295 검증 2-tier + 미팅 관리 | Sinclair Seo |
