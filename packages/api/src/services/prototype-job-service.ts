// ─── F353: Prototype Job Service (Sprint 159) ───

import { JOB_STATUSES } from "../schemas/prototype-job.js";

type JobStatus = (typeof JOB_STATUSES)[number];

const VALID_TRANSITIONS: Record<string, string[]> = {
  queued: ["building"],
  building: ["deploying", "failed"],
  deploying: ["live", "deploy_failed"],
  live: ["feedback_pending"],
  failed: ["queued", "dead_letter"],
  deploy_failed: ["queued", "dead_letter"],
  feedback_pending: ["building"],
};

const MAX_RETRY = 3;

interface JobRow {
  id: string;
  org_id: string;
  prd_content: string;
  prd_title: string;
  status: string;
  builder_type: string;
  pages_project: string | null;
  pages_url: string | null;
  build_log: string | null;
  error_message: string | null;
  cost_input_tokens: number;
  cost_output_tokens: number;
  cost_usd: number;
  model_used: string;
  fallback_used: number;
  retry_count: number;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  completed_at: number | null;
}

export interface PrototypeJobRecord {
  id: string;
  orgId: string;
  prdTitle: string;
  status: JobStatus;
  builderType: string;
  pagesUrl: string | null;
  costUsd: number;
  modelUsed: string;
  fallbackUsed: boolean;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface PrototypeJobDetail extends PrototypeJobRecord {
  prdContent: string;
  buildLog: string;
  errorMessage: string | null;
}

interface JobUpdates {
  buildLog?: string;
  pagesProject?: string;
  pagesUrl?: string;
  errorMessage?: string;
  costInputTokens?: number;
  costOutputTokens?: number;
  costUsd?: number;
  modelUsed?: string;
  fallbackUsed?: boolean;
}

function toRecord(row: JobRow): PrototypeJobRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    prdTitle: row.prd_title,
    status: row.status as JobStatus,
    builderType: row.builder_type,
    pagesUrl: row.pages_url,
    costUsd: row.cost_usd,
    modelUsed: row.model_used,
    fallbackUsed: row.fallback_used === 1,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function toDetail(row: JobRow): PrototypeJobDetail {
  return {
    ...toRecord(row),
    prdContent: row.prd_content,
    buildLog: row.build_log ?? "",
    errorMessage: row.error_message,
  };
}

export class PrototypeJobService {
  constructor(private db: D1Database) {}

  async create(orgId: string, prdContent: string, prdTitle: string): Promise<PrototypeJobRecord> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare(
        `INSERT INTO prototype_jobs (id, org_id, prd_content, prd_title, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'queued', ?, ?)`,
      )
      .bind(id, orgId, prdContent, prdTitle, now, now)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM prototype_jobs WHERE id = ?")
      .bind(id)
      .first<JobRow>();
    return toRecord(row!);
  }

  async list(
    orgId: string,
    opts: { status?: string; limit: number; offset: number },
  ): Promise<{ items: PrototypeJobRecord[]; total: number }> {
    const params: unknown[] = [orgId];
    let where = "WHERE org_id = ?";
    if (opts.status) {
      where += " AND status = ?";
      params.push(opts.status);
    }

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM prototype_jobs ${where}`)
      .bind(...params)
      .first<{ cnt: number }>();
    const total = countResult?.cnt ?? 0;

    const rows = await this.db
      .prepare(
        `SELECT * FROM prototype_jobs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, opts.limit, opts.offset)
      .all<JobRow>();

    return { items: (rows.results ?? []).map(toRecord), total };
  }

  async getById(id: string, orgId: string): Promise<PrototypeJobDetail | null> {
    const row = await this.db
      .prepare("SELECT * FROM prototype_jobs WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<JobRow>();
    return row ? toDetail(row) : null;
  }

  async transition(
    id: string,
    orgId: string,
    toStatus: string,
    updates?: JobUpdates,
  ): Promise<PrototypeJobRecord> {
    const row = await this.db
      .prepare("SELECT * FROM prototype_jobs WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<JobRow>();
    if (!row) throw new Error("Job not found");

    const allowed = VALID_TRANSITIONS[row.status];
    if (!allowed || !allowed.includes(toStatus)) {
      throw new Error(`Invalid transition: ${row.status} → ${toStatus}`);
    }

    // retry_count 기반 dead_letter 강제
    if (
      (row.status === "failed" || row.status === "deploy_failed") &&
      toStatus === "queued" &&
      row.retry_count >= MAX_RETRY
    ) {
      throw new Error(`Max retry exceeded (${MAX_RETRY}), use dead_letter`);
    }

    const now = Math.floor(Date.now() / 1000);
    const sets: string[] = ["status = ?", "updated_at = ?"];
    const params: unknown[] = [toStatus, now];

    if (toStatus === "building") {
      sets.push("started_at = ?");
      params.push(now);
    }
    if (toStatus === "live") {
      sets.push("completed_at = ?");
      params.push(now);
    }
    if (toStatus === "queued" && (row.status === "failed" || row.status === "deploy_failed")) {
      sets.push("retry_count = ?");
      params.push(row.retry_count + 1);
    }

    if (updates) {
      if (updates.buildLog !== undefined) { sets.push("build_log = ?"); params.push(updates.buildLog); }
      if (updates.pagesProject !== undefined) { sets.push("pages_project = ?"); params.push(updates.pagesProject); }
      if (updates.pagesUrl !== undefined) { sets.push("pages_url = ?"); params.push(updates.pagesUrl); }
      if (updates.errorMessage !== undefined) { sets.push("error_message = ?"); params.push(updates.errorMessage); }
      if (updates.costInputTokens !== undefined) { sets.push("cost_input_tokens = ?"); params.push(updates.costInputTokens); }
      if (updates.costOutputTokens !== undefined) { sets.push("cost_output_tokens = ?"); params.push(updates.costOutputTokens); }
      if (updates.costUsd !== undefined) { sets.push("cost_usd = ?"); params.push(updates.costUsd); }
      if (updates.modelUsed !== undefined) { sets.push("model_used = ?"); params.push(updates.modelUsed); }
      if (updates.fallbackUsed !== undefined) { sets.push("fallback_used = ?"); params.push(updates.fallbackUsed ? 1 : 0); }
    }

    params.push(id, orgId);
    await this.db
      .prepare(`UPDATE prototype_jobs SET ${sets.join(", ")} WHERE id = ? AND org_id = ?`)
      .bind(...params)
      .run();

    const updated = await this.db
      .prepare("SELECT * FROM prototype_jobs WHERE id = ?")
      .bind(id)
      .first<JobRow>();
    return toRecord(updated!);
  }

  async retry(id: string, orgId: string): Promise<PrototypeJobRecord> {
    const row = await this.db
      .prepare("SELECT * FROM prototype_jobs WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<JobRow>();
    if (!row) throw new Error("Job not found");

    if (row.status !== "failed" && row.status !== "deploy_failed") {
      throw new Error(`Cannot retry from status: ${row.status}`);
    }

    if (row.retry_count >= MAX_RETRY) {
      return this.transition(id, orgId, "dead_letter");
    }

    return this.transition(id, orgId, "queued");
  }
}
