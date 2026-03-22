---
code: FX-DSGN-028
title: "Sprint 27 — Phase 3-B 기술 기반 완성: KPI 인프라 + Reconciliation + Hook 자동수정"
version: 0.1
status: Draft
category: DSGN
system-version: 2.0.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 27 Design Document

> **Summary**: F100(KPI 측정 인프라) + F99(Git↔D1 Reconciliation) + F101(Hook 자동수정) 상세 설계. Worker별 파일 할당 + D1 마이그레이션 + API 스펙 + 테스트 계획 포함.
>
> **Project**: Foundry-X
> **Version**: v2.1
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft
> **Planning Doc**: [sprint-27.plan.md](../../01-plan/features/sprint-27.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **측정 가능성**: PRD v5 KPI K7(WAU), K8(에이전트 완료율) 최소 측정 인프라 확보
2. **자동 정합성**: Git(SSOT)↔D1 drift를 Cron Trigger로 자동 감지·복구
3. **에이전트 자율성**: hook 실패 시 LLM 기반 자동 수정으로 완료율 향상
4. **기존 아키텍처 준수**: Hono createRoute + Zod 스키마 + D1 raw SQL 패턴 유지

### 1.2 Design Principles

- **최소 침습**: 기존 서비스 변경 최소화, 새 서비스/라우트 추가 위주
- **점진적 확장**: KPI는 D1 기반 MVP → 추후 Analytics Engine 마이그레이션 가능
- **실패 안전**: AutoFix는 diff 크기 제한 + 필수 재검증으로 품질 보장

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers                            │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐  │
│  │ KpiLogger   │   │ Reconciler   │   │ AutoFixService       │  │
│  │ Service     │   │ Service      │   │                      │  │
│  │             │   │              │   │ ClaudeApiRunner      │  │
│  │ logEvent()  │   │ checkDrift() │   │ → generate fix diff  │  │
│  │ getMetrics()│   │ reconcile()  │   │ → apply & rerun hook │  │
│  └──────┬──────┘   └──────┬───────┘   └──────────┬───────────┘  │
│         │                  │                       │              │
│         ▼                  ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                        D1 Database                           ││
│  │  kpi_events │ reconciliation_runs │ agent_tasks (기존)       ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────┐   ┌───────────────────┐                       │
│  │ Cron Trigger │──▶│ scheduled handler │                       │
│  │ (6h 주기)    │   │ → Reconciler.run()│                       │
│  └──────────────┘   └───────────────────┘                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     Next.js (Pages)                               │
│                                                                  │
│  ┌──────────────────┐                                            │
│  │ /analytics        │  KPI Summary + Trends + Events            │
│  │ page.tsx          │  ← GET /api/kpi/summary                   │
│  └──────────────────┘  ← GET /api/kpi/trends                    │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### F100: KPI 이벤트 수집 흐름
```
User Action → API Middleware(logApiCall) → D1 kpi_events INSERT
Web Page Load → POST /api/kpi/track → D1 kpi_events INSERT
GET /api/kpi/summary → D1 COUNT/GROUP BY → JSON response
```

#### F99: Reconciliation 흐름
```
Cron (6h) OR POST /api/reconciliation/run
  → GitHubService.getFileContent("SPEC.md")
  → SpecParser.parse() → Git state
  → D1 SELECT spec_items, requirements → DB state
  → detectDrift(gitState, dbState) → drift[]
  → reconcile(drifts, "git-wins") → D1 UPDATE
  → D1 INSERT reconciliation_runs (report)
  → SSE reconciliation.completed event
```

#### F101: AutoFix 흐름
```
AgentOrchestrator.executeTask()
  → Runner.execute() → result
  → hook 실행 (lint/typecheck/test)
  → 실패 감지
  → AutoFixService.attemptFix(error, context, attempt=1)
    → ClaudeApiRunner.execute({ taskType: "code-generation", context: { error, code } })
    → diff 생성 (50줄 제한)
    → 적용 → hook 재실행
    → 실패? → attempt=2 (확장 컨텍스트)
    → 실패? → escalateToHuman() → AgentInbox message + SSE
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| KpiLogger | D1 | 이벤트 저장/집계 |
| ReconciliationService | GitHubService, SpecParser, D1 | Git↔D1 비교 |
| AutoFixService | ClaudeApiRunner, AgentInbox, SSEManager | LLM 수정 + escalation |
| Cron Handler | ReconciliationService | 주기적 실행 |
| Analytics Page | api-client (KPI endpoints) | 데이터 시각화 |

---

## 3. Data Model

### 3.1 D1 Migration 0018 (Sprint 26이 0017 사용)

**파일**: `packages/api/src/db/migrations/0018_kpi_and_reconciliation.sql`

```sql
-- ═══════════════════════════════════════════════════════
-- Migration 0018: KPI Events + Reconciliation Runs
-- Sprint 27: F100 + F99
-- ═══════════════════════════════════════════════════════

-- F100: KPI 이벤트 로깅
CREATE TABLE IF NOT EXISTS kpi_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('page_view', 'api_call', 'agent_task', 'cli_invoke', 'sdd_check')),
  user_id TEXT,
  agent_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_events_tenant_type
  ON kpi_events(tenant_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_kpi_events_created
  ON kpi_events(created_at);

-- F99: Reconciliation 실행 이력
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('cron', 'manual')),
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
  strategy TEXT NOT NULL DEFAULT 'git-wins' CHECK(strategy IN ('git-wins', 'db-wins', 'manual')),
  drift_count INTEGER NOT NULL DEFAULT 0,
  fixed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  report TEXT DEFAULT '{}',
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_tenant
  ON reconciliation_runs(tenant_id, started_at DESC);

