---
code: FX-DSGN-120
title: Sprint 120 Design — PoC 관리 분리 (F298)
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 120
f-items: F298
phase: "Phase 11-C"
---

# Sprint 120 Design — PoC 관리 분리 (F298)

> **Plan**: [[FX-PLAN-120]]  |  **Sprint**: 120  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## 1. Overview

MVP 추적(F238)과 별도로 PoC 전용 관리 시스템을 분리. PoC는 "검증 목적 + 성과 측정(KPI)" 중심, MVP는 "배포 목적 + 릴리스 추적" 중심으로 성격이 다르므로 독립 CRUD + KPI 대시보드 제공.

---

## 2. D1 Migration (0087_poc_management.sql)

```sql
-- F298: PoC 전용 프로젝트 관리
CREATE TABLE IF NOT EXISTS poc_projects (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK(status IN ('planning','in_progress','completed','cancelled')),
  framework TEXT,
  start_date TEXT,
  end_date TEXT,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_poc_projects_org ON poc_projects(org_id, status);

-- F298: PoC 성과 지표 (KPI)
CREATE TABLE IF NOT EXISTS poc_kpis (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  poc_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  target_value REAL,
  actual_value REAL,
  unit TEXT NOT NULL DEFAULT 'count',
  measured_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (poc_id) REFERENCES poc_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poc_kpis_poc ON poc_kpis(poc_id);
```

---

## 3. API Schema (poc.schema.ts)

```typescript
import { z } from "zod";

export const POC_STATUSES = ["planning", "in_progress", "completed", "cancelled"] as const;
export type PocStatus = (typeof POC_STATUSES)[number];

export const CreatePocSchema = z.object({
  bizItemId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  framework: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const UpdatePocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(POC_STATUSES).optional(),
  framework: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const PocFilterSchema = z.object({
  status: z.enum(POC_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const CreatePocKpiSchema = z.object({
  metricName: z.string().min(1).max(200),
  targetValue: z.number().optional(),
  actualValue: z.number().optional(),
  unit: z.string().max(50).default("count"),
});
```

---

## 4. API Service (poc-service.ts)

| Method | 설명 |
|--------|------|
| `create(input)` | PoC 프로젝트 생성 |
| `list(orgId, filters)` | 목록 조회 (status 필터 + 페이지네이션) |
| `getById(id, orgId)` | 상세 조회 |
| `update(id, orgId, input)` | 프로젝트 수정 |
| `getKpis(pocId, orgId)` | KPI 목록 조회 |
| `addKpi(pocId, orgId, input)` | KPI 추가 |

---

## 5. API Routes (poc.ts)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/poc` | PoC 생성 |
| GET | `/poc` | PoC 목록 |
| GET | `/poc/:id` | PoC 상세 |
| PATCH | `/poc/:id` | PoC 수정 |
| GET | `/poc/:id/kpi` | KPI 조회 |
| POST | `/poc/:id/kpi` | KPI 추가 |

### Route 등록 (app.ts)

```typescript
import { pocRoute } from "./routes/poc.js";
app.route("/api", pocRoute);
```

---

## 6. Web Routes

### 6.1 Router (router.tsx)

```typescript
// ── 5단계 제품화 (product) ──
{ path: "product/mvp", lazy: () => import("@/routes/mvp-tracking") },
{ path: "product/poc", lazy: () => import("@/routes/product-poc") },
```

### 6.2 Sidebar (sidebar.tsx)

productize 그룹에 PoC 관리 메뉴 추가:

```typescript
{
  key: "productize",
  label: "5. 제품화",
  icon: Rocket,
  stageColor: "bg-axis-indigo",
  items: [
    { href: "/product/mvp", label: "MVP 추적", icon: Target },
    { href: "/product/poc", label: "PoC 관리", icon: FlaskConical },
  ],
},
```

### 6.3 Page (product-poc.tsx)

- PoC 목록 (상태 필터: 전체/계획/진행중/완료/취소)
- 등록 폼 (모달)
- 상세 클릭 시 KPI 대시보드 인라인 전개

---

## 7. 테스트

### 7.1 API 테스트 (poc.test.ts)

- CRUD 정상 동작 (create → list → get → update)
- KPI 추가/조회
- 404 처리 (존재하지 않는 PoC)
- 필터 + 페이지네이션
- 입력 검증 실패

### 7.2 Web 테스트 (product-poc.test.tsx)

- 목록 렌더링
- 등록 폼 표시/제출
- 상태 필터 동작

---

## 8. 변경 파일 목록

```
packages/api/src/
├── db/migrations/0087_poc_management.sql   ← 신규
├── routes/poc.ts                           ← 신규
├── services/poc-service.ts                 ← 신규
├── schemas/poc.schema.ts                   ← 신규
├── app.ts                                  ← pocRoute 등록
└── __tests__/poc.test.ts                   ← 신규

packages/web/src/
├── routes/product-poc.tsx                  ← 신규
├── components/sidebar.tsx                  ← PoC 메뉴 추가
├── router.tsx                              ← product/poc 등록
└── __tests__/product-poc.test.tsx          ← 신규
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial design — F298 PoC 관리 | Sinclair Seo |
