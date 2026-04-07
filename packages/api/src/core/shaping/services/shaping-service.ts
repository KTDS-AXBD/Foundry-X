/**
 * F287: ShapingService — 형상화 실행 이력 CRUD + 조인
 */

import type { CreateShapingRunInput, UpdateShapingRunInput, ListShapingRunsQuery, CreatePhaseLogInput, CreateExpertReviewInput, CreateSixHatsInput } from "../schemas/shaping.js";

interface ShapingRunRow {
  id: string;
  tenant_id: string;
  discovery_prd_id: string;
  status: string;
  mode: string;
  current_phase: string;
  total_iterations: number;
  max_iterations: number;
  quality_score: number | null;
  token_cost: number;
  token_limit: number;
  git_path: string | null;
  created_at: string;
  completed_at: string | null;
}

function mapRun(row: ShapingRunRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    discoveryPrdId: row.discovery_prd_id,
    status: row.status,
    mode: row.mode,
    currentPhase: row.current_phase,
    totalIterations: row.total_iterations,
    maxIterations: row.max_iterations,
    qualityScore: row.quality_score,
    tokenCost: row.token_cost,
    tokenLimit: row.token_limit,
    gitPath: row.git_path,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapPhaseLog(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    phase: row.phase as string,
    round: row.round as number,
    inputSnapshot: row.input_snapshot as string | null,
    outputSnapshot: row.output_snapshot as string | null,
    verdict: row.verdict as string | null,
    qualityScore: row.quality_score as number | null,
    findings: row.findings as string | null,
    durationMs: row.duration_ms as number | null,
    createdAt: row.created_at as string,
  };
}

function mapExpertReview(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    expertRole: row.expert_role as string,
    reviewBody: row.review_body as string,
    findings: row.findings as string | null,
    qualityScore: row.quality_score as number | null,
    createdAt: row.created_at as string,
  };
}

function mapSixHats(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    hatColor: row.hat_color as string,
    round: row.round as number,
    opinion: row.opinion as string,
    verdict: row.verdict as string | null,
    createdAt: row.created_at as string,
  };
}

export class ShapingService {
  constructor(private db: D1Database) {}

  // ── shaping_runs CRUD ──

  async createRun(tenantId: string, params: CreateShapingRunInput) {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO shaping_runs (id, tenant_id, discovery_prd_id, mode, max_iterations, token_limit, git_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, tenantId, params.discoveryPrdId, params.mode, params.maxIterations, params.tokenLimit, params.gitPath ?? null)
      .run();

    return this.getRun(tenantId, id);
  }

  async listRuns(tenantId: string, query: ListShapingRunsQuery) {
    const conditions = ["tenant_id = ?"];
    const binds: unknown[] = [tenantId];

    if (query.status) {
      conditions.push("status = ?");
      binds.push(query.status);
    }
    if (query.mode) {
      conditions.push("mode = ?");
      binds.push(query.mode);
    }

    const where = conditions.join(" AND ");

    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM shaping_runs WHERE ${where}`)
      .bind(...binds)
      .first<{ cnt: number }>();
    const total = countRow?.cnt ?? 0;

    const rows = await this.db
      .prepare(
        `SELECT * FROM shaping_runs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...binds, query.limit, query.offset)
      .all<ShapingRunRow>();