-- F101: agent_tasks에 auto_fix 관련 컬럼 추가
ALTER TABLE agent_tasks ADD COLUMN hook_status TEXT DEFAULT NULL;
ALTER TABLE agent_tasks ADD COLUMN auto_fix_attempts INTEGER DEFAULT 0;
ALTER TABLE agent_tasks ADD COLUMN auto_fix_log TEXT DEFAULT NULL;
```

### 3.2 Entity Relationships

```
[organizations] 1 ──── N [kpi_events]
      │
      └── 1 ──── N [reconciliation_runs]

[agent_tasks] (기존) ← hook_status + auto_fix_attempts 컬럼 추가
```

---

## 4. API Specification

### 4.1 F100: KPI Endpoints

#### `POST /api/kpi/track`

클라이언트 이벤트 수집 (page_view, cli_invoke). 인증 선택적 — 비로그인 사용자도 page_view 기록 가능.

**Request:**
```json
{
  "eventType": "page_view",
  "metadata": { "page": "/dashboard", "referrer": "/login" }
}
```

**Response (201):**
```json
{ "id": "kpi-abc123", "recorded": true }
```

**Zod Schema:**
```typescript
// packages/api/src/schemas/kpi.ts
export const KpiTrackRequestSchema = z.object({
  eventType: z.enum(["page_view", "api_call", "agent_task", "cli_invoke", "sdd_check"]),
  metadata: z.record(z.unknown()).optional(),
}).openapi("KpiTrackRequest");

export const KpiTrackResponseSchema = z.object({
  id: z.string(),
  recorded: z.boolean(),
}).openapi("KpiTrackResponse");
```

#### `GET /api/kpi/summary`

KPI 요약 (인증 필수, admin/member).

**Query Parameters:**
- `days`: 집계 기간 (기본 7)

**Response (200):**
```json
{
  "wau": 5,
  "agentCompletionRate": 0.78,
  "sddIntegrityRate": 0.92,
  "totalEvents": 342,
  "breakdown": {
    "page_view": 180,
    "api_call": 120,
    "agent_task": 30,
    "cli_invoke": 8,
    "sdd_check": 4
  },
  "period": { "from": "2026-03-14", "to": "2026-03-21" }
}
```

**Zod Schema:**
```typescript
export const KpiSummaryResponseSchema = z.object({
  wau: z.number(),
  agentCompletionRate: z.number(),
  sddIntegrityRate: z.number(),
  totalEvents: z.number(),
  breakdown: z.record(z.number()),
  period: z.object({ from: z.string(), to: z.string() }),
}).openapi("KpiSummary");
```

#### `GET /api/kpi/trends`

일별/주별 트렌드 (인증 필수).

**Query Parameters:**
- `days`: 기간 (기본 30)
- `groupBy`: `day` | `week` (기본 `day`)

**Response (200):**
```json
{
  "trends": [
    { "date": "2026-03-20", "pageViews": 30, "apiCalls": 45, "agentTasks": 5 },
    { "date": "2026-03-21", "pageViews": 25, "apiCalls": 38, "agentTasks": 3 }
  ]
}
```

#### `GET /api/kpi/events`

이벤트 목록 (인증 필수, admin).

**Query Parameters:**
- `type`: 이벤트 타입 필터
- `limit`: 결과 수 (기본 20, 최대 100)
- `offset`: 페이지네이션

**Response (200):**
```json
{
  "events": [
    { "id": "kpi-abc", "eventType": "agent_task", "userId": "user-1", "metadata": {...}, "createdAt": "..." }
  ],
  "total": 342
}
```

### 4.2 F99: Reconciliation Endpoints

#### `POST /api/reconciliation/run`

수동 Reconciliation 실행 (admin only).

**Request:**
```json
{
  "strategy": "git-wins"
}
```

**Response (200):**
```json
{
  "runId": "recon-abc123",
  "status": "completed",
  "driftCount": 3,
  "fixedCount": 2,
  "skippedCount": 1,
  "drifts": [
    { "entity": "spec_item", "id": "F100", "gitStatus": "PLANNED", "dbStatus": "missing", "action": "created" },
    { "entity": "requirement", "id": "FX-REQ-100", "gitStatus": "OPEN", "dbStatus": "DONE", "action": "updated" },
    { "entity": "wiki_page", "id": "docs/specs/prd-v5.md", "gitHash": "a1b2c3", "dbHash": "d4e5f6", "action": "skipped" }
  ]
}
```

**Zod Schemas:**
```typescript
// packages/api/src/schemas/reconciliation.ts
export const ReconciliationRunRequestSchema = z.object({
  strategy: z.enum(["git-wins", "db-wins", "manual"]).default("git-wins"),
}).openapi("ReconciliationRunRequest");

