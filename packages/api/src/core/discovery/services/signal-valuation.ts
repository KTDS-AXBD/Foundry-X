/**
 * F278: SignalValuationService — 사업성 신호등 달러 환산 (Sprint 107)
 *
 * Go/Pivot/Drop 신호별 기대가치(달러) 설정 + bd-process-tracker 연동 포트폴리오 가치 산출.
 */

import type { SignalValuation } from "@foundry-x/shared";
import type { UpdateSignalValuationsInput } from "../../harness/schemas/roi-benchmark.js";

export const DEFAULT_SIGNAL_VALUATIONS = {
  go: 50_000,
  pivot: 10_000,
  drop: 0,
} as const;

function mapRow(row: Record<string, unknown>): SignalValuation {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    signalType: row.signal_type as "go" | "pivot" | "drop",
    valueUsd: row.value_usd as number,
    description: (row.description as string) ?? null,
    updatedBy: row.updated_by as string,
    updatedAt: row.updated_at as string,
  };
}

export class SignalValuationService {
  constructor(private db: D1Database) {}

  async getValuations(tenantId: string): Promise<SignalValuation[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM roi_signal_valuations WHERE tenant_id = ? ORDER BY signal_type")
      .bind(tenantId)
      .all();

    const rows = (results as Record<string, unknown>[]).map(mapRow);

    // Fill in defaults for missing signal types
    const existing = new Set(rows.map((r) => r.signalType));
    const defaults: SignalValuation[] = [];
    for (const [signalType, valueUsd] of Object.entries(DEFAULT_SIGNAL_VALUATIONS)) {
      if (!existing.has(signalType as "go" | "pivot" | "drop")) {
        defaults.push({
          id: "",
          tenantId,
          signalType: signalType as "go" | "pivot" | "drop",
          valueUsd,
          description: null,
          updatedBy: "system",
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return [...rows, ...defaults].sort((a, b) => a.signalType.localeCompare(b.signalType));
  }

  async updateValuations(
    tenantId: string,
    input: UpdateSignalValuationsInput,
    updatedBy: string,
  ): Promise<SignalValuation[]> {
    for (const v of input.valuations) {
      const id = crypto.randomUUID().replace(/-/g, "");
      await this.db
        .prepare(
          `INSERT INTO roi_signal_valuations (id, tenant_id, signal_type, value_usd, description, updated_by)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(tenant_id, signal_type)
           DO UPDATE SET value_usd = excluded.value_usd,
                         description = excluded.description,
                         updated_by = excluded.updated_by,
                         updated_at = datetime('now')`,
        )
        .bind(id, tenantId, v.signalType, v.valueUsd, v.description ?? null, updatedBy)
        .run();
    }

    return this.getValuations(tenantId);
  }

  async calculatePortfolioValue(
    tenantId: string,
  ): Promise<{ go: number; pivot: number; drop: number; total: number }> {
    // Get signal counts from ax_viability_checkpoints
    const { results: counts } = await this.db
      .prepare(
        `SELECT decision, COUNT(*) AS cnt
         FROM ax_viability_checkpoints
         WHERE org_id = ?
         GROUP BY decision`,
      )
      .bind(tenantId)
      .all<{ decision: string; cnt: number }>();

    const countMap: Record<string, number> = {};
    for (const row of counts) {
      countMap[row.decision] = row.cnt;
    }

    const valuations = await this.getValuations(tenantId);
    const valMap: Record<string, number> = {};
    for (const v of valuations) {
      valMap[v.signalType] = v.valueUsd;
    }

    const goVal = (countMap["go"] ?? 0) * (valMap["go"] ?? DEFAULT_SIGNAL_VALUATIONS.go);
    const pivotVal = (countMap["pivot"] ?? 0) * (valMap["pivot"] ?? DEFAULT_SIGNAL_VALUATIONS.pivot);
    const dropVal = (countMap["drop"] ?? 0) * (valMap["drop"] ?? DEFAULT_SIGNAL_VALUATIONS.drop);

    return {
      go: goVal,
      pivot: pivotVal,
      drop: dropVal,
      total: goVal + pivotVal + dropVal,
    };
  }
}
