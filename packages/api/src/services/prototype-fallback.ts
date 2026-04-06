// ─── F354: Prototype Fallback Strategy (Sprint 159) ───

export type FallbackLevel = "cli" | "api" | "dead_letter";

export interface FallbackDecision {
  level: FallbackLevel;
  model: string;
  reason: string | null;
}

// 비용 단가 (per 1M tokens, 2026-04 기준)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  haiku: { input: 0.80, output: 4.00 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 15.00, output: 75.00 },
};

const FALLBACK_ORDER: FallbackLevel[] = ["cli", "api", "dead_letter"];

export class PrototypeFallbackStrategy {
  static next(currentLevel: FallbackLevel, reason: string): FallbackDecision {
    const idx = FALLBACK_ORDER.indexOf(currentLevel);
    const nextLevel = idx < FALLBACK_ORDER.length - 1
      ? FALLBACK_ORDER[idx + 1]
      : "dead_letter";

    const model = nextLevel === "api" ? "sonnet" : "haiku";
    return {
      level: nextLevel as FallbackLevel,
      model,
      reason,
    };
  }

  static calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const defaultCost = { input: 0.80, output: 4.00 };
    const costs = MODEL_COSTS[model] ?? defaultCost;
    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }

  static async checkBudget(
    db: D1Database,
    orgId: string,
    monthlyLimitUsd: number,
  ): Promise<{ withinBudget: boolean; currentUsd: number; limitUsd: number }> {
    const now = new Date();
    const startOfMonth = Math.floor(
      new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000,
    );

    const result = await db
      .prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) as total
         FROM prototype_usage_logs
         WHERE org_id = ? AND created_at >= ?`,
      )
      .bind(orgId, startOfMonth)
      .first<{ total: number }>();

    const currentUsd = result?.total ?? 0;
    return {
      withinBudget: currentUsd < monthlyLimitUsd,
      currentUsd,
      limitUsd: monthlyLimitUsd,
    };
  }
}
