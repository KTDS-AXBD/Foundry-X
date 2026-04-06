// ─── F387: Prototype Quality Service (Sprint 176) ───

import type { InsertQualityInput } from "../schemas/prototype-quality-schema.js";

interface QualityRow {
  id: string;
  job_id: string;
  round: number;
  total_score: number;
  build_score: number;
  ui_score: number;
  functional_score: number;
  prd_score: number;
  code_score: number;
  generation_mode: string;
  cost_usd: number;
  feedback: string | null;
  details: string | null;
  created_at: string;
}

export interface QualityRecord {
  id: string;
  jobId: string;
  round: number;
  totalScore: number;
  dimensions: {
    build: number;
    ui: number;
    functional: number;
    prd: number;
    code: number;
  };
  generationMode: string;
  costUsd: number;
  feedback: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface QualityStats {
  totalPrototypes: number;
  averageScore: number;
  above80Count: number;
  totalCostSaved: number;
  generationModes: Record<string, number>;
}

function toRecord(row: QualityRow): QualityRecord {
  let details: Record<string, unknown> | null = null;
  if (row.details) {
    try {
      details = JSON.parse(row.details) as Record<string, unknown>;
    } catch {
      details = null;
    }
  }
  return {
    id: row.id,
    jobId: row.job_id,
    round: row.round,
    totalScore: row.total_score,
    dimensions: {
      build: row.build_score,
      ui: row.ui_score,
      functional: row.functional_score,
      prd: row.prd_score,
      code: row.code_score,
    },
    generationMode: row.generation_mode,
    costUsd: row.cost_usd,
    feedback: row.feedback,
    details,
    createdAt: row.created_at,
  };
}

export class PrototypeQualityService {
  constructor(private db: D1Database) {}

  async insert(input: InsertQualityInput): Promise<QualityRecord> {
    const id = crypto.randomUUID().replace(/-/g, "");
    await this.db
      .prepare(
        `INSERT INTO prototype_quality
         (id, job_id, round, total_score, build_score, ui_score, functional_score, prd_score, code_score, generation_mode, cost_usd, feedback, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.jobId,
        input.round,
        input.totalScore,
        input.buildScore,
        input.uiScore,
        input.functionalScore,
        input.prdScore,
        input.codeScore,
        input.generationMode,
        input.costUsd,
        input.feedback ?? null,
        input.details ?? null,
      )
      .run();

    const row = await this.db
      .prepare("SELECT * FROM prototype_quality WHERE id = ?")
      .bind(id)
      .first<QualityRow>();
    if (!row) throw new Error("Insert failed");
    return toRecord(row);
  }

  async listByJob(jobId: string): Promise<QualityRecord[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM prototype_quality WHERE job_id = ? ORDER BY round ASC",
      )
      .bind(jobId)
      .all<QualityRow>();
    return (results ?? []).map(toRecord);
  }

  async getStats(): Promise<QualityStats> {
    // 가장 최근 라운드의 점수만 집계 (각 job별 최고 round)
    const scoreRow = await this.db
      .prepare(
        `SELECT
           COUNT(DISTINCT job_id) AS total,
           AVG(total_score) AS avg_score,
           SUM(CASE WHEN total_score >= 80 THEN 1 ELSE 0 END) AS above_80
         FROM prototype_quality pq
         WHERE pq.round = (
           SELECT MAX(pq2.round) FROM prototype_quality pq2 WHERE pq2.job_id = pq.job_id
         )`,
      )
      .first<{ total: number; avg_score: number; above_80: number }>();

    // 비용 절감: CLI 모드 사용 시 API 비용 0 → 절감액은 API 모드의 평균 비용으로 추정
    const costRow = await this.db
      .prepare(
        `SELECT
           SUM(CASE WHEN generation_mode IN ('cli', 'max-cli') THEN 1 ELSE 0 END) AS cli_count,
           SUM(CASE WHEN generation_mode = 'api' THEN 1 ELSE 0 END) AS api_count,
           SUM(CASE WHEN generation_mode = 'api' THEN cost_usd ELSE 0 END) AS total_api_cost
         FROM prototype_quality`,
      )
      .first<{ cli_count: number; api_count: number; total_api_cost: number }>();

    const avgApiCost =
      costRow && costRow.api_count > 0
        ? costRow.total_api_cost / costRow.api_count
        : 0.48; // 기본 추정: $0.48/call

    return {
      totalPrototypes: scoreRow?.total ?? 0,
      averageScore: Math.round((scoreRow?.avg_score ?? 0) * 10) / 10,
      above80Count: scoreRow?.above_80 ?? 0,
      totalCostSaved: Math.round((costRow?.cli_count ?? 0) * avgApiCost * 100) / 100,
      generationModes: {
        cli: (costRow?.cli_count ?? 0),
        api: (costRow?.api_count ?? 0),
      },
    };
  }
}