export const DriftItemSchema = z.object({
  entity: z.enum(["spec_item", "requirement", "wiki_page", "agent_config"]),
  id: z.string(),
  gitStatus: z.string().optional(),
  dbStatus: z.string().optional(),
  gitHash: z.string().optional(),
  dbHash: z.string().optional(),
  action: z.enum(["created", "updated", "deleted", "skipped"]),
}).openapi("DriftItem");

export const ReconciliationRunResponseSchema = z.object({
  runId: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  driftCount: z.number(),
  fixedCount: z.number(),
  skippedCount: z.number(),
  drifts: z.array(DriftItemSchema),
}).openapi("ReconciliationRunResponse");
```

#### `GET /api/reconciliation/status`

최근 실행 결과.

**Response (200):**
```json
{
  "lastRun": {
    "id": "recon-abc",
    "triggerType": "cron",
    "status": "completed",
    "driftCount": 0,
    "fixedCount": 0,
    "startedAt": "2026-03-21T06:00:00Z",
    "completedAt": "2026-03-21T06:00:12Z"
  }
}
```

#### `GET /api/reconciliation/history`

실행 이력 (최근 10건).

**Response (200):**
```json
{
  "runs": [
    { "id": "recon-abc", "triggerType": "cron", "status": "completed", "driftCount": 0, "startedAt": "..." }
  ]
}
```

### 4.3 Endpoint Summary

| # | Method | Path | Auth | Feature |
|---|--------|------|------|---------|
| 1 | POST | `/api/kpi/track` | Optional | F100 |
| 2 | GET | `/api/kpi/summary` | Required | F100 |
| 3 | GET | `/api/kpi/trends` | Required | F100 |
| 4 | GET | `/api/kpi/events` | Required (admin) | F100 |
| 5 | POST | `/api/reconciliation/run` | Required (admin) | F99 |
| 6 | GET | `/api/reconciliation/status` | Required | F99 |
| 7 | GET | `/api/reconciliation/history` | Required | F99 |

**총 7 new endpoints** (기존 97 → 104개)

---

## 5. Service Implementation Details

### 5.1 KpiLogger Service

**파일**: `packages/api/src/services/kpi-logger.ts`

```typescript
export class KpiLogger {
  constructor(private db: D1Database) {}

