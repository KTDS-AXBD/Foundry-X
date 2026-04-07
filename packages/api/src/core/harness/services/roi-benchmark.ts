/**
 * F278: RoiBenchmarkService — Cold Start vs Warm Run 비용 분석 (Sprint 107)
 *
 * skill_executions에서 스킬별 실행 순서를 기반으로 Cold/Warm 분류 후
 * 비용/시간/토큰 절감률을 계산하여 스냅샷 저장.
 */

import type { RoiBenchmark, RoiBenchmarkDetail, RoiByStage, SkillExecutionSummary } from "@foundry-x/shared";
import type { RunBenchmarkInput, LatestBenchmarkQuery, BenchmarkHistoryQuery, ByStageQuery } from "../schemas/roi-benchmark.js";

interface ColdWarmRow {
  skill_id: string;
  phase: "cold" | "warm";
  exec_count: number;
  avg_cost_usd: number;
  avg_duration_ms: number;
  avg_tokens: number;
  success_rate: number;
}

function calcSavingsPct(cold: number, warm: number): number | null {
  if (cold === 0) return null;
  return Math.round(((cold - warm) / cold) * 10000) / 100;
}

function mapRow(row: Record<string, unknown>): RoiBenchmark {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    skillId: row.skill_id as string,
    coldThreshold: row.cold_threshold as number,
    coldExecutions: row.cold_executions as number,
    warmExecutions: row.warm_executions as number,
    coldAvgCostUsd: row.cold_avg_cost_usd as number,
    warmAvgCostUsd: row.warm_avg_cost_usd as number,
    coldAvgDurationMs: row.cold_avg_duration_ms as number,
    warmAvgDurationMs: row.warm_avg_duration_ms as number,
    coldAvgTokens: row.cold_avg_tokens as number,
    warmAvgTokens: row.warm_avg_tokens as number,
    coldSuccessRate: row.cold_success_rate as number,
    warmSuccessRate: row.warm_success_rate as number,
    costSavingsPct: row.cost_savings_pct as number | null,
    durationSavingsPct: row.duration_savings_pct as number | null,
    tokenSavingsPct: row.token_savings_pct as number | null,
    pipelineStage: row.pipeline_stage as string | null,
    createdAt: row.created_at as string,
  };
}

export class RoiBenchmarkService {
  constructor(private db: D1Database) {}