    return { items: (rows.results ?? []).map(mapRun), total };
  }

  async getRun(tenantId: string, runId: string) {
    const row = await this.db
      .prepare("SELECT * FROM shaping_runs WHERE id = ? AND tenant_id = ?")
      .bind(runId, tenantId)
      .first<ShapingRunRow>();
    return row ? mapRun(row) : null;
  }

  async getRunDetail(tenantId: string, runId: string) {
    const run = await this.getRun(tenantId, runId);
    if (!run) return null;

    const [logs, reviews, hats] = await Promise.all([
      this.listPhaseLogs(runId),
      this.listExpertReviews(runId),
      this.listSixHats(runId),
    ]);

    return { ...run, phaseLogs: logs, expertReviews: reviews, sixHats: hats };
  }

  async updateRun(tenantId: string, runId: string, params: UpdateShapingRunInput) {
    const existing = await this.getRun(tenantId, runId);
    if (!existing) return null;

    const sets: string[] = [];
    const binds: unknown[] = [];

    if (params.status !== undefined) {
      sets.push("status = ?");
      binds.push(params.status);
      if (params.status === "completed" || params.status === "failed") {
        sets.push("completed_at = datetime('now')");
      }
    }
    if (params.currentPhase !== undefined) {
      sets.push("current_phase = ?");
      binds.push(params.currentPhase);
    }
    if (params.qualityScore !== undefined) {
      sets.push("quality_score = ?");
      binds.push(params.qualityScore);
    }
    if (params.tokenCost !== undefined) {
      sets.push("token_cost = ?");
      binds.push(params.tokenCost);
    }
    if (params.gitPath !== undefined) {
      sets.push("git_path = ?");
      binds.push(params.gitPath);
    }

    if (sets.length === 0) return existing;

    await this.db
      .prepare(`UPDATE shaping_runs SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`)
      .bind(...binds, runId, tenantId)
      .run();

    return this.getRun(tenantId, runId);
  }

  // ── shaping_phase_logs ──

  async addPhaseLog(runId: string, params: CreatePhaseLogInput) {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO shaping_phase_logs (id, run_id, phase, round, input_snapshot, output_snapshot, verdict, quality_score, findings, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id, runId, params.phase, params.round,
        params.inputSnapshot ?? null, params.outputSnapshot ?? null,
        params.verdict ?? null, params.qualityScore ?? null,
        params.findings ?? null, params.durationMs ?? null,
      )
      .run();

    const row = await this.db.prepare("SELECT * FROM shaping_phase_logs WHERE id = ?").bind(id).first();
    return mapPhaseLog(row as Record<string, unknown>);
  }

  async listPhaseLogs(runId: string) {
    const rows = await this.db
      .prepare("SELECT * FROM shaping_phase_logs WHERE run_id = ? ORDER BY created_at ASC")
      .bind(runId)
      .all();
    return (rows.results ?? []).map((r) => mapPhaseLog(r as Record<string, unknown>));
  }

  // ── shaping_expert_reviews ──

  async addExpertReview(runId: string, params: CreateExpertReviewInput) {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO shaping_expert_reviews (id, run_id, expert_role, review_body, findings, quality_score)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, runId, params.expertRole, params.reviewBody, params.findings ?? null, params.qualityScore ?? null)
      .run();

    const row = await this.db.prepare("SELECT * FROM shaping_expert_reviews WHERE id = ?").bind(id).first();
    return mapExpertReview(row as Record<string, unknown>);
  }

  async listExpertReviews(runId: string) {
    const rows = await this.db
      .prepare("SELECT * FROM shaping_expert_reviews WHERE run_id = ? ORDER BY created_at ASC")
      .bind(runId)
      .all();
    return (rows.results ?? []).map((r) => mapExpertReview(r as Record<string, unknown>));
  }

  // ── shaping_six_hats ──

  async addSixHats(runId: string, params: CreateSixHatsInput) {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO shaping_six_hats (id, run_id, hat_color, round, opinion, verdict)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, runId, params.hatColor, params.round, params.opinion, params.verdict ?? null)
      .run();

    const row = await this.db.prepare("SELECT * FROM shaping_six_hats WHERE id = ?").bind(id).first();
    return mapSixHats(row as Record<string, unknown>);
  }

  async listSixHats(runId: string) {
    const rows = await this.db
      .prepare("SELECT * FROM shaping_six_hats WHERE run_id = ? ORDER BY round ASC, created_at ASC")
      .bind(runId)
      .all();
    return (rows.results ?? []).map((r) => mapSixHats(r as Record<string, unknown>));
  }
}
