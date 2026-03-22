---
code: FX-DSGN-045
title: Sprint 45 — KPI 자동 수집 인프라 Design
version: 1.0
status: Active
category: DSGN
sprint: 45
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
plan: "[[FX-PLAN-045]]"
---

# Sprint 45 — KPI 자동 수집 인프라 Design

## 1. 개요

### 1.1 참조 문서
- Plan: `docs/01-plan/features/sprint-45-kpi-auto-collection.plan.md` [[FX-PLAN-045]]
- 기존 KPI: F100 (Sprint 27) — `services/kpi-logger.ts`, `routes/kpi.ts`, migration 0018
- 기존 UI: F125 (Sprint 30) — `app/(app)/analytics/page.tsx`
- PRD: `docs/specs/prd-v5.md` §KPI (K1, K7, K8, K11)

### 1.2 구현 순서
```
F160 (D1 0028 + Cron 집계)
  ↓
F158 (웹 자동 추적 훅)
  ↓
F159 (CLI 자동 로깅)
  ↓
F161 (대시보드 실데이터 연결)
```

## 2. F160: D1 스키마 + Cron 집계

### 2.1 D1 Migration 0028

**파일**: `packages/api/src/db/migrations/0028_kpi_snapshots.sql`

```sql
-- ═══════════════════════════════════════════════════════
-- Migration 0028: KPI Daily Snapshots
-- Sprint 45: F160
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  k7_wau INTEGER NOT NULL DEFAULT 0,
  k8_agent_completion_rate REAL NOT NULL DEFAULT 0,
  k11_sdd_integrity_rate REAL NOT NULL DEFAULT 0,
  k1_cli_invocations INTEGER NOT NULL DEFAULT 0,
  total_page_views INTEGER NOT NULL DEFAULT 0,
  total_api_calls INTEGER NOT NULL DEFAULT 0,
  total_events INTEGER NOT NULL DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES organizations(id),
  UNIQUE(tenant_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_tenant_date
  ON kpi_snapshots(tenant_id, snapshot_date DESC);
```

**설계 결정**:
- `UNIQUE(tenant_id, snapshot_date)` — 같은 날 여러 번 Cron 실행 시 `INSERT OR REPLACE`로 최신 값 덮어씀
- `k7_wau`는 해당 날짜 기준 최근 7일간 distinct user_id 수
- `total_page_views`, `total_api_calls` — 해당 날짜 단일 일 기준 이벤트 수
- 30일 이상 원본 이벤트가 삭제(pruneOldEvents)되므로 스냅샷이 장기 데이터 보존 역할

### 2.2 KpiLogger.generateDailySnapshot()

**파일**: `packages/api/src/services/kpi-logger.ts`

기존 KpiLogger 클래스에 메서드 추가:

