import type { D1Database } from "@cloudflare/workers-types";

export interface UsageSummary {
  orgId: string;
  month: string;
  used: number;
  limit: number;     // -1 = unlimited
  remaining: number; // -1 = unlimited
  planId: string;
}

interface UsageRow {
  api_calls: number;
}

interface PlanRow {
  plan_id: string;
  monthly_limit: number;
}

export class UsageTrackingService {
  currentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  async recordCall(db: D1Database, orgId: string): Promise<void> {
    const month = this.currentMonth();
    await db
      .prepare(
        `INSERT INTO usage_records (org_id, month, api_calls, updated_at)
         VALUES (?, ?, 1, datetime('now'))
         ON CONFLICT(org_id, month) DO UPDATE SET
           api_calls = api_calls + 1,
           updated_at = datetime('now')`
      )
      .bind(orgId, month)
      .run();
  }

  async getSummary(db: D1Database, orgId: string): Promise<UsageSummary> {
    const month = this.currentMonth();

    const [usageRow, planRow] = await Promise.all([
      db
        .prepare(`SELECT api_calls FROM usage_records WHERE org_id = ? AND month = ?`)
        .bind(orgId, month)
        .first<UsageRow>(),
      db
        .prepare(
          `SELECT COALESCE(ts.plan_id, 'free') AS plan_id, sp.monthly_limit
           FROM subscription_plans sp
           LEFT JOIN tenant_subscriptions ts ON ts.org_id = ?
           WHERE sp.id = COALESCE(ts.plan_id, 'free')`
        )
        .bind(orgId)
        .first<PlanRow>(),
    ]);

    const used = usageRow?.api_calls ?? 0;
    const limit = planRow?.monthly_limit ?? 1000;
    const planId = planRow?.plan_id ?? "free";
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

    return { orgId, month, used, limit, remaining, planId };
  }

  async isOverLimit(db: D1Database, orgId: string): Promise<boolean> {
    const summary = await this.getSummary(db, orgId);
    if (summary.limit === -1) return false;
    return summary.used >= summary.limit;
  }
}

export const usageTrackingService = new UsageTrackingService();
