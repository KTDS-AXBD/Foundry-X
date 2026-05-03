/**
 * F276: PatternExtractorService — skill_executions 성공 패턴 자동 추출
 */

import type {
  DerivedPattern,
  DerivedPatternDetail,
  DerivedPatternStatus,
  PipelineStage,
  SkillRegistryEntry,
  SkillExecutionRecord,
} from "@foundry-x/shared";
import type { ExtractPatternsInput, ListPatternsQuery } from "../../../schemas/derived-engine.js";

export class PatternExtractorService {
  constructor(private db: D1Database) {}

  async extract(
    tenantId: string,
    params: ExtractPatternsInput,
  ): Promise<{ patterns: DerivedPattern[]; count: number }> {
    const singlePatterns = await this.extractSinglePatterns(tenantId, params);

    let chainPatterns: DerivedPattern[] = [];
    if (params.includeChains) {
      chainPatterns = await this.extractChainPatterns(tenantId, params);
    }

    const allPatterns = [...singlePatterns, ...chainPatterns];
    return { patterns: allPatterns, count: allPatterns.length };
  }

  private async extractSinglePatterns(
    tenantId: string,
    params: ExtractPatternsInput,
  ): Promise<DerivedPattern[]> {
    let sql = `
      SELECT
        se.skill_id,
        COALESCE(se.biz_item_id, 'unknown') AS pipeline_stage,
        NULL AS discovery_stage,
        COUNT(*) AS sample_count,
        SUM(CASE WHEN se.status = 'completed' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS success_rate,
        AVG(se.cost_usd) AS avg_cost_usd,
        AVG(se.duration_ms) AS avg_duration_ms
      FROM skill_executions se
      WHERE se.tenant_id = ?
    `;
    const bindings: unknown[] = [tenantId];

    if (params.pipelineStage) {
      sql += " AND se.biz_item_id = ?";
      bindings.push(params.pipelineStage);
    }

    sql += `
      GROUP BY se.skill_id, pipeline_stage
      HAVING sample_count >= ? AND success_rate >= ?
    `;
    bindings.push(params.minSampleCount, params.minSuccessRate);

    const rows = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<{
        skill_id: string;
        pipeline_stage: string;
        discovery_stage: string | null;
        sample_count: number;
        success_rate: number;
        avg_cost_usd: number;
        avg_duration_ms: number;
      }>();

    const patterns: DerivedPattern[] = [];
    for (const r of rows.results ?? []) {
      const confidence = wilsonScoreLowerBound(r.success_rate, r.sample_count);
      const id = generateId("dp");
      const expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();

      const stage = isValidPipelineStage(r.pipeline_stage)
        ? r.pipeline_stage
        : "discovery";

      await this.db
        .prepare(
          `INSERT INTO derived_patterns
            (id, tenant_id, pipeline_stage, discovery_stage, pattern_type, skill_ids,
             success_rate, sample_count, avg_cost_usd, avg_duration_ms, confidence, status, expires_at)
           VALUES (?, ?, ?, ?, 'single', ?, ?, ?, ?, ?, ?, 'active', ?)`,
        )
        .bind(
          id, tenantId, stage, r.discovery_stage,
          JSON.stringify([r.skill_id]),
          r.success_rate, r.sample_count,
          r.avg_cost_usd ?? 0, Math.round(r.avg_duration_ms ?? 0),
          confidence, expiresAt,
        )
        .run();

      patterns.push({
        id,
        tenantId,
        pipelineStage: stage as PipelineStage,
        discoveryStage: r.discovery_stage,
        patternType: "single",
        skillIds: [r.skill_id],
        successRate: r.success_rate,
        sampleCount: r.sample_count,
        avgCostUsd: r.avg_cost_usd ?? 0,
        avgDurationMs: Math.round(r.avg_duration_ms ?? 0),
        confidence,
        status: "active",
        extractedAt: new Date().toISOString(),
        expiresAt,
      });
    }

    return patterns;
  }

