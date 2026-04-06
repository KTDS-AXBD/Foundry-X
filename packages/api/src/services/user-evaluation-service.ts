// ─── F391: User Evaluation Service (Sprint 178) ───

import type { CreateUserEvaluationInput } from "../schemas/user-evaluation-schema.js";

export interface UserEvaluationRecord {
  id: string;
  jobId: string;
  orgId: string;
  evaluatorRole: string;
  buildScore: number;
  uiScore: number;
  functionalScore: number;
  prdScore: number;
  codeScore: number;
  overallScore: number;
  comment: string | null;
  createdAt: string;
}

interface EvalRow {
  id: string;
  job_id: string;
  org_id: string;
  evaluator_role: string;
  build_score: number;
  ui_score: number;
  functional_score: number;
  prd_score: number;
  code_score: number;
  overall_score: number;
  comment: string | null;
  created_at: string;
}

function toRecord(row: EvalRow): UserEvaluationRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    orgId: row.org_id,
    evaluatorRole: row.evaluator_role,
    buildScore: row.build_score,
    uiScore: row.ui_score,
    functionalScore: row.functional_score,
    prdScore: row.prd_score,
    codeScore: row.code_score,
    overallScore: row.overall_score,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export class UserEvaluationService {
  constructor(private db: D1Database) {}

  async create(orgId: string, input: CreateUserEvaluationInput): Promise<UserEvaluationRecord> {
    const id = crypto.randomUUID().replace(/-/g, "");
    await this.db
      .prepare(
        `INSERT INTO user_evaluations
         (id, job_id, org_id, evaluator_role, build_score, ui_score, functional_score, prd_score, code_score, overall_score, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.jobId,
        orgId,
        input.evaluatorRole,
        input.buildScore,
        input.uiScore,
        input.functionalScore,
        input.prdScore,
        input.codeScore,
        input.overallScore,
        input.comment ?? null,
      )
      .run();

    const row = await this.db
      .prepare("SELECT * FROM user_evaluations WHERE id = ?")
      .bind(id)
      .first<EvalRow>();
    if (!row) throw new Error("Insert failed");
    return toRecord(row);
  }

  async listByJob(orgId: string, jobId: string): Promise<UserEvaluationRecord[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM user_evaluations WHERE org_id = ? AND job_id = ? ORDER BY created_at DESC",
      )
      .bind(orgId, jobId)
      .all<EvalRow>();
    return (results ?? []).map(toRecord);
  }

  async listAll(orgId: string): Promise<UserEvaluationRecord[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM user_evaluations WHERE org_id = ? ORDER BY created_at DESC",
      )
      .bind(orgId)
      .all<EvalRow>();
    return (results ?? []).map(toRecord);
  }
}