```typescript
async generateDailySnapshot(
  tenantId: string,
  date?: string, // YYYY-MM-DD, 기본값 오늘
): Promise<{ id: string; snapshotDate: string }> {
  const snapshotDate = date ?? new Date().toISOString().slice(0, 10);
  const id = `snap-${tenantId}-${snapshotDate}`;

  // K7: 최근 7일 WAU (snapshot_date 기준)
  const weekCutoff = new Date(
    new Date(snapshotDate).getTime() - 7 * 86400_000
  ).toISOString();

  const wauResult = await this.db
    .prepare(
      `SELECT COUNT(DISTINCT user_id) as cnt
       FROM kpi_events
       WHERE tenant_id = ? AND created_at >= ? AND created_at < ?
         AND user_id IS NOT NULL`
    )
    .bind(tenantId, weekCutoff, snapshotDate + "T23:59:59Z")
    .first<{ cnt: number }>();

  // K8: 에이전트 완료율 (전체 기간)
  const agentTotal = await this.db
    .prepare(
      `SELECT COUNT(*) as cnt FROM kpi_events
       WHERE tenant_id = ? AND event_type = 'agent_task'`
    )
    .bind(tenantId)
    .first<{ cnt: number }>();

  const agentCompleted = await this.db
    .prepare(
      `SELECT COUNT(*) as cnt FROM kpi_events
       WHERE tenant_id = ? AND event_type = 'agent_task'
         AND json_extract(metadata, '$.status') = 'completed'`
    )
    .bind(tenantId)
    .first<{ cnt: number }>();

  const k8Rate = (agentTotal?.cnt ?? 0) > 0
    ? Math.round(((agentCompleted?.cnt ?? 0) / (agentTotal?.cnt ?? 1)) * 100)
    : 0;

  // K11: 최신 SDD 정합률
  const latestSdd = await this.db
    .prepare(
      `SELECT metadata FROM kpi_events
       WHERE tenant_id = ? AND event_type = 'sdd_check'
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(tenantId)
    .first<{ metadata: string }>();

  let k11Rate = 0;
  if (latestSdd?.metadata) {
    try {
      k11Rate = JSON.parse(latestSdd.metadata).rate ?? 0;
    } catch { /* ignore */ }
  }

  // K1: 해당 날짜 CLI 호출 수
  const dayStart = snapshotDate + "T00:00:00Z";
  const dayEnd = snapshotDate + "T23:59:59Z";

  const cliResult = await this.db
    .prepare(
      `SELECT COUNT(*) as cnt FROM kpi_events
       WHERE tenant_id = ? AND event_type = 'cli_invoke'
         AND created_at >= ? AND created_at <= ?`
    )
    .bind(tenantId, dayStart, dayEnd)
    .first<{ cnt: number }>();

  // 일별 이벤트 수
  const dailyStats = await this.db
    .prepare(
      `SELECT
         SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) as pv,
         SUM(CASE WHEN event_type='api_call' THEN 1 ELSE 0 END) as ac,
         COUNT(*) as total
       FROM kpi_events
       WHERE tenant_id = ? AND created_at >= ? AND created_at <= ?`
    )
    .bind(tenantId, dayStart, dayEnd)
    .first<{ pv: number; ac: number; total: number }>();

  // UPSERT (INSERT OR REPLACE)
  await this.db
    .prepare(
      `INSERT OR REPLACE INTO kpi_snapshots
       (id, tenant_id, snapshot_date, k7_wau, k8_agent_completion_rate,
        k11_sdd_integrity_rate, k1_cli_invocations,
        total_page_views, total_api_calls, total_events)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, tenantId, snapshotDate,
      wauResult?.cnt ?? 0, k8Rate, k11Rate,
      cliResult?.cnt ?? 0,
      dailyStats?.pv ?? 0, dailyStats?.ac ?? 0, dailyStats?.total ?? 0,
    )
    .run();

  return { id, snapshotDate };
}
```

### 2.3 KpiLogger.getSnapshotTrend()

스냅샷 기반 트렌드 조회 메서드 (F161에서 사용):

```typescript
async getSnapshotTrend(
  tenantId: string,
  days: number = 28,
): Promise<{
  snapshots: Array<{
    date: string;
    k7Wau: number;
    k8AgentRate: number;
    k11SddRate: number;
    k1CliInvocations: number;
    totalPageViews: number;
    totalEvents: number;
  }>;
}> {
  const cutoff = new Date(Date.now() - days * 86400_000)
    .toISOString().slice(0, 10);

  const rows = await this.db
    .prepare(
      `SELECT snapshot_date, k7_wau, k8_agent_completion_rate,
              k11_sdd_integrity_rate, k1_cli_invocations,
              total_page_views, total_events
       FROM kpi_snapshots
       WHERE tenant_id = ? AND snapshot_date >= ?
       ORDER BY snapshot_date ASC`
    )
    .bind(tenantId, cutoff)
    .all();

  return {
    snapshots: (rows.results ?? []).map((r: Record<string, unknown>) => ({
      date: r.snapshot_date as string,
      k7Wau: r.k7_wau as number,
      k8AgentRate: r.k8_agent_completion_rate as number,
      k11SddRate: r.k11_sdd_integrity_rate as number,
      k1CliInvocations: r.k1_cli_invocations as number,
      totalPageViews: r.total_page_views as number,
      totalEvents: r.total_events as number,
    })),
  };
}
```

### 2.4 scheduled.ts 수정

**파일**: `packages/api/src/scheduled.ts`

```typescript
// 기존 tasks 내에 추가
const tasks = orgs.map(async (org) => {
  const service = new ReconciliationService(env.DB, github, specParser);
  await service.run(org.id, "cron", "git-wins");
  await kpiLogger.pruneOldEvents(org.id, 30);

  // ✅ F160: 일별 KPI 스냅샷 생성
  await kpiLogger.generateDailySnapshot(org.id);
});
```

### 2.5 테스트 설계 (F160)

**파일**: `packages/api/src/__tests__/kpi-snapshots.test.ts`

| # | 테스트 케이스 | 검증 |
|---|--------------|------|
| 1 | generateDailySnapshot — 빈 DB | k7=0, k8=0, k11=0, total=0 |
| 2 | generateDailySnapshot — page_view 3건 + user 2명 | k7_wau=2 |
| 3 | generateDailySnapshot — agent_task 10건 중 7건 completed | k8=70 |
| 4 | generateDailySnapshot — sdd_check metadata.rate=92 | k11=92 |
| 5 | generateDailySnapshot — cli_invoke 5건 | k1=5 |
| 6 | generateDailySnapshot — UPSERT (같은 날 2회 실행) | 최신 값으로 덮어씀 |
| 7 | getSnapshotTrend — 7일 스냅샷 | 날짜순 정렬, 올바른 필드 매핑 |
| 8 | scheduled.ts — Cron 실행 시 스냅샷 생성 확인 | generateDailySnapshot 호출됨 |

## 3. F158: 웹 대시보드 페이지뷰 자동 추적

### 3.1 useKpiTracker 훅

**파일**: `packages/web/src/hooks/useKpiTracker.ts`

```typescript
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackKpiEvent } from "@/lib/api-client";

/**
 * 대시보드 영역에서 페이지 전환 시 page_view 이벤트를 자동 전송.
 * - fire-and-forget: 실패해도 UX 차단 없음
 * - throttle: 같은 경로 300ms 이내 중복 전송 방지
 */
export function useKpiTracker(): void {
  const pathname = usePathname();
  const lastSent = useRef<{ path: string; time: number }>({
    path: "",
    time: 0,
  });

  useEffect(() => {
    const now = Date.now();
    if (
      pathname === lastSent.current.path &&
      now - lastSent.current.time < 300
    ) {
      return; // throttle
    }

    lastSent.current = { path: pathname, time: now };

    // fire-and-forget
    trackKpiEvent("page_view", {
      path: pathname,
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // 추적 실패는 무시 — UX 우선
    });
  }, [pathname]);
}
```

### 3.2 layout.tsx 수정

**파일**: `packages/web/src/app/(app)/layout.tsx`

```typescript
"use client";

import { Sidebar } from "@/components/sidebar";
import { useKpiTracker } from "@/hooks/useKpiTracker";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useKpiTracker(); // ✅ F158: 페이지뷰 자동 추적

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
    </div>
  );
}
```

**주의**: 현재 layout.tsx는 Server Component (no "use client")이므로 "use client" 추가 필요. Sidebar가 이미 client component이므로 호환성 문제 없음.

### 3.3 테스트 설계 (F158)

**파일**: `packages/web/src/__tests__/hooks/useKpiTracker.test.ts`

| # | 테스트 케이스 | 검증 |
|---|--------------|------|
| 1 | 초기 렌더 시 trackKpiEvent 호출 | page_view + path 전송 |
| 2 | 경로 변경 시 새 이벤트 전송 | pathname 변경 → 재호출 |
| 3 | 같은 경로 300ms 이내 중복 차단 | trackKpiEvent 1회만 호출 |
| 4 | trackKpiEvent 실패 시 에러 미전파 | catch 동작 확인 |

## 4. F159: CLI 호출 자동 KPI 로깅

### 4.1 KpiReporter 서비스

**파일**: `packages/cli/src/services/kpi-reporter.ts`

```typescript
import { ConfigManager } from "./config-manager.js";

interface KpiReportPayload {
  eventType: "cli_invoke";
  metadata: {
    command: string;
    duration: number;
    success: boolean;
    version: string;
  };
}

const DEFAULT_API_URL = "https://foundry-x-api.ktds-axbd.workers.dev/api";
const TIMEOUT_MS = 3000;

export class KpiReporter {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl ?? DEFAULT_API_URL;
  }

  /**
   * CLI 커맨드 실행 후 KPI 이벤트를 서버에 전송.
   * fire-and-forget — 실패 시 무시, UX 차단 없음.
   */
  async report(
    command: string,
    duration: number,
    success: boolean,
  ): Promise<void> {
    const payload: KpiReportPayload = {
      eventType: "cli_invoke",
      metadata: { command, duration, success, version: "0.5.0" },
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        TIMEOUT_MS,
      );

      await fetch(`${this.apiUrl}/kpi/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch {
      // 네트워크 실패, 타임아웃 모두 무시
    }
  }

  /**
   * .foundry-x/config.json에서 API URL을 읽어 인스턴스 생성.
   */
  static async fromConfig(cwd: string): Promise<KpiReporter> {
    try {
      const configManager = new ConfigManager(cwd);
      const config = await configManager.read();
      const apiUrl = config?.apiUrl ?? DEFAULT_API_URL;
      return new KpiReporter(apiUrl);
    } catch {
      return new KpiReporter();
    }
  }
}
```

### 4.2 커맨드별 통합

각 커맨드(init, status, sync)의 `.action()` 핸들러 마지막에 추가:

```typescript
// 패턴 (status.ts 예시)
const startTime = Date.now();
let success = true;
try {
  // ... 기존 로직 ...
} catch (err) {
  success = false;
  throw err;
} finally {
  // ✅ F159: KPI 자동 로깅 (fire-and-forget)
  KpiReporter.fromConfig(cwd).then((reporter) =>
    reporter.report("status", Date.now() - startTime, success)
  ).catch(() => {});
}
```

### 4.3 --no-telemetry 플래그

`index.ts`에 글로벌 옵션 추가:

```typescript
program
  .option("--no-telemetry", "KPI 이벤트 전송 비활성화")
