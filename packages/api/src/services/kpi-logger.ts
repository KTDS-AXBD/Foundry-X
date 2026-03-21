/**
 * KpiLogger — KPI 이벤트 로깅 + 집계 서비스 (F100)
 */

export type KpiEventType = "page_view" | "api_call" | "agent_task" | "cli_invoke" | "sdd_check";

export interface KpiEvent {
  id: string;
  tenantId: string;
  eventType: string;
  userId: string | null;
  agentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface KpiSummary {
  wau: number;
  agentCompletionRate: number;
  sddIntegrityRate: number;
  totalEvents: number;
  breakdown: Record<string, number>;
  period: { from: string; to: string };
}

export interface KpiTrendPoint {
  date: string;
  pageViews: number;
  apiCalls: number;
  agentTasks: number;
}

export class KpiLogger {
  constructor(private db: D1Database) {}

  async logEvent(
    tenantId: string,
    eventType: KpiEventType,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, unknown> },
  ): Promise<{ id: string; recorded: boolean }> {
    const id = `kpi-${crypto.randomUUID()}`;
    const metadata = JSON.stringify(options?.metadata ?? {});

    await this.db
      .prepare(
        "INSERT INTO kpi_events (id, tenant_id, event_type, user_id, agent_id, metadata) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, tenantId, eventType, options?.userId ?? null, options?.agentId ?? null, metadata)
      .run();

    return { id, recorded: true };
  }

  async getSummary(tenantId: string, days: number = 7): Promise<KpiSummary> {
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
    const now = new Date().toISOString();

    // WAU: distinct user_id in period
    const wauResult = await this.db
      .prepare(
        "SELECT COUNT(DISTINCT user_id) as cnt FROM kpi_events WHERE tenant_id = ? AND created_at >= ? AND user_id IS NOT NULL",
      )
      .bind(tenantId, cutoff)
      .first<{ cnt: number }>();

    // Total events
    const totalResult = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM kpi_events WHERE tenant_id = ? AND created_at >= ?",
      )
      .bind(tenantId, cutoff)
      .first<{ cnt: number }>();

    // Agent completion rate: json_extract status=completed / total agent_task
    const agentTotal = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM kpi_events WHERE tenant_id = ? AND event_type = 'agent_task' AND created_at >= ?",
      )
      .bind(tenantId, cutoff)
      .first<{ cnt: number }>();

    const agentCompleted = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM kpi_events WHERE tenant_id = ? AND event_type = 'agent_task' AND created_at >= ? AND json_extract(metadata, '$.status') = 'completed'",
      )
      .bind(tenantId, cutoff)
      .first<{ cnt: number }>();

    const agentCompletionRate =
      (agentTotal?.cnt ?? 0) > 0
        ? Math.round(((agentCompleted?.cnt ?? 0) / (agentTotal?.cnt ?? 1)) * 100)
        : 0;

    // SDD integrity rate: latest sdd_check metadata.rate
    const latestSdd = await this.db
      .prepare(
        "SELECT metadata FROM kpi_events WHERE tenant_id = ? AND event_type = 'sdd_check' AND created_at >= ? ORDER BY created_at DESC LIMIT 1",
      )
      .bind(tenantId, cutoff)
      .first<{ metadata: string }>();

    let sddIntegrityRate = 0;
    if (latestSdd?.metadata) {
      try {
        const parsed = JSON.parse(latestSdd.metadata);
        sddIntegrityRate = typeof parsed.rate === "number" ? parsed.rate : 0;
      } catch {
        // ignore parse error
      }
    }

    // Breakdown by event_type
    const breakdownRows = await this.db
      .prepare(
        "SELECT event_type, COUNT(*) as cnt FROM kpi_events WHERE tenant_id = ? AND created_at >= ? GROUP BY event_type",
      )
      .bind(tenantId, cutoff)
      .all<{ event_type: string; cnt: number }>();

    const breakdown: Record<string, number> = {};
    for (const row of breakdownRows.results ?? []) {
      breakdown[row.event_type] = row.cnt;
    }

    return {
      wau: wauResult?.cnt ?? 0,
      agentCompletionRate,
      sddIntegrityRate,
      totalEvents: totalResult?.cnt ?? 0,
      breakdown,
      period: { from: cutoff, to: now },
    };
  }

  async getTrends(
    tenantId: string,
    days: number = 30,
    groupBy: "day" | "week" = "day",
  ): Promise<KpiTrendPoint[]> {
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

    const dateExpr =
      groupBy === "week"
        ? "strftime('%Y-W%W', created_at)"
        : "date(created_at)";

    const rows = await this.db
      .prepare(
        `SELECT ${dateExpr} as d,
           SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as pv,
           SUM(CASE WHEN event_type = 'api_call' THEN 1 ELSE 0 END) as ac,
           SUM(CASE WHEN event_type = 'agent_task' THEN 1 ELSE 0 END) as at_cnt
         FROM kpi_events
         WHERE tenant_id = ? AND created_at >= ?
         GROUP BY d
         ORDER BY d`,
      )
      .bind(tenantId, cutoff)
      .all<{ d: string; pv: number; ac: number; at_cnt: number }>();

    return (rows.results ?? []).map((r) => ({
      date: r.d,
      pageViews: r.pv,
      apiCalls: r.ac,
      agentTasks: r.at_cnt,
    }));
  }

  async getEvents(
    tenantId: string,
    options?: { type?: string; limit?: number; offset?: number },
  ): Promise<{ events: KpiEvent[]; total: number }> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let countSql = "SELECT COUNT(*) as cnt FROM kpi_events WHERE tenant_id = ?";
    let querySql = "SELECT * FROM kpi_events WHERE tenant_id = ?";
    const bindings: unknown[] = [tenantId];

    if (options?.type) {
      countSql += " AND event_type = ?";
      querySql += " AND event_type = ?";
      bindings.push(options.type);
    }

    querySql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

    const countResult = await this.db
      .prepare(countSql)
      .bind(...bindings)
      .first<{ cnt: number }>();

    const rows = await this.db
      .prepare(querySql)
      .bind(...bindings, limit, offset)
      .all<{
        id: string;
        tenant_id: string;
        event_type: string;
        user_id: string | null;
        agent_id: string | null;
        metadata: string;
        created_at: string;
      }>();

    const events: KpiEvent[] = (rows.results ?? []).map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      eventType: r.event_type,
      userId: r.user_id,
      agentId: r.agent_id,
      metadata: JSON.parse(r.metadata || "{}"),
      createdAt: r.created_at,
    }));

    return { events, total: countResult?.cnt ?? 0 };
  }

  async pruneOldEvents(tenantId: string, retentionDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 86400_000).toISOString();

    const result = await this.db
      .prepare("DELETE FROM kpi_events WHERE tenant_id = ? AND created_at < ?")
      .bind(tenantId, cutoff)
      .run();

    return result.meta?.changes ?? 0;
  }
}
