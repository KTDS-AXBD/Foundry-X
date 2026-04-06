/**
 * F278: BdRoiCalculatorService — BD_ROI 공식 엔진 (Sprint 107)
 *
 * BD_ROI = (Total_Savings + Signal_Value) / Total_Investment × 100
 */

import type { BdRoiSummary } from "@foundry-x/shared";
import type { RoiSummaryQuery } from "../schemas/roi-benchmark.js";
import { RoiBenchmarkService } from "./roi-benchmark.js";
import { SignalValuationService } from "./signal-valuation.js";
import { OfferingMetricsService } from "./offering-metrics-service.js";

export class BdRoiCalculatorService {
  constructor(
    private db: D1Database,
    private benchmarkSvc: RoiBenchmarkService,
    private signalSvc: SignalValuationService,
  ) {}

  async calculate(
    tenantId: string,
    query: RoiSummaryQuery,
  ): Promise<BdRoiSummary> {
    const now = new Date();
    const from = new Date(now.getTime() - query.days * 24 * 60 * 60 * 1000);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = now.toISOString().slice(0, 10);

    // 1. Get latest benchmarks
    const { benchmarks } = await this.benchmarkSvc.getLatest(tenantId, {
      pipelineStage: query.pipelineStage,
      limit: 100,
      offset: 0,
    });

    // 2. Total Savings = Σ (cold_avg - warm_avg) × warm_executions
    let totalSavings = 0;
    let totalWarmExecutions = 0;
    for (const b of benchmarks) {
      const perExecSaving = b.coldAvgCostUsd - b.warmAvgCostUsd;
      totalSavings += perExecSaving * b.warmExecutions;
      totalWarmExecutions += b.warmExecutions;
    }
    totalSavings = Math.round(totalSavings * 10000) / 10000;

    // 2b. Offering savings (F383: 수동 제안서 대비 자동화 절감)
    const offeringMetricsSvc = new OfferingMetricsService(this.db);
    const offeringSavings = await offeringMetricsSvc.calculateOfferingSavings(tenantId, fromStr);
    totalSavings += offeringSavings;
    totalSavings = Math.round(totalSavings * 10000) / 10000;

    // 3. Signal Value
    const portfolioValue = await this.signalSvc.calculatePortfolioValue(tenantId);
    const valuations = await this.signalSvc.getValuations(tenantId);
    const valMap: Record<string, number> = {};
    for (const v of valuations) {
      valMap[v.signalType] = v.valueUsd;
    }

    // Get signal counts
    const { results: signalCounts } = await this.db
      .prepare(
        `SELECT decision, COUNT(*) AS cnt
         FROM ax_viability_checkpoints
         WHERE org_id = ?
         GROUP BY decision`,
      )
      .bind(tenantId)
      .all<{ decision: string; cnt: number }>();

    const signalCountMap: Record<string, number> = {};
    for (const row of signalCounts) {
      signalCountMap[row.decision] = row.cnt;
    }

    const signalValue = portfolioValue.total;

    // 4. Total Investment = SUM(cost_usd) within period
    let investmentQuery = `SELECT COALESCE(SUM(cost_usd), 0) AS total FROM skill_executions WHERE tenant_id = ? AND executed_at >= ?`;
    const investmentBindings: unknown[] = [tenantId, fromStr];
    if (query.pipelineStage) {
      // No direct pipeline_stage on skill_executions; use all
    }

    const investmentRow = await this.db
      .prepare(investmentQuery)
      .bind(...investmentBindings)
      .first<{ total: number }>();

    const totalInvestment = Math.round((investmentRow?.total ?? 0) * 10000) / 10000;

    // 5. BD_ROI formula
    const bdRoi = totalInvestment === 0
      ? 0
      : Math.round(((totalSavings + signalValue) / totalInvestment) * 10000) / 100;

    // 6. Top skills by savings
    const topSkills = benchmarks
      .filter((b) => b.costSavingsPct !== null && b.costSavingsPct > 0)
      .sort((a, b) => (b.costSavingsPct ?? 0) - (a.costSavingsPct ?? 0))
      .slice(0, 5)
      .map((b) => ({ skillId: b.skillId, savingsPct: b.costSavingsPct! }));

    const avgSavingsPerExecution = totalWarmExecutions > 0
      ? Math.round((totalSavings / totalWarmExecutions) * 10000) / 10000
      : 0;

    return {
      period: { days: query.days, from: fromStr, to: toStr },
      bdRoi,
      totalInvestment,
      totalSavings,
      signalValue,
      breakdown: {
        warmRunSavings: {
          totalSaved: totalSavings,
          avgSavingsPerExecution,
          warmExecutionCount: totalWarmExecutions,
        },
        signalBreakdown: {
          go: {
            count: signalCountMap["go"] ?? 0,
            valuePerUnit: valMap["go"] ?? 50_000,
            total: portfolioValue.go,
          },
          pivot: {
            count: signalCountMap["pivot"] ?? 0,
            valuePerUnit: valMap["pivot"] ?? 10_000,
            total: portfolioValue.pivot,
          },
          drop: {
            count: signalCountMap["drop"] ?? 0,
            valuePerUnit: valMap["drop"] ?? 0,
            total: portfolioValue.drop,
          },
        },
      },
      topSkillsBySavings: topSkills,
      offeringSavingsUsd: offeringSavings,
    };
  }
}
