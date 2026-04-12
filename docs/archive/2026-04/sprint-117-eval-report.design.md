---
code: FX-DSGN-117
title: Sprint 117 — 통합 평가 결과서 (F296) Design
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 117
f-items: F296
phase: "Phase 11-B"
---

# Sprint 117 — 통합 평가 결과서 (F296) Design

> **Plan**: [[FX-PLAN-117]] | **Sprint**: 117 | **F-items**: F296

---

## 1. Overview

F296은 2단계 발굴 스킬(2-1~2-8) 결과를 종합하여 통합 평가 결과서를 자동 생성하는 기능.
F261(산출물 시스템)의 bd_artifacts 테이블에서 데이터를 읽어 스킬별 요약 + 신호등 집계 + 종합 평가를 생성.

---

## 2. D1 Migration (0085)

```sql
-- 0085_evaluation_reports.sql
CREATE TABLE IF NOT EXISTS evaluation_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  skill_scores TEXT NOT NULL DEFAULT '{}',
  traffic_light TEXT NOT NULL DEFAULT 'yellow' CHECK(traffic_light IN ('green','yellow','red')),
  traffic_light_history TEXT NOT NULL DEFAULT '[]',
  recommendation TEXT,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_eval_reports_org ON evaluation_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_eval_reports_biz_item ON evaluation_reports(biz_item_id);
```

---

## 3. API Design

### 3.1 Schema (`packages/api/src/schemas/evaluation-report.schema.ts`)

```typescript
import { z } from "zod";

export const GenerateReportSchema = z.object({
  bizItemId: z.string().min(1),
  title: z.string().min(1).optional(),
});

export const ReportListQuerySchema = z.object({
  bizItemId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;
export type ReportListQuery = z.infer<typeof ReportListQuerySchema>;

export interface EvaluationReport {
  id: string;
  orgId: string;
  bizItemId: string;
  title: string;
  summary: string | null;
  skillScores: Record<string, { score: number; label: string; summary: string }>;
  trafficLight: "green" | "yellow" | "red";
  trafficLightHistory: Array<{ date: string; value: string }>;
  recommendation: string | null;
  generatedBy: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Service (`packages/api/src/services/evaluation-report-service.ts`)

```
class EvaluationReportService {
  constructor(private db: D1Database) {}

  // biz-item의 산출물을 조회하여 스킬별 점수 + 신호등 산출
  async generate(orgId, userId, input): Promise<EvaluationReport>
    1. bd_artifacts에서 biz_item_id 산출물 전체 조회
    2. 스킬별로 그룹핑 → skill_scores 생성
    3. 전체 traffic_light 산출 (green/yellow/red)
    4. evaluation_reports에 INSERT
    5. 결과 반환

  async getById(orgId, id): Promise<EvaluationReport | null>
  async list(orgId, query): Promise<{ items, total }>
}
```

### 3.3 Route (`packages/api/src/routes/evaluation-report.ts`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/ax-bd/evaluation-reports/generate` | 결과서 생성 |
| GET | `/ax-bd/evaluation-reports` | 결과서 목록 |
| GET | `/ax-bd/evaluation-reports/:id` | 결과서 상세 |

패턴: `axBdEvaluationReportRoute` — Hono<{ Bindings: Env; Variables: TenantVariables }>

### 3.4 app.ts 등록

```typescript
// Sprint 117: 통합 평가 결과서 (F296)
app.route("/api", evaluationReportRoute);
```

shapingRoute(Sprint 112) 다음에 등록.

---

## 4. Web Design

### 4.1 Page (`packages/web/src/routes/ax-bd/evaluation-report.tsx`)

- 결과서 목록 (테이블)
- 생성 버튼 → biz-item 선택 → POST generate
- 상세 뷰: 스킬별 점수 카드 + 신호등 + 종합 요약

### 4.2 Router (`packages/web/src/router.tsx`)

```typescript
{ path: "discovery/report", lazy: () => import("@/routes/ax-bd/evaluation-report") },
```

2단계 발굴 섹션에 추가 (discovery/dashboard 다음).

### 4.3 Sidebar (`packages/web/src/components/sidebar.tsx`)

"2. 발굴" 그룹에 추가:
```typescript
{ href: "/discovery/report", label: "평가 결과서", icon: FileText },
```

---

## 5. File Map

```
packages/api/src/
├── db/migrations/0085_evaluation_reports.sql  ← 신규
├── schemas/evaluation-report.schema.ts        ← 신규
├── services/evaluation-report-service.ts      ← 신규
├── routes/evaluation-report.ts                ← 신규
├── __tests__/evaluation-report.test.ts        ← 신규
└── app.ts                                     ← 수정 (라우트 등록)

packages/web/src/
├── routes/ax-bd/evaluation-report.tsx          ← 신규
├── components/sidebar.tsx                      ← 수정 (메뉴 추가)
└── router.tsx                                  ← 수정 (라우트 추가)
```

---

## 6. Test Plan

- API 서비스 테스트: generate, getById, list (D1 mock)
- API 라우트 테스트: 400/404/201/200 케이스
- Web: 페이지 렌더링 기본 테스트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial design — F296 | Sinclair Seo |
