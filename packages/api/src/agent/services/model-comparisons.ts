// ─── F542 M3: ModelComparisonService — A/B 모델 비교 결과 D1 CRUD (Sprint 290) ───

import { randomUUID } from "node:crypto";
import type { D1Database } from "@cloudflare/workers-types";
import type { ModelComparison } from "@foundry-x/shared";

interface ComparisonRow {
  id: string;
  session_id: string;
  report_id: string;
  model: string;
  prompt_version: string;
  proposals_json: string;
  proposal_count: number;
  created_at: string;
}

function toComparison(row: ComparisonRow): ModelComparison {
  return {
    id: row.id,
    sessionId: row.session_id,
    reportId: row.report_id,
    model: row.model,
    promptVersion: row.prompt_version,
    proposalsJson: row.proposals_json,
    proposalCount: row.proposal_count,
    createdAt: row.created_at,
  };
}

/** A/B 모델 비교 결과 저장소. agent_model_comparisons 테이블 CRUD */
export class ModelComparisonService {
  constructor(private readonly db: D1Database) {}

  async save(
    data: Omit<ModelComparison, "id" | "createdAt">,
  ): Promise<ModelComparison> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO agent_model_comparisons
         (id, session_id, report_id, model, prompt_version, proposals_json, proposal_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        data.sessionId,
        data.reportId,
        data.model,
        data.promptVersion,
        data.proposalsJson,
        data.proposalCount,
        now,
      )
      .run();

    return {
      id,
      ...data,
      createdAt: now,
    };
  }

  async findByReportId(reportId: string): Promise<ModelComparison[]> {
    const result = await this.db
      .prepare(
        "SELECT * FROM agent_model_comparisons WHERE report_id = ? ORDER BY created_at ASC",
      )
      .bind(reportId)
      .all<ComparisonRow>();

    return (result.results ?? []).map(toComparison);
  }
}