  async logEvent(tenantId: string, eventType: string, options?: {
    userId?: string;
    agentId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = `kpi-${crypto.randomUUID().slice(0, 12)}`;
    await this.db.prepare(
      `INSERT INTO kpi_events (id, tenant_id, event_type, user_id, agent_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, tenantId, eventType, options?.userId ?? null, options?.agentId ?? null,
      JSON.stringify(options?.metadata ?? {})).run();
    return id;
  }

  async getSummary(tenantId: string, days = 7): Promise<KpiSummary> {
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // WAU: distinct user_ids with any event in period
    const wauResult = await this.db.prepare(
      `SELECT COUNT(DISTINCT user_id) as wau FROM kpi_events
       WHERE tenant_id = ? AND created_at >= ? AND user_id IS NOT NULL`
    ).bind(tenantId, since).first<{ wau: number }>();

    // Agent completion rate: completed / (completed + failed)
    const agentResult = await this.db.prepare(
      `SELECT
         SUM(CASE WHEN json_extract(metadata, '$.status') = 'completed' THEN 1 ELSE 0 END) as completed,
         COUNT(*) as total
       FROM kpi_events
       WHERE tenant_id = ? AND event_type = 'agent_task' AND created_at >= ?`
    ).bind(tenantId, since).first<{ completed: number; total: number }>();

    // Breakdown by type
    const breakdownResult = await this.db.prepare(
      `SELECT event_type, COUNT(*) as count FROM kpi_events
       WHERE tenant_id = ? AND created_at >= ?
       GROUP BY event_type`
    ).bind(tenantId, since).all<{ event_type: string; count: number }>();

    // SDD integrity rate from latest sdd_check events
    const sddResult = await this.db.prepare(
      `SELECT json_extract(metadata, '$.rate') as rate FROM kpi_events
       WHERE tenant_id = ? AND event_type = 'sdd_check'
       ORDER BY created_at DESC LIMIT 1`
    ).bind(tenantId).first<{ rate: number }>();

    const breakdown: Record<string, number> = {};
    for (const row of breakdownResult.results) {
      breakdown[row.event_type] = row.count;
    }

    return {
      wau: wauResult?.wau ?? 0,
      agentCompletionRate: agentResult?.total
        ? (agentResult.completed ?? 0) / agentResult.total
        : 0,
      sddIntegrityRate: sddResult?.rate ?? 0,
      totalEvents: Object.values(breakdown).reduce((a, b) => a + b, 0),
      breakdown,
      period: { from: since.split("T")[0]!, to: new Date().toISOString().split("T")[0]! },
    };
  }

  async getTrends(tenantId: string, days = 30, groupBy: "day" | "week" = "day"): Promise<TrendPoint[]> {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const dateExpr = groupBy === "day"
      ? "date(created_at)"
      : "date(created_at, 'weekday 0', '-6 days')";

    const { results } = await this.db.prepare(
      `SELECT ${dateExpr} as period_date,
         SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as page_views,
         SUM(CASE WHEN event_type = 'api_call' THEN 1 ELSE 0 END) as api_calls,
         SUM(CASE WHEN event_type = 'agent_task' THEN 1 ELSE 0 END) as agent_tasks
       FROM kpi_events
       WHERE tenant_id = ? AND created_at >= ?
       GROUP BY period_date ORDER BY period_date`
    ).bind(tenantId, since).all<{
      period_date: string; page_views: number; api_calls: number; agent_tasks: number;
    }>();

    return results.map(r => ({
      date: r.period_date,
      pageViews: r.page_views,
      apiCalls: r.api_calls,
      agentTasks: r.agent_tasks,
    }));
  }

  /** 30일 초과 이벤트 자동 정리 */
  async pruneOldEvents(tenantId: string, retentionDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();
    const result = await this.db.prepare(
      `DELETE FROM kpi_events WHERE tenant_id = ? AND created_at < ?`
    ).bind(tenantId, cutoff).run();
    return result.meta.changes ?? 0;
  }
}
```

### 5.2 ReconciliationService

**파일**: `packages/api/src/services/reconciliation.ts`

```typescript
import type { GitHubService } from "./github.js";
import type { SpecParser } from "./spec-parser.js";
import type { SSEManager } from "./sse-manager.js";

interface DriftItem {
  entity: "spec_item" | "requirement" | "wiki_page" | "agent_config";
  id: string;
  gitStatus?: string;
  dbStatus?: string;
  gitHash?: string;
  dbHash?: string;
  action: "created" | "updated" | "deleted" | "skipped";
}

interface ReconciliationResult {
  runId: string;
  status: "running" | "completed" | "failed";
  driftCount: number;
  fixedCount: number;
  skippedCount: number;
  drifts: DriftItem[];
}

export class ReconciliationService {
  constructor(
    private db: D1Database,
    private github: GitHubService,
    private specParser: SpecParser,
    private sse?: SSEManager,
  ) {}

  async run(tenantId: string, triggerType: "cron" | "manual", strategy = "git-wins"): Promise<ReconciliationResult> {
    const runId = `recon-${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    // 1. Insert run record (status=running)
    await this.db.prepare(
      `INSERT INTO reconciliation_runs (id, tenant_id, trigger_type, strategy, status, started_at)
       VALUES (?, ?, ?, ?, 'running', ?)`
    ).bind(runId, tenantId, triggerType, strategy, now).run();

    try {
      // 2. Git 상태 수집
      const specContent = await this.github.getFileContent("SPEC.md");
      const gitItems = this.specParser.parseFeatureItems(specContent.content);
      const gitReqs = this.specParser.parseRequirements(specContent.content);

      // 3. DB 상태 수집
      const { results: dbItems } = await this.db.prepare(
        `SELECT id, title, status FROM spec_items WHERE tenant_id = ?`
      ).bind(tenantId).all<{ id: string; title: string; status: string }>();

      const { results: dbReqs } = await this.db.prepare(
        `SELECT id, status FROM requirements WHERE tenant_id = ?`
      ).bind(tenantId).all<{ id: string; status: string }>();

      // 4. Drift 감지
      const drifts = this.detectDrift(gitItems, dbItems, gitReqs, dbReqs);

      // 5. 복구 실행
      let fixedCount = 0;
      let skippedCount = 0;

      if (strategy !== "manual") {
        for (const drift of drifts) {
          if (strategy === "git-wins") {
            const fixed = await this.applyGitWins(tenantId, drift);
            if (fixed) fixedCount++; else skippedCount++;
          } else {
            skippedCount++;
          }
        }
      } else {
        skippedCount = drifts.length;
      }

      // 6. Run 완료 기록
      const result: ReconciliationResult = {
        runId, status: "completed",
        driftCount: drifts.length, fixedCount, skippedCount, drifts,
      };

      await this.db.prepare(
        `UPDATE reconciliation_runs
         SET status='completed', drift_count=?, fixed_count=?, skipped_count=?,
             report=?, completed_at=datetime('now')
         WHERE id=?`
      ).bind(drifts.length, fixedCount, skippedCount, JSON.stringify(drifts), runId).run();

      // 7. SSE 알림
      this.sse?.pushEvent({
        event: "reconciliation.completed",
        data: { runId, driftCount: drifts.length, fixedCount },
      });

      return result;
    } catch (error) {
      await this.db.prepare(
        `UPDATE reconciliation_runs SET status='failed', error_message=?, completed_at=datetime('now') WHERE id=?`
      ).bind(String(error), runId).run();

      return { runId, status: "failed", driftCount: 0, fixedCount: 0, skippedCount: 0, drifts: [] };
    }
  }

  private detectDrift(
    gitItems: Array<{ id: string; status: string }>,
    dbItems: Array<{ id: string; status: string }>,
    gitReqs: Array<{ id: string; status: string }>,
    dbReqs: Array<{ id: string; status: string }>,
  ): DriftItem[] {
    const drifts: DriftItem[] = [];
    const dbItemMap = new Map(dbItems.map(i => [i.id, i]));
    const dbReqMap = new Map(dbReqs.map(r => [r.id, r]));

    // Spec items drift
    for (const git of gitItems) {
      const db = dbItemMap.get(git.id);
      if (!db) {
        drifts.push({ entity: "spec_item", id: git.id, gitStatus: git.status, dbStatus: "missing", action: "created" });
      } else if (git.status !== db.status) {
        drifts.push({ entity: "spec_item", id: git.id, gitStatus: git.status, dbStatus: db.status, action: "updated" });
      }
    }

    // Requirements drift
    for (const git of gitReqs) {
      const db = dbReqMap.get(git.id);
      if (!db) {
        drifts.push({ entity: "requirement", id: git.id, gitStatus: git.status, dbStatus: "missing", action: "created" });
      } else if (git.status !== db.status) {
        drifts.push({ entity: "requirement", id: git.id, gitStatus: git.status, dbStatus: db.status, action: "updated" });
      }
    }

    return drifts;
  }

  private async applyGitWins(tenantId: string, drift: DriftItem): Promise<boolean> {
    try {
      if (drift.entity === "spec_item") {
        if (drift.action === "created") {
          await this.db.prepare(
            `INSERT INTO spec_items (id, tenant_id, title, status, created_at)
             VALUES (?, ?, ?, ?, datetime('now'))`
          ).bind(drift.id, tenantId, drift.id, drift.gitStatus ?? "PLANNED").run();
        } else {
          await this.db.prepare(
            `UPDATE spec_items SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
          ).bind(drift.gitStatus, drift.id, tenantId).run();
        }
      }
      // requirement도 동일 패턴
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(tenantId: string): Promise<unknown> {
    return this.db.prepare(
      `SELECT * FROM reconciliation_runs WHERE tenant_id = ? ORDER BY started_at DESC LIMIT 1`
    ).bind(tenantId).first();
  }

  async getHistory(tenantId: string, limit = 10): Promise<unknown[]> {
    const { results } = await this.db.prepare(
      `SELECT id, trigger_type, status, drift_count, fixed_count, started_at, completed_at
       FROM reconciliation_runs WHERE tenant_id = ?
       ORDER BY started_at DESC LIMIT ?`
    ).bind(tenantId, limit).all();
    return results;
  }
}
```

### 5.3 AutoFixService

**파일**: `packages/api/src/services/auto-fix.ts`

```typescript
import type { AgentRunner } from "./agent-runner.js";
import type { AgentExecutionResult } from "./execution-types.js";
import type { SSEManager } from "./sse-manager.js";

interface FixAttempt {
  attempt: number;
  error: string;
  fix: string;
  hookResult: "pass" | "fail";
}

interface AutoFixResult {
  success: boolean;
  attempts: FixAttempt[];
  escalated: boolean;
  finalResult?: AgentExecutionResult;
}

const MAX_FIX_DIFF_LINES = 50;
const MAX_ATTEMPTS = 2;

export class AutoFixService {
  constructor(
    private db: D1Database,
    private fixRunner: AgentRunner,  // ClaudeApiRunner instance
    private sse?: SSEManager,
  ) {}

  async retryWithFix(
    taskId: string,
    hookType: string,
    hookError: string,
    fileContext: string,
    relatedFiles?: string[],
  ): Promise<AutoFixResult> {
    const attempts: FixAttempt[] = [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // Expand context on 2nd attempt
      const context = attempt === 1
        ? { error: hookError, code: fileContext, hookType }
        : { error: hookError, code: fileContext, relatedFiles, hookType, previousAttempt: attempts[0]?.fix };

      const fixResult = await this.fixRunner.execute({
        taskId: `autofix-${taskId}-${attempt}`,
        agentId: "auto-fix-agent",
        taskType: "code-generation",
        context: {
          systemPrompt: this.buildFixPrompt(hookType, attempt),
          files: [{ path: "error-context", content: JSON.stringify(context) }],
        },
        constraints: [],
      });

      const diff = fixResult.output.generatedCode?.[0]?.content ?? "";

      // Diff size guard
      if (diff.split("\n").length > MAX_FIX_DIFF_LINES) {
        attempts.push({ attempt, error: hookError, fix: "DIFF_TOO_LARGE", hookResult: "fail" });
        continue;
      }

      // Simulate hook rerun (in real scenario, this would execute in worktree)
      // For now, record the attempt
      const hookPassed = false; // Will be determined by actual hook execution
      attempts.push({ attempt, error: hookError, fix: diff, hookResult: hookPassed ? "pass" : "fail" });

      if (hookPassed) {
        await this.recordAttempts(taskId, attempts, false);
        return { success: true, attempts, escalated: false, finalResult: fixResult };
      }
    }

    // Escalate to human
    await this.escalateToHuman(taskId, hookType, hookError, attempts);
    await this.recordAttempts(taskId, attempts, true);

    return { success: false, attempts, escalated: true };
  }

  private buildFixPrompt(hookType: string, attempt: number): string {
    const base = `You are a code fix agent. A ${hookType} hook failed. Generate a minimal fix.
Return JSON: { "generatedCode": [{ "path": "file.ts", "content": "fixed content", "action": "modify" }] }
Rules: (1) Only fix the specific error (2) Keep changes minimal (3) Max ${MAX_FIX_DIFF_LINES} lines changed`;

    if (attempt === 2) {
      return base + `\nThis is attempt 2. The first fix failed. Consider the broader context and related files.`;
    }
    return base;
  }

  private async escalateToHuman(taskId: string, hookType: string, error: string, attempts: FixAttempt[]): Promise<void> {
    // Insert escalation message into agent_messages (AgentInbox)
    const msgId = `msg-${crypto.randomUUID().slice(0, 8)}`;
    await this.db.prepare(
      `INSERT INTO agent_messages (id, from_agent, to_agent, type, content, status, created_at)
       VALUES (?, 'auto-fix-agent', 'human', 'hook_escalation', ?, 'pending', datetime('now'))`
    ).bind(msgId, JSON.stringify({
      taskId, hookType, error,
      attempts: attempts.map(a => ({ attempt: a.attempt, fix: a.fix.slice(0, 500), result: a.hookResult })),
      suggestedAction: `Manual fix needed: ${hookType} hook failure after ${attempts.length} auto-fix attempts`,
    })).run();

    // SSE notification
    this.sse?.pushEvent({
      event: "agent.hook.escalation",
      data: { taskId, hookType, attempts: attempts.length },
    });
  }

  private async recordAttempts(taskId: string, attempts: FixAttempt[], escalated: boolean): Promise<void> {
    await this.db.prepare(
      `UPDATE agent_tasks SET auto_fix_attempts = ?, auto_fix_log = ?,
       hook_status = ? WHERE id = ?`
    ).bind(
      attempts.length,
      JSON.stringify(attempts),
      escalated ? "escalated" : "fixed",
      taskId,
    ).run();
  }
}
```

### 5.4 Scheduled Handler (Cron Trigger)

**파일**: `packages/api/src/scheduled.ts`

```typescript
import type { Env } from "./env.js";
import { ReconciliationService } from "./services/reconciliation.js";
import { GitHubService } from "./services/github.js";
import { SpecParser } from "./services/spec-parser.js";
import { KpiLogger } from "./services/kpi-logger.js";

export async function handleScheduled(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const github = new GitHubService(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const specParser = new SpecParser();
  const reconciler = new ReconciliationService(env.DB, github, specParser);
  const kpiLogger = new KpiLogger(env.DB);

  // 1. Reconciliation (모든 org에 대해)
  const { results: orgs } = await env.DB.prepare(
    "SELECT id FROM organizations LIMIT 10"
  ).all<{ id: string }>();

  for (const org of orgs) {
    await reconciler.run(org.id, "cron", "git-wins");
    // 2. KPI 이벤트 정리 (30일 초과)
    await kpiLogger.pruneOldEvents(org.id, 30);
  }
}
```

---

## 6. UI/UX Design

### 6.1 Analytics Page Layout

**파일**: `packages/web/src/app/(app)/analytics/page.tsx`

```
┌──────────────────────────────────────────────────────┐
│  📊 Analytics                                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ WAU      │ │ Agent    │ │ SDD      │ │ Total   ││
│  │ 5 users  │ │ 78%      │ │ 92%      │ │ 342     ││
│  │ ▲ +2     │ │ ▲ +5%    │ │ ─ 0%     │ │ events  ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                      │
│  Daily Trends (CSS bars)                             │
│  ┌──────────────────────────────────────────────────┐│
│  │ █ ██ ███ ██ █ ███ ██ █████ ██ ███ ██ ████ █     ││
│  │ M  T  W  T  F  S  S  M  T  W  T  F  S  S       ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  Event Breakdown         │  Recent Events            │
│  ┌────────────────────┐  │  ┌──────────────────────┐ │
│  │ page_view  180 53% │  │  │ agent_task  user-1   │ │
│  │ api_call   120 35% │  │  │ page_view  user-2    │ │
│  │ agent_task  30  9% │  │  │ api_call   user-1    │ │
│  │ cli_invoke   8  2% │  │  │ ...                  │ │
│  │ sdd_check    4  1% │  │  │                      │ │
│  └────────────────────┘  │  └──────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 6.2 Component List

| Component | File | Responsibility |
|-----------|------|---------------|
| `AnalyticsPage` | `analytics/page.tsx` | KPI 대시보드 메인 페이지 |
| `KpiCard` | inline (page 내부) | 단일 KPI 숫자 카드 |
| `TrendBars` | inline | CSS-only 일별 막대 그래프 |
| `EventTable` | inline | 최근 이벤트 테이블 |

### 6.3 Sidebar 수정

`packages/web/src/components/sidebar.tsx`의 `fxNavItems`에 추가:

```typescript
{ href: "/analytics", label: "Analytics", icon: BarChart3 },
```

(`BarChart3` from lucide-react)

---

## 7. Error Handling

| Code | Context | Handling |
|------|---------|----------|
| 400 | KPI track invalid eventType | Zod 검증 에러 |
| 401 | 미인증 → summary/trends/events | 로그인 리다이렉트 |
| 403 | 비admin → reconciliation/run | "Admin only" 에러 |
| 500 | Reconciliation Git fetch 실패 | status=failed + error_message 기록 |
| 500 | AutoFix LLM 호출 실패 | 즉시 escalation (재시도 카운트에 불포함) |

---

## 8. Test Plan

### 8.1 Test Scope

| Feature | Type | Target | Count |
|---------|------|--------|:-----:|
| F100 | Unit | KpiLogger service | ~8 |
| F100 | API | KPI routes (4 endpoints) | ~8 |
| F99 | Unit | ReconciliationService | ~8 |
| F99 | API | Reconciliation routes (3 endpoints) | ~6 |
| F101 | Unit | AutoFixService | ~8 |
| F101 | Integration | Orchestrator + AutoFix | ~4 |
| **총** | | | **~42** |

### 8.2 Key Test Cases

#### F100 — KpiLogger
- [ ] `logEvent()`: page_view 이벤트 D1 저장 확인
- [ ] `getSummary()`: WAU 계산 정확성 (distinct user_id)
- [ ] `getSummary()`: agentCompletionRate 계산 (completed/total)
- [ ] `getTrends()`: groupBy=day 일별 집계
- [ ] `getTrends()`: groupBy=week 주별 집계
- [ ] `pruneOldEvents()`: 30일 초과 이벤트 삭제
- [ ] POST `/api/kpi/track`: 201 응답 + D1 기록
- [ ] GET `/api/kpi/summary`: 인증 필수, 기간 필터

#### F99 — ReconciliationService
- [ ] `detectDrift()`: Git에만 있는 F-item 감지
- [ ] `detectDrift()`: status 불일치 감지
- [ ] `applyGitWins()`: 누락 spec_item D1 INSERT
- [ ] `applyGitWins()`: status 불일치 D1 UPDATE
- [ ] `run()`: completed 상태 + report 기록
- [ ] `run()`: Git fetch 실패 → failed 상태
- [ ] POST `/api/reconciliation/run`: admin only 검증
- [ ] GET `/api/reconciliation/status`: 최근 run 반환

#### F101 — AutoFixService
- [ ] `retryWithFix()`: 1회 성공 → escalated=false
- [ ] `retryWithFix()`: 2회 실패 → escalated=true
- [ ] `retryWithFix()`: diff > 50줄 → DIFF_TOO_LARGE skip
- [ ] `escalateToHuman()`: agent_messages INSERT 확인
- [ ] `escalateToHuman()`: SSE event push 확인
- [ ] `recordAttempts()`: agent_tasks 업데이트 확인
- [ ] Orchestrator 통합: hook 실패 → AutoFix 트리거
- [ ] Orchestrator 통합: AutoFix 성공 → 정상 완료

---

## 9. Implementation Guide

### 9.1 File Structure (신규 + 수정)

```
packages/api/src/
├── db/migrations/
│   └── 0018_kpi_and_reconciliation.sql   [NEW]
├── schemas/
│   ├── kpi.ts                             [NEW]
│   └── reconciliation.ts                  [NEW]
├── services/
│   ├── kpi-logger.ts                      [NEW]
│   ├── reconciliation.ts                  [NEW]
│   ├── auto-fix.ts                        [NEW]
│   └── agent-orchestrator.ts              [MODIFY — executeTaskWithAutoFix]
├── routes/
│   ├── kpi.ts                             [NEW]
│   └── reconciliation.ts                  [NEW]
├── scheduled.ts                           [NEW]
├── app.ts                                 [MODIFY — route 등록 + scheduled export]
└── env.ts                                 [NO CHANGE — 기존 env 충분]

packages/web/src/
├── app/(app)/analytics/
│   └── page.tsx                           [NEW]
├── components/sidebar.tsx                 [MODIFY — Analytics 메뉴 추가]
└── lib/api-client.ts                      [MODIFY — KPI API 함수 추가]
```

### 9.2 Worker 배분 (Agent Team)

#### Worker 1 (W1): F100 — KPI 인프라

**수정 허용 파일:**
- `packages/api/src/db/migrations/0018_kpi_and_reconciliation.sql` (신규)
- `packages/api/src/schemas/kpi.ts` (신규)
- `packages/api/src/services/kpi-logger.ts` (신규)
- `packages/api/src/routes/kpi.ts` (신규)
- `packages/web/src/app/(app)/analytics/page.tsx` (신규)
- `packages/web/src/lib/api-client.ts` (수정 — KPI 함수 추가)

**수정 금지:** CLAUDE.md, SPEC.md, app.ts, sidebar.tsx (리더 관리)

#### Worker 2 (W2): F99 + F101

**수정 허용 파일:**
- `packages/api/src/schemas/reconciliation.ts` (신규)
- `packages/api/src/services/reconciliation.ts` (신규)
- `packages/api/src/services/auto-fix.ts` (신규)
- `packages/api/src/routes/reconciliation.ts` (신규)
- `packages/api/src/services/agent-orchestrator.ts` (수정 — autoFix 통합)
- `packages/api/src/scheduled.ts` (신규)

**수정 금지:** CLAUDE.md, SPEC.md, app.ts, env.ts (리더 관리)

#### 리더 (마무리 통합)

- `packages/api/src/app.ts` — kpi/reconciliation route 등록 + scheduled export
- `packages/web/src/components/sidebar.tsx` — Analytics 메뉴 추가
- `packages/api/wrangler.toml` — cron trigger 추가
- D1 migration 0018 로컬 적용 + 테스트 검증
- typecheck + lint + 전체 테스트

### 9.3 Implementation Order

```
Phase 1: Foundation (W1 + W2 병렬)
  W1: 0018 migration + kpi.ts schema + kpi-logger.ts service
  W2: reconciliation.ts schema + reconciliation.ts service + auto-fix.ts service

Phase 2: Routes + Tests (W1 + W2 병렬)
  W1: kpi routes (4 endpoints) + kpi-logger tests + kpi route tests
  W2: reconciliation routes (3 endpoints) + scheduled.ts + reconciliation tests
      + agent-orchestrator.ts 수정 + auto-fix tests

Phase 3: Web + Integration (W1 → Leader)
  W1: analytics/page.tsx + api-client KPI 함수
  Leader: app.ts 통합 + sidebar.tsx + wrangler.toml cron
          + typecheck + lint + full test run
```

---

## 10. wrangler.toml Changes

```toml
# 추가할 부분
[triggers]
crons = ["0 */6 * * *"]
```

**app.ts export 변경:**

```typescript
// 기존: export default app;
// 변경:
import { handleScheduled } from "./scheduled.js";
export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | Sinclair Seo |
