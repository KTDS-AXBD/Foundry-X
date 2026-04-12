---
code: FX-DSGN-115
title: Sprint 115 — Discovery-X Agent 자동 수집 (F291) Design
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 115
f-items: F291
phase: "Phase 11-B"
---

# Sprint 115 — Discovery-X Agent 자동 수집 (F291) Design

> **Plan**: [[FX-PLAN-115]]  |  **Sprint**: 115  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## 1. Overview

F291은 기존 F179 수집 채널 통합 위에 "자동 수집 Agent" 레이어를 추가해요.
핵심: 스케줄 설정 → 수집 실행 이력 관리 → 수동 트리거, 그리고 이를 보여주는 Web 페이지.

---

## 2. D1 Schema (0085)

```sql
-- 0085_agent_collection.sql
CREATE TABLE IF NOT EXISTS agent_collection_schedules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '["market","news","tech"]',
  keywords TEXT NOT NULL DEFAULT '[]',
  interval_hours INTEGER NOT NULL DEFAULT 6,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS agent_collection_runs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  schedule_id TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  items_found INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
```

---

## 3. API Design

### 3.1 New Endpoints (3건)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/collection/agent-schedule` | `{ sources, keywords, interval_hours, enabled }` | `{ schedule }` (201) |
| GET | `/collection/agent-runs` | `?limit=&status=` | `{ runs, total }` |
| POST | `/collection/agent-trigger` | `{ source?, keywords? }` | `{ runId, status }` (201) |

### 3.2 Zod Schemas (신규)

```typescript
// AgentScheduleCreateSchema
{ sources: z.array(z.enum(["market","news","tech"])).min(1),
  keywords: z.array(z.string().min(1).max(100)).max(20).default([]),
  interval_hours: z.number().int().min(1).max(168).default(6),
  enabled: z.boolean().default(true) }

// AgentRunsQuerySchema
{ limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending","running","completed","failed"]).optional() }

// AgentTriggerSchema
{ source: z.enum(["market","news","tech"]).optional(),
  keywords: z.array(z.string().min(1).max(100)).max(10).optional() }
```

### 3.3 Service Layer

`AgentCollectionService` (신규) — agent_collection_schedules + agent_collection_runs CRUD:

- `createSchedule(orgId, data)` → INSERT schedule
- `getSchedule(orgId)` → SELECT latest schedule
- `listRuns(orgId, opts)` → SELECT runs with pagination
- `createRun(orgId, scheduleId, source)` → INSERT run
- `completeRun(runId, itemsFound)` → UPDATE status=completed
- `failRun(runId, error)` → UPDATE status=failed

---

## 4. Web Design

### 4.1 Route: `/collection/agent`

새 페이지 `packages/web/src/routes/collection-agent.tsx`:
- 스케줄 상태 카드 (소스 목록, 주기, enabled toggle)
- 수집 이력 테이블 (source, status, items_found, started_at)
- "즉시 수집" 버튼 → POST /collection/agent-trigger

### 4.2 Sidebar

`1. 수집` 그룹에 `{ href: "/collection/agent", label: "Agent 수집", icon: Bot }` 추가.

### 4.3 Router

`router.tsx`에 `{ path: "collection/agent", lazy: () => import("@/routes/collection-agent") }` 추가.

---

## 5. File Mapping

| # | File | Action | Lines |
|---|------|--------|-------|
| 1 | `packages/api/src/db/migrations/0085_agent_collection.sql` | 신규 | ~20 |
| 2 | `packages/api/src/schemas/collection.ts` | 수정 | +15 |
| 3 | `packages/api/src/services/agent-collection.ts` | 신규 | ~80 |
| 4 | `packages/api/src/routes/collection.ts` | 수정 | +60 |
| 5 | `packages/web/src/routes/collection-agent.tsx` | 신규 | ~120 |
| 6 | `packages/web/src/components/sidebar.tsx` | 수정 | +1 |
| 7 | `packages/web/src/router.tsx` | 수정 | +1 |
| 8 | `packages/api/src/__tests__/collection-agent.test.ts` | 신규 | ~120 |
| 9 | `packages/web/src/__tests__/collection-agent.test.tsx` | 신규 | ~40 |

---

## 6. Test Strategy

- **API 테스트**: 3 endpoints × (정상 + 유효성 검증 + 에러) = ~10 cases
- **Web 테스트**: 페이지 렌더링 + 트리거 버튼 동작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial design — F291 | Sinclair Seo |