  async run(
    tenantId: string,
    params: RunBenchmarkInput,
  ): Promise<{ benchmarks: RoiBenchmark[]; count: number; skipped: number }> {
    const { coldThreshold, pipelineStage, skillId, minExecutions } = params;

    // Cold/Warm 분류 쿼리 (ROW_NUMBER 윈도우 함수)
    let whereClause = "WHERE se.tenant_id = ?";
    const bindings: unknown[] = [tenantId];
    if (skillId) {
      whereClause += " AND se.skill_id = ?";
      bindings.push(skillId);
    }

    const coldWarmQuery = `
      WITH ordered_executions AS (
        SELECT
          se.skill_id,
          se.cost_usd,
          se.duration_ms,
          (se.input_tokens + se.output_tokens) AS total_tokens,
          se.status,
          ROW_NUMBER() OVER (
            PARTITION BY se.skill_id ORDER BY se.executed_at ASC
          ) AS exec_order
        FROM skill_executions se
        ${whereClause}
      ),
      cold_warm AS (
        SELECT
          skill_id,
          CASE WHEN exec_order <= ? THEN 'cold' ELSE 'warm' END AS phase,
          cost_usd,
          duration_ms,
          total_tokens,
          status
        FROM ordered_executions
      )
      SELECT
        skill_id,
        phase,
        COUNT(*) AS exec_count,
        AVG(cost_usd) AS avg_cost_usd,
        AVG(duration_ms) AS avg_duration_ms,
        AVG(total_tokens) AS avg_tokens,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS success_rate
      FROM cold_warm
      GROUP BY skill_id, phase
    `;
    bindings.push(coldThreshold);

    const { results: rows } = await this.db
      .prepare(coldWarmQuery)
      .bind(...bindings)
      .all<ColdWarmRow>();

    // Group by skill_id
    const skillMap = new Map<string, { cold?: ColdWarmRow; warm?: ColdWarmRow }>();
    for (const row of rows) {
      const entry = skillMap.get(row.skill_id) ?? {};
      entry[row.phase] = row;
      skillMap.set(row.skill_id, entry);
    }

    const benchmarks: RoiBenchmark[] = [];
    let skipped = 0;

    for (const [sid, data] of skillMap) {
      const cold = data.cold;
      const warm = data.warm;
      if (!cold || !warm || (cold.exec_count + warm.exec_count) < minExecutions) {
        skipped++;
        continue;
      }

      const id = crypto.randomUUID().replace(/-/g, "");
      const costSavings = calcSavingsPct(cold.avg_cost_usd, warm.avg_cost_usd);
      const durationSavings = calcSavingsPct(cold.avg_duration_ms, warm.avg_duration_ms);
      const tokenSavings = calcSavingsPct(cold.avg_tokens, warm.avg_tokens);

      await this.db
        .prepare(
          `INSERT INTO roi_benchmarks
           (id, tenant_id, skill_id, cold_threshold, cold_executions, warm_executions,
            cold_avg_cost_usd, warm_avg_cost_usd, cold_avg_duration_ms, warm_avg_duration_ms,
            cold_avg_tokens, warm_avg_tokens, cold_success_rate, warm_success_rate,
            cost_savings_pct, duration_savings_pct, token_savings_pct, pipeline_stage)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id, tenantId, sid, coldThreshold,
          cold.exec_count, warm.exec_count,
          cold.avg_cost_usd, warm.avg_cost_usd,
          cold.avg_duration_ms, warm.avg_duration_ms,
          cold.avg_tokens, warm.avg_tokens,
          cold.success_rate, warm.success_rate,
          costSavings, durationSavings, tokenSavings,
          pipelineStage ?? null,
        )
        .run();

      benchmarks.push({
        id,
        tenantId,
        skillId: sid,
        coldThreshold,
        coldExecutions: cold.exec_count,
        warmExecutions: warm.exec_count,
        coldAvgCostUsd: cold.avg_cost_usd,
        warmAvgCostUsd: warm.avg_cost_usd,
        coldAvgDurationMs: cold.avg_duration_ms,
        warmAvgDurationMs: warm.avg_duration_ms,
        coldAvgTokens: cold.avg_tokens,
        warmAvgTokens: warm.avg_tokens,
        coldSuccessRate: cold.success_rate,
        warmSuccessRate: warm.success_rate,
        costSavingsPct: costSavings,
        durationSavingsPct: durationSavings,
        tokenSavingsPct: tokenSavings,
        pipelineStage: pipelineStage ?? null,
        createdAt: new Date().toISOString(),
      });
    }

    return { benchmarks, count: benchmarks.length, skipped };
  }

  async getLatest(
    tenantId: string,
    query: LatestBenchmarkQuery,
  ): Promise<{ benchmarks: RoiBenchmark[]; total: number }> {
    let where = "WHERE rb.tenant_id = ?";
    const bindings: unknown[] = [tenantId];

    if (query.pipelineStage) {
      where += " AND rb.pipeline_stage = ?";
      bindings.push(query.pipelineStage);
    }
    if (query.minSavings !== undefined) {
      where += " AND rb.cost_savings_pct >= ?";
      bindings.push(query.minSavings);
    }

    // Latest per skill: use max(created_at) subquery
    const sql = `
      SELECT rb.* FROM roi_benchmarks rb
      INNER JOIN (
        SELECT l.skill_id AS l_skill_id, MAX(l.created_at) AS max_created
        FROM roi_benchmarks l
        WHERE l.tenant_id = ?
        GROUP BY l.skill_id
      ) latest ON rb.skill_id = latest.l_skill_id AND rb.created_at = latest.max_created
      ${where}
      ORDER BY rb.cost_savings_pct DESC NULLS LAST
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) AS cnt FROM roi_benchmarks rb
      INNER JOIN (
        SELECT l.skill_id AS l_skill_id, MAX(l.created_at) AS max_created
        FROM roi_benchmarks l
        WHERE l.tenant_id = ?
        GROUP BY l.skill_id
      ) latest ON rb.skill_id = latest.l_skill_id AND rb.created_at = latest.max_created
      ${where}
    `;

    const [dataResult, countResult] = await Promise.all([
      this.db.prepare(sql).bind(tenantId, ...bindings, query.limit, query.offset).all(),
      this.db.prepare(countSql).bind(tenantId, ...bindings).first<{ cnt: number }>(),
    ]);

    return {
      benchmarks: (dataResult.results as Record<string, unknown>[]).map(mapRow),
      total: countResult?.cnt ?? 0,
    };
  }

  async getHistory(
    tenantId: string,
    query: BenchmarkHistoryQuery,
  ): Promise<{ benchmarks: RoiBenchmark[] }> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM roi_benchmarks
         WHERE tenant_id = ? AND skill_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(tenantId, query.skillId, query.limit)
      .all();

    return { benchmarks: (results as Record<string, unknown>[]).map(mapRow) };
  }

  async getSkillDetail(
    tenantId: string,
    skillId: string,
  ): Promise<RoiBenchmarkDetail | null> {
    // Get latest benchmark
    const row = await this.db
      .prepare(
        `SELECT * FROM roi_benchmarks
         WHERE tenant_id = ? AND skill_id = ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(tenantId, skillId)
      .first();

    if (!row) return null;

    const benchmark = mapRow(row as Record<string, unknown>);

    // Get individual executions classified as cold/warm
    const { results: execRows } = await this.db
      .prepare(
        `SELECT id, cost_usd, duration_ms,
                (input_tokens + output_tokens) AS total_tokens,
                status, executed_at,
                ROW_NUMBER() OVER (ORDER BY executed_at ASC) AS exec_order
         FROM skill_executions
         WHERE tenant_id = ? AND skill_id = ?
         ORDER BY executed_at ASC`,
      )
      .bind(tenantId, skillId)
      .all();

    const coldList: SkillExecutionSummary[] = [];
    const warmList: SkillExecutionSummary[] = [];

    for (const er of execRows as Array<Record<string, unknown>>) {
      const summary: SkillExecutionSummary = {
        id: er.id as string,
        costUsd: er.cost_usd as number,
        durationMs: er.duration_ms as number,
        totalTokens: er.total_tokens as number,
        status: er.status as string,
        executedAt: er.executed_at as string,
      };
      if ((er.exec_order as number) <= benchmark.coldThreshold) {
        coldList.push(summary);
      } else {
        warmList.push(summary);
      }
    }

    return {
      ...benchmark,
      coldExecutionsList: coldList,
      warmExecutionsList: warmList,
    };
  }

  async getByStage(
    tenantId: string,
    _query: ByStageQuery,
  ): Promise<RoiByStage[]> {
    const { results } = await this.db
      .prepare(
        `SELECT
           rb.pipeline_stage,
           COUNT(DISTINCT rb.skill_id) AS skill_count,
           AVG(rb.cost_savings_pct) AS avg_cost_savings_pct,
           AVG(rb.duration_savings_pct) AS avg_duration_savings_pct,
           SUM((rb.cold_avg_cost_usd - rb.warm_avg_cost_usd) * rb.warm_executions) AS total_warm_savings_usd
         FROM roi_benchmarks rb
         INNER JOIN (
           SELECT l.skill_id AS l_skill_id, MAX(l.created_at) AS max_created
           FROM roi_benchmarks l WHERE l.tenant_id = ?
           GROUP BY l.skill_id
         ) latest ON rb.skill_id = latest.l_skill_id AND rb.created_at = latest.max_created
         WHERE rb.tenant_id = ? AND rb.pipeline_stage IS NOT NULL
         GROUP BY rb.pipeline_stage
         ORDER BY rb.pipeline_stage`,
      )
      .bind(tenantId, tenantId)
      .all();

    return (results as Array<Record<string, unknown>>).map((r) => ({
      pipelineStage: r.pipeline_stage as string,
      skillCount: r.skill_count as number,
      avgCostSavingsPct: Math.round(((r.avg_cost_savings_pct as number) ?? 0) * 100) / 100,
      avgDurationSavingsPct: Math.round(((r.avg_duration_savings_pct as number) ?? 0) * 100) / 100,
      totalWarmSavingsUsd: Math.round(((r.total_warm_savings_usd as number) ?? 0) * 10000) / 10000,
    }));
  }
}
