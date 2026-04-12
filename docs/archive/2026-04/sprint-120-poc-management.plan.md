---
code: FX-PLAN-120
title: Sprint 120 — PoC 관리 분리 (F298)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 120
f-items: F298
phase: "Phase 11-C"
---

# Sprint 120 — PoC 관리 분리 (F298)

> **Summary**: MVP 추적(F238)과 별도로 PoC 전용 진행 추적 + 성과 측정 페이지 구현.
>
> **Project**: Foundry-X  |  **Sprint**: 120  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 MVP 추적 페이지에서 PoC와 MVP가 혼재. PoC는 검증 목적(성과 측정), MVP는 배포 목적(릴리스 추적)으로 성격이 다름 |
| **Solution** | `/product/poc` 전용 페이지로 PoC 프로젝트 분리. 성과 지표(KPI) 대시보드 + 진행 상태 추적 |
| **Function/UX Effect** | PoC 전용 목록 + 상세 + KPI 대시보드. MVP와 별도로 PoC 라이프사이클 관리 |
| **Core Value** | "PoC는 검증, MVP는 배포" — 목적에 맞는 분리된 관리 체계 |

---

## 1. Scope

### 1.1 In Scope

- [ ] API — CRUD /product/poc (4 endpoints: list, create, get, update)
- [ ] API — GET /product/poc/:id/kpi (성과 지표 조회)
- [ ] D1 — poc_projects + poc_kpis 테이블
- [ ] Web `/product/poc` 페이지 — PoC 목록 + 상세 + KPI 대시보드
- [ ] sidebar 5단계 제품화에 "PoC 관리" 메뉴 추가

### 1.2 Out of Scope

- PoC 자동 배포 → 기존 prototype 배포 파이프라인 연동은 향후
- MVP 추적과의 데이터 연동 → 별도 Sprint

---

## 2. Architecture

### 2.1 변경 대상 파일

```
packages/api/src/
├── routes/poc.ts                  ← 신규 (5 endpoints)
├── services/poc-service.ts        ← 신규
├── schemas/poc.schema.ts          ← 신규
└── db/migrations/0090_poc_management.sql

packages/web/src/
├── routes/product-poc.tsx         ← 신규 페이지
├── components/sidebar.tsx         ← /product/poc 메뉴 추가
└── router.tsx                     ← product/poc 등록
```

### 2.2 Implementation Order

1. D1 마이그레이션 (0090)
2. poc-service 구현
3. API 5 endpoints
4. API 테스트
5. Web 페이지 + 라우터 + 사이드바
6. Web 테스트 + typecheck + build

---

## 3. D1 Migration (0090)

```sql
CREATE TABLE IF NOT EXISTS poc_projects (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  framework TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS poc_kpis (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  poc_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  target_value REAL,
  actual_value REAL,
  unit TEXT NOT NULL DEFAULT 'count',
  measured_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (poc_id) REFERENCES poc_projects(id)
);
```

---

## 4. Success Criteria

- [ ] PoC CRUD + KPI API 동작
- [ ] Web `/product/poc` 페이지 렌더링
- [ ] 기존 테스트 전체 통과 + typecheck + build

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft — F298 PoC 관리 | Sinclair Seo |