  private async extractChainPatterns(
    tenantId: string,
    params: ExtractPatternsInput,
  ): Promise<DerivedPattern[]> {
    const minChainSample = Math.max(Math.floor(params.minSampleCount / 2), 3);

    let sql = `
      SELECT
        se1.skill_id AS skill_1,
        se2.skill_id AS skill_2,
        COUNT(*) AS chain_count,
        SUM(CASE WHEN se1.status = 'completed' AND se2.status = 'completed' THEN 1 ELSE 0 END)
          * 1.0 / COUNT(*) AS chain_success_rate
      FROM skill_executions se1
        JOIN skill_executions se2 ON se1.biz_item_id = se2.biz_item_id
          AND se1.tenant_id = se2.tenant_id
          AND se2.executed_at > se1.executed_at
          AND julianday(se2.executed_at) - julianday(se1.executed_at) < 0.0208
          AND se1.skill_id != se2.skill_id
      WHERE se1.tenant_id = ?
    `;
    const bindings: unknown[] = [tenantId];

    if (params.pipelineStage) {
      sql += " AND se1.biz_item_id = ?";
      bindings.push(params.pipelineStage);
    }

    sql += `
      GROUP BY se1.skill_id, se2.skill_id
      HAVING chain_count >= ? AND chain_success_rate >= 0.65
    `;
    bindings.push(minChainSample);

    const rows = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<{
        skill_1: string;
        skill_2: string;
        chain_count: number;
        chain_success_rate: number;
      }>();

    const patterns: DerivedPattern[] = [];
    for (const r of rows.results ?? []) {
      const confidence = wilsonScoreLowerBound(r.chain_success_rate, r.chain_count);
      const id = generateId("dp");
      const expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();

      const stage = params.pipelineStage ?? "discovery";

      await this.db
        .prepare(
          `INSERT INTO derived_patterns
            (id, tenant_id, pipeline_stage, pattern_type, skill_ids,
             success_rate, sample_count, avg_cost_usd, avg_duration_ms, confidence, status, expires_at)
           VALUES (?, ?, ?, 'chain', ?, ?, ?, 0, 0, ?, 'active', ?)`,
        )
        .bind(
          id, tenantId, stage,
          JSON.stringify([r.skill_1, r.skill_2]),
          r.chain_success_rate, r.chain_count,
          confidence, expiresAt,
        )
        .run();

      patterns.push({
        id,
        tenantId,
        pipelineStage: stage as PipelineStage,
        discoveryStage: null,
        patternType: "chain",
        skillIds: [r.skill_1, r.skill_2],
        successRate: r.chain_success_rate,
        sampleCount: r.chain_count,
        avgCostUsd: 0,
        avgDurationMs: 0,
        confidence,
        status: "active",
        extractedAt: new Date().toISOString(),
        expiresAt,
      });
    }

    return patterns;
  }

  async getPatterns(
    tenantId: string,
    params: ListPatternsQuery,
  ): Promise<{ patterns: DerivedPattern[]; total: number }> {
    let countSql = "SELECT COUNT(*) as cnt FROM derived_patterns WHERE tenant_id = ?";
    let sql = "SELECT * FROM derived_patterns WHERE tenant_id = ?";
    const bindings: unknown[] = [tenantId];

    if (params.pipelineStage) {
      countSql += " AND pipeline_stage = ?";
      sql += " AND pipeline_stage = ?";
      bindings.push(params.pipelineStage);
    }
    if (params.status) {
      countSql += " AND status = ?";
      sql += " AND status = ?";
      bindings.push(params.status);
    }
    if (params.minConfidence !== undefined) {
      countSql += " AND confidence >= ?";
      sql += " AND confidence >= ?";
      bindings.push(params.minConfidence);
    }

    const countBindings = [...bindings];
    sql += " ORDER BY confidence DESC LIMIT ? OFFSET ?";
    bindings.push(params.limit, params.offset);

    const [countRow, rows] = await Promise.all([
      this.db.prepare(countSql).bind(...countBindings).first<{ cnt: number }>(),
      this.db.prepare(sql).bind(...bindings).all<PatternRow>(),
    ]);

    return {
      patterns: (rows.results ?? []).map(mapPatternRow),
      total: countRow?.cnt ?? 0,
    };
  }