```

`KpiReporter.report()`에서 `program.opts().telemetry === false`이면 즉시 return.

### 4.4 테스트 설계 (F159)

**파일**: `packages/cli/src/services/__tests__/kpi-reporter.test.ts`

| # | 테스트 케이스 | 검증 |
|---|--------------|------|
| 1 | report() — 정상 전송 | fetch 호출, 올바른 payload |
| 2 | report() — 네트워크 에러 | 에러 미전파, resolve |
| 3 | report() — 타임아웃 (3초 초과) | AbortController 동작 |
| 4 | fromConfig() — config 없음 | 기본 URL 사용 |
| 5 | fromConfig() — config에 apiUrl 존재 | 커스텀 URL 사용 |
| 6 | --no-telemetry 플래그 | report() 미호출 |

## 5. F161: KPI 대시보드 실데이터 연결

### 5.1 API 확장: GET /kpi/snapshot-trend

**파일**: `packages/api/src/routes/kpi.ts`

```typescript
// ─── GET /api/kpi/snapshot-trend ───
const getSnapshotTrend = createRoute({
  method: "get",
  path: "/kpi/snapshot-trend",
  tags: ["KPI"],
  summary: "KPI 스냅샷 트렌드 (일별)",
  request: {
    query: z.object({
      days: z.coerce.number().min(1).max(90).default(28),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            snapshots: z.array(z.object({
              date: z.string(),
              k7Wau: z.number(),
              k8AgentRate: z.number(),
              k11SddRate: z.number(),
              k1CliInvocations: z.number(),
              totalPageViews: z.number(),
              totalEvents: z.number(),
            })),
          }),
        },
      },
      description: "일별 KPI 스냅샷 트렌드",
    },
  },
});
```

### 5.2 api-client.ts 확장

**파일**: `packages/web/src/lib/api-client.ts`

```typescript
export interface KpiSnapshot {
  date: string;
  k7Wau: number;
  k8AgentRate: number;
  k11SddRate: number;
  k1CliInvocations: number;
  totalPageViews: number;
  totalEvents: number;
}

