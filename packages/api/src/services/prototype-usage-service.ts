// ─── F354: Prototype Usage Service (Sprint 159) ───

interface UsageLogEntry {
  jobId: string;
  builderType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  fallbackReason?: string;
}

interface UsageSummary {
  totalJobs: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: Array<{ model: string; jobs: number; costUsd: number }>;
  byBuilderType: Array<{ builderType: string; jobs: number; costUsd: number }>;
}

interface DailyUsage {
  date: string;
  jobs: number;
  costUsd: number;
}

interface BudgetStatus {
  currentUsd: number;
  limitUsd: number;
  remainingUsd: number;
  usagePercent: number;
  withinBudget: boolean;
}

export class PrototypeUsageService {
  constructor(private db: D1Database) {}

  async log(orgId: string, entry: UsageLogEntry): Promise<void> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO prototype_usage_logs
         (id, org_id, job_id, builder_type, model, input_tokens, output_tokens, cost_usd, duration_ms, fallback_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        orgId,
        entry.jobId,
        entry.builderType,
        entry.model,
        entry.inputTokens,
        entry.outputTokens,
        entry.costUsd,
        entry.durationMs,
        entry.fallbackReason ?? null,
      )
      .run();
  }

  async getMonthlySummary(
    orgId: string,
    year: number,
    month: number,
  ): Promise<UsageSummary> {
    const startTs = Math.floor(new Date(year, month - 1, 1).getTime() / 1000);
    const endTs = Math.floor(new Date(year, month, 1).getTime() / 1000);

    const totals = await this.db
      .prepare(
        `SELECT COUNT(*) as total_jobs,
                COALESCE(SUM(cost_usd), 0) as total_cost,
                COALESCE(SUM(input_tokens), 0) as total_input,
                COALESCE(SUM(output_tokens), 0) as total_output
         FROM prototype_usage_logs
         WHERE org_id = ? AND created_at >= ? AND created_at < ?`,
      )
      .bind(orgId, startTs, endTs)
      .first<{ total_jobs: number; total_cost: number; total_input: number; total_output: number }>();

    const modelBreakdown = await this.db
      .prepare(
        `SELECT model,
                COUNT(*) as jobs,
                COALESCE(SUM(cost_usd), 0) as cost
         FROM prototype_usage_logs
         WHERE org_id = ? AND created_at >= ? AND created_at < ?
         GROUP BY model`,
      )
      .bind(orgId, startTs, endTs)
      .all<{ model: string; jobs: number; cost: number }>();

    const builderBreakdown = await this.db
      .prepare(
        `SELECT builder_type,
                COUNT(*) as jobs,
                COALESCE(SUM(cost_usd), 0) as cost
         FROM prototype_usage_logs
         WHERE org_id = ? AND created_at >= ? AND created_at < ?
         GROUP BY builder_type`,
      )
      .bind(orgId, startTs, endTs)
      .all<{ builder_type: string; jobs: number; cost: number }>();

    return {
      totalJobs: totals?.total_jobs ?? 0,
      totalCostUsd: totals?.total_cost ?? 0,
      totalInputTokens: totals?.total_input ?? 0,
      totalOutputTokens: totals?.total_output ?? 0,
      byModel: (modelBreakdown.results ?? []).map((r) => ({
        model: r.model,
        jobs: r.jobs,
        costUsd: r.cost,
      })),
      byBuilderType: (builderBreakdown.results ?? []).map((r) => ({
        builderType: r.builder_type,
        jobs: r.jobs,
        costUsd: r.cost,
      })),
    };
  }

  async getDailyBreakdown(orgId: string, days: number): Promise<DailyUsage[]> {
    const startTs = Math.floor(Date.now() / 1000) - days * 86400;
    const rows = await this.db
      .prepare(
        `SELECT date(created_at, 'unixepoch') as date,
                COUNT(*) as jobs,
                COALESCE(SUM(cost_usd), 0) as cost
         FROM prototype_usage_logs
         WHERE org_id = ? AND created_at >= ?
         GROUP BY date(created_at, 'unixepoch')
         ORDER BY date`,
      )
      .bind(orgId, startTs)
      .all<{ date: string; jobs: number; cost: number }>();

    return (rows.results ?? []).map((r) => ({
      date: r.date,
      jobs: r.jobs,
      costUsd: r.cost,
    }));
  }

  async getBudgetStatus(orgId: string, monthlyLimitUsd: number): Promise<BudgetStatus> {
    const now = new Date();
    const startOfMonth = Math.floor(
      new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000,
    );

    const result = await this.db
      .prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) as total
         FROM prototype_usage_logs
         WHERE org_id = ? AND created_at >= ?`,
      )
      .bind(orgId, startOfMonth)
      .first<{ total: number }>();

    const currentUsd = result?.total ?? 0;
    const remainingUsd = Math.max(0, monthlyLimitUsd - currentUsd);
    const usagePercent = monthlyLimitUsd > 0
      ? Math.round((currentUsd / monthlyLimitUsd) * 10000) / 100
      : 0;

    return {
      currentUsd,
      limitUsd: monthlyLimitUsd,
      remainingUsd,
      usagePercent,
      withinBudget: currentUsd < monthlyLimitUsd,
    };
  }
}
