---
code: FX-ANLS-120
title: Sprint 120 Gap Analysis — PoC 관리 분리 (F298)
version: 1.0
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 120
f-items: F298
phase: "Phase 11-C"
---

# Sprint 120 Gap Analysis — PoC 관리 분리 (F298)

> **Design**: [[FX-DSGN-120]]  |  **Sprint**: 120  |  **Date**: 2026-04-03

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Match Rate** | **97%** (29/30 items PASS) |
| **Total Items** | 30 |
| **PASS** | 29 |
| **MINOR** | 1 |
| **FAIL** | 0 |

---

## Gap Analysis Detail

### §2. D1 Migration

| # | Design Item | Status | Evidence |
|---|-------------|--------|----------|
| 1 | poc_projects 테이블 생성 (12 컬럼) | ✅ PASS | `0087_poc_management.sql:2-17` — 설계와 100% 일치 |
| 2 | poc_projects status CHECK 제약 (4개 값) | ✅ PASS | `0087:8-9` — planning/in_progress/completed/cancelled |
| 3 | idx_poc_projects_org 인덱스 | ✅ PASS | `0087:19` |
| 4 | poc_kpis 테이블 생성 (9 컬럼) | ✅ PASS | `0087:22-33` — 설계와 100% 일치 |
| 5 | poc_kpis ON DELETE CASCADE | ✅ PASS | `0087:32` |
| 6 | idx_poc_kpis_poc 인덱스 | ✅ PASS | `0087:35` |

### §3. API Schema

| # | Design Item | Status | Evidence |
|---|-------------|--------|----------|
| 7 | POC_STATUSES 4개 상수 | ✅ PASS | `poc.schema.ts:3` |
| 8 | PocStatus 타입 | ✅ PASS | `poc.schema.ts:4` |
| 9 | CreatePocSchema (6 필드) | ✅ PASS | `poc.schema.ts:6-13` |
| 10 | UpdatePocSchema (6 optional 필드) | ✅ PASS | `poc.schema.ts:15-22` |
| 11 | PocFilterSchema (status/limit/offset) | ✅ PASS | `poc.schema.ts:24-28` |
| 12 | CreatePocKpiSchema (4 필드) | ✅ PASS | `poc.schema.ts:30-35` |

### §4. API Service

| # | Design Item | Status | Evidence |
|---|-------------|--------|----------|
| 13 | create(input) | ✅ PASS | `poc-service.ts:63-95` |
| 14 | list(orgId, filters) | ✅ PASS | `poc-service.ts:97-117` |
| 15 | getById(id, orgId) | ✅ PASS | `poc-service.ts:119-128` |
| 16 | update(id, orgId, input) | ✅ PASS | `poc-service.ts:130-153` |
| 17 | getKpis(pocId, orgId) | ✅ PASS | `poc-service.ts:155-172` |
| 18 | addKpi(pocId, input) | ✅ PASS | `poc-service.ts:174-198` |

### §5. API Routes

| # | Design Item | Status | Evidence |
|---|-------------|--------|----------|
| 19 | POST /poc | ✅ PASS | `poc.ts:18-31` |
| 20 | GET /poc | ✅ PASS | `poc.ts:34-44` |
| 21 | GET /poc/:id | ✅ PASS | `poc.ts:47-56` |
| 22 | PATCH /poc/:id | ✅ PASS | `poc.ts:59-73` |
| 23 | GET /poc/:id/kpi | ✅ PASS | `poc.ts:76-87` |
| 24 | POST /poc/:id/kpi | ✅ PASS | `poc.ts:90-106` |
| 25 | app.ts pocRoute 등록 | ✅ PASS | `app.ts:103-104, 354-355` |

### §6. Web Routes

| # | Design Item | Status | Evidence |
|---|-------------|--------|----------|
| 26 | router.tsx product/poc 경로 | ✅ PASS | `router.tsx:58` |
| 27 | sidebar.tsx PoC 관리 메뉴 | ⚠️ MINOR | icon 차이 — Design: `FlaskConical`, 구현: `TestTubes` (FlaskConical은 외부 연계에서 이미 사용 중이라 변경) |
| 28 | product-poc.tsx 목록 + 필터 + 등록 + KPI | ✅ PASS | `product-poc.tsx` — 4개 기능 모두 구현 |

### §7. 테스트

| # | Design Item | Status | Evidence |
|---|-------------|--------|----------|
| 29 | API 테스트 (CRUD + KPI + 404 + 필터 + 검증) | ✅ PASS | `poc.test.ts` — 16 tests 전체 통과 |
| 30 | Web 테스트 (목록 + 등록 + 상태 필터) | ✅ PASS | `product-poc.test.tsx` — 5 tests 전체 통과 |

---

## Minor Gap Detail

### GAP-1: Sidebar icon 변경 (FlaskConical → TestTubes)

- **Design**: `FlaskConical` 아이콘
- **구현**: `TestTubes` 아이콘
- **사유**: `FlaskConical`이 이미 외부 연계 섹션 "AI Foundry" 메뉴에서 사용 중. 같은 아이콘이 다른 의미로 중복 사용되면 사용자 혼란 가능. `TestTubes`가 "실험/검증" 의미로 PoC에 더 적합.
- **영향**: 없음 (UX 개선)
- **조치**: Design 문서 반영 불필요 — 구현이 더 적절

---

## Test Results

| Package | Tests | Result |
|---------|-------|--------|
| API (poc.test.ts) | 16 | ✅ 16/16 PASS |
| Web (product-poc.test.tsx) | 5 | ✅ 5/5 PASS |
| API 전체 (기존) | 2511 | ✅ 변동 없음 |
| Web 전체 (기존) | 306 | ✅ 변동 없음 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial analysis — 97% Match | Sinclair Seo |