export async function getKpiSnapshotTrend(
  days?: number,
): Promise<{ snapshots: KpiSnapshot[] }> {
  const params = new URLSearchParams();
  if (days) params.set("days", String(days));
  const qs = params.toString();
  return fetchApi(`/kpi/snapshot-trend${qs ? `?${qs}` : ""}`);
}
```

### 5.3 analytics 페이지 개선

**파일**: `packages/web/src/app/(app)/analytics/page.tsx`

변경 사항:
1. **빈 데이터 상태 UX**: KPI 카드에 데이터가 0이면 "아직 데이터가 수집되지 않았어요. 대시보드를 사용하면 자동으로 데이터가 쌓여요." 안내 메시지 표시
2. **스냅샷 트렌드 차트**: 기존 `KpiTrendPoint` 기반 차트에 추가로 `kpi_snapshots` 기반 K7/K8/K11 일별 추이 차트 표시
3. Phase4KpiSection에서 `getPhase4Kpi()` 외에 `getKpiSnapshotTrend(28)`도 호출하여 스냅샷 기반 트렌드 보강

### 5.4 테스트 설계 (F161)

| # | 테스트 케이스 | 검증 |
|---|--------------|------|
| 1 | GET /kpi/snapshot-trend — 빈 DB | snapshots: [] |
| 2 | GET /kpi/snapshot-trend — 스냅샷 7건 | 날짜순 정렬, 필드 매핑 |
| 3 | analytics 페이지 — 빈 데이터 안내 | "아직 데이터가 수집되지 않았어요" 표시 |
| 4 | analytics 페이지 — 실데이터 | KPI 카드에 숫자 표시 |

## 6. 파일 변경 매트릭스

| # | 파일 | 종류 | F-item | 변경 내용 |
|---|------|:----:|:------:|-----------|
| 1 | `api/src/db/migrations/0028_kpi_snapshots.sql` | 신규 | F160 | kpi_snapshots 테이블 |
| 2 | `api/src/services/kpi-logger.ts` | 수정 | F160 | generateDailySnapshot() + getSnapshotTrend() |
| 3 | `api/src/scheduled.ts` | 수정 | F160 | Cron에 스냅샷 생성 추가 |
| 4 | `api/src/routes/kpi.ts` | 수정 | F161 | GET /kpi/snapshot-trend 엔드포인트 |
| 5 | `api/src/schemas/kpi.ts` | 수정 | F161 | KpiSnapshotTrendSchema |
| 6 | `api/src/__tests__/kpi-snapshots.test.ts` | 신규 | F160 | 스냅샷 생성/조회 8개 테스트 |
| 7 | `api/src/__tests__/helpers/mock-d1.ts` | 수정 | F160 | kpi_snapshots 테이블 추가 |
| 8 | `web/src/hooks/useKpiTracker.ts` | 신규 | F158 | 페이지뷰 자동 추적 훅 |
| 9 | `web/src/app/(app)/layout.tsx` | 수정 | F158 | "use client" + useKpiTracker() |
| 10 | `web/src/app/(app)/analytics/page.tsx` | 수정 | F161 | 빈 상태 UX + 스냅샷 트렌드 |
| 11 | `web/src/lib/api-client.ts` | 수정 | F161 | getKpiSnapshotTrend() 함수 |
| 12 | `web/src/__tests__/hooks/useKpiTracker.test.ts` | 신규 | F158 | 훅 테스트 4개 |
| 13 | `cli/src/services/kpi-reporter.ts` | 신규 | F159 | CLI KPI 전송 서비스 |
| 14 | `cli/src/commands/status.ts` | 수정 | F159 | postRun KPI 로깅 |
| 15 | `cli/src/commands/init.ts` | 수정 | F159 | postRun KPI 로깅 |
| 16 | `cli/src/commands/sync.ts` | 수정 | F159 | postRun KPI 로깅 |
| 17 | `cli/src/index.ts` | 수정 | F159 | --no-telemetry 옵션 |
| 18 | `cli/src/services/__tests__/kpi-reporter.test.ts` | 신규 | F159 | 리포터 테스트 6개 |

**예상**: 신규 4파일 + 수정 14파일 = 18파일, 신규 테스트 ~18개

## 7. mock-d1.ts 테스트 헬퍼 변경

`packages/api/src/__tests__/helpers/mock-d1.ts`에 `kpi_snapshots` 테이블 SQL 추가:

```sql
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  k7_wau INTEGER NOT NULL DEFAULT 0,
  k8_agent_completion_rate REAL NOT NULL DEFAULT 0,
  k11_sdd_integrity_rate REAL NOT NULL DEFAULT 0,
  k1_cli_invocations INTEGER NOT NULL DEFAULT 0,
  total_page_views INTEGER NOT NULL DEFAULT 0,
  total_api_calls INTEGER NOT NULL DEFAULT 0,
  total_events INTEGER NOT NULL DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, snapshot_date)
);
```

## 8. 비기능 요구사항

| 항목 | 요구 | 설계 |
|------|------|------|
| 추적 실패 시 UX | 차단 금지 | fire-and-forget (catch → ignore) |
| 중복 전송 방지 | 300ms 이내 같은 경로 | useRef throttle |
| CLI 타임아웃 | 3초 초과 시 포기 | AbortController |
| Cron 추가 시간 | < 500ms | 단일 날짜 쿼리, 인덱스 활용 |
| 데이터 보존 | 30일 이상 | kpi_snapshots (원본 삭제 후에도 보존) |
| 옵트아웃 | --no-telemetry | CLI 글로벌 옵션 |

## 9. kpi_events CHECK 제약 메모

현재 D1의 `kpi_events.event_type` CHECK 제약은 5종만 허용:
`('page_view', 'api_call', 'agent_task', 'cli_invoke', 'sdd_check')`

KpiLogger TypeScript 타입에는 `'harness_violation' | 'service_switch' | 'integrated_workflow'`도 있으나 D1에는 미등록.
이번 Sprint에서는 5종만 사용하므로 CHECK 확장 불필요. 향후 K9/K10 측정 시 migration으로 확장.
