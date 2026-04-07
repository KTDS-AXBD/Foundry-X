import type { D1Database } from "@cloudflare/workers-types";

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyLimit: number;
}

interface PlanRow {
  id: string;
  name: string;
  monthly_limit: number;
}

export class PlanService {
  async listPlans(db: D1Database): Promise<SubscriptionPlan[]> {
    const { results } = await db
      .prepare(`SELECT id, name, monthly_limit FROM subscription_plans ORDER BY monthly_limit ASC`)
      .all<PlanRow>();
    return results.map((r) => ({
      id: r.id,
      name: r.name,
      monthlyLimit: r.monthly_limit,
    }));
  }

  async getTenantPlan(db: D1Database, orgId: string): Promise<SubscriptionPlan> {
    const row = await db
      .prepare(
        `SELECT sp.id, sp.name, sp.monthly_limit
         FROM subscription_plans sp
         LEFT JOIN tenant_subscriptions ts ON ts.org_id = ?
         WHERE sp.id = COALESCE(ts.plan_id, 'free')`
      )
      .bind(orgId)
      .first<PlanRow>();

    return row
      ? { id: row.id, name: row.name, monthlyLimit: row.monthly_limit }
      : { id: "free", name: "Free", monthlyLimit: 1000 };
  }

  async updateTenantPlan(db: D1Database, orgId: string, planId: string): Promise<void> {
    await db
      .prepare(
        `INSERT INTO tenant_subscriptions (org_id, plan_id, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(org_id) DO UPDATE SET
           plan_id = excluded.plan_id,
           updated_at = excluded.updated_at`
      )
      .bind(orgId, planId)
      .run();
  }
}

export const planService = new PlanService();