  async getPatternById(tenantId: string, patternId: string): Promise<DerivedPattern | null> {
    const row = await this.db
      .prepare("SELECT * FROM derived_patterns WHERE tenant_id = ? AND id = ?")
      .bind(tenantId, patternId)
      .first<PatternRow>();

    return row ? mapPatternRow(row) : null;
  }

  async getPatternDetail(tenantId: string, patternId: string): Promise<DerivedPatternDetail | null> {
    const pattern = await this.getPatternById(tenantId, patternId);
    if (!pattern) return null;

    // Fetch related skills from skill_registry
    const skillRows = await this.db
      .prepare(
        `SELECT * FROM skill_registry WHERE tenant_id = ? AND skill_id IN (${pattern.skillIds.map(() => "?").join(",")}) AND deleted_at IS NULL`,
      )
      .bind(tenantId, ...pattern.skillIds)
      .all<Record<string, unknown>>();

    // Fetch sample executions
    const execRows = await this.db
      .prepare(
        `SELECT id, skill_id, version, model, status,
                input_tokens + output_tokens as total_tokens,
                cost_usd, duration_ms, executed_by, executed_at
         FROM skill_executions
         WHERE tenant_id = ? AND skill_id IN (${pattern.skillIds.map(() => "?").join(",")})
         ORDER BY executed_at DESC LIMIT 10`,
      )
      .bind(tenantId, ...pattern.skillIds)
      .all<{
        id: string; skill_id: string; version: number; model: string;
        status: string; total_tokens: number; cost_usd: number;
        duration_ms: number; executed_by: string; executed_at: string;
      }>();

    const sampleExecutions: SkillExecutionRecord[] = (execRows.results ?? []).map((r) => ({
      id: r.id,
      skillId: r.skill_id,
      version: r.version,
      model: r.model,
      status: r.status as SkillExecutionRecord["status"],
      totalTokens: r.total_tokens,
      costUsd: r.cost_usd,
      durationMs: r.duration_ms,
      executedBy: r.executed_by,
      executedAt: r.executed_at,
    }));

    return {
      ...pattern,
      skills: (skillRows.results ?? []) as unknown as SkillRegistryEntry[],
      sampleExecutions,
    };
  }

  async expireStale(): Promise<number> {
    const result = await this.db
      .prepare(
        `UPDATE derived_patterns SET status = 'expired'
         WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < datetime('now')`,
      )
      .run();
    return result.meta?.changes ?? 0;
  }
}

// ─── Helpers ───

interface PatternRow {
  id: string;
  tenant_id: string;
  pipeline_stage: string;
  discovery_stage: string | null;
  pattern_type: string;
  skill_ids: string;
  success_rate: number;
  sample_count: number;
  avg_cost_usd: number;
  avg_duration_ms: number;
  confidence: number;
  status: string;
  extracted_at: string;
  expires_at: string | null;
}

function mapPatternRow(r: PatternRow): DerivedPattern {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    pipelineStage: r.pipeline_stage as PipelineStage,
    discoveryStage: r.discovery_stage,
    patternType: r.pattern_type as DerivedPattern["patternType"],
    skillIds: parseJson<string[]>(r.skill_ids, []),
    successRate: r.success_rate,
    sampleCount: r.sample_count,
    avgCostUsd: r.avg_cost_usd,
    avgDurationMs: r.avg_duration_ms,
    confidence: r.confidence,
    status: r.status as DerivedPatternStatus,
    extractedAt: r.extracted_at,
    expiresAt: r.expires_at,
  };
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const VALID_STAGES = new Set([
  "collection", "discovery", "shaping", "validation", "productization", "gtm",
]);

function isValidPipelineStage(s: string): boolean {
  return VALID_STAGES.has(s);
}

export function wilsonScoreLowerBound(successRate: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = successRate;
  const denominator = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const adjust = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return Math.max(0, (centre - adjust) / denominator);
}

function generateId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${t}${r}`;
}
