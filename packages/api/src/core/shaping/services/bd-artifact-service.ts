/**
 * F261: BD 산출물 CRUD + 버전 관리 서비스
 */

import type { BdArtifact, ArtifactListQuery } from "@foundry-x/shared";

interface ArtifactRow {
  id: string;
  org_id: string;
  biz_item_id: string;
  skill_id: string;
  stage_id: string;
  version: number;
  input_text: string;
  output_text: string | null;
  model: string;
  tokens_used: number;
  duration_ms: number;
  status: string;
  created_by: string;
  created_at: string;
}

function rowToArtifact(row: ArtifactRow): BdArtifact {
  return {
    id: row.id,
    orgId: row.org_id,
    bizItemId: row.biz_item_id,
    skillId: row.skill_id,
    stageId: row.stage_id,
    version: row.version,
    inputText: row.input_text,
    outputText: row.output_text,
    model: row.model,
    tokensUsed: row.tokens_used,
    durationMs: row.duration_ms,
    status: row.status as BdArtifact["status"],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class BdArtifactService {
  constructor(private db: D1Database) {}

  async create(input: {
    id: string;
    orgId: string;
    bizItemId: string;
    skillId: string;
    stageId: string;
    version: number;
    inputText: string;
    model: string;
    createdBy: string;
  }): Promise<BdArtifact> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, model, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      )
      .bind(
        input.id,
        input.orgId,
        input.bizItemId,
        input.skillId,
        input.stageId,
        input.version,
        input.inputText,
        input.model,
        input.createdBy,
        now,
      )
      .run();

    return {
      ...input,
      outputText: null,
      tokensUsed: 0,
      durationMs: 0,
      status: "pending",
      createdAt: now,
    };
  }

  async getById(orgId: string, id: string): Promise<BdArtifact | null> {
    const row = await this.db
      .prepare("SELECT * FROM bd_artifacts WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<ArtifactRow>();
    return row ? rowToArtifact(row) : null;
  }

  async list(orgId: string, query: ArtifactListQuery): Promise<{ items: BdArtifact[]; total: number }> {
    const conditions = ["org_id = ?"];
    const params: unknown[] = [orgId];

    if (query.bizItemId) {
      conditions.push("biz_item_id = ?");
      params.push(query.bizItemId);
    }
    if (query.stageId) {
      conditions.push("stage_id = ?");
      params.push(query.stageId);
    }
    if (query.skillId) {
      conditions.push("skill_id = ?");
      params.push(query.skillId);
    }
    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }

    const where = conditions.join(" AND ");
    const offset = ((query.page ?? 1) - 1) * (query.limit ?? 20);

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM bd_artifacts WHERE ${where}`)
      .bind(...params)
      .first<{ cnt: number }>();
    const total = countResult?.cnt ?? 0;

    const { results } = await this.db
      .prepare(
        `SELECT * FROM bd_artifacts WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, query.limit ?? 20, offset)
      .all<ArtifactRow>();

    return {
      items: (results ?? []).map(rowToArtifact),
      total,
    };
  }

  async getVersionHistory(orgId: string, bizItemId: string, skillId: string): Promise<BdArtifact[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM bd_artifacts WHERE org_id = ? AND biz_item_id = ? AND skill_id = ? ORDER BY version DESC`,
      )
      .bind(orgId, bizItemId, skillId)
      .all<ArtifactRow>();
    return (results ?? []).map(rowToArtifact);
  }

  async getNextVersion(bizItemId: string, skillId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT MAX(version) as max_ver FROM bd_artifacts WHERE biz_item_id = ? AND skill_id = ?",
      )
      .bind(bizItemId, skillId)
      .first<{ max_ver: number | null }>();
    return (row?.max_ver ?? 0) + 1;
  }

  async updateStatus(
    id: string,
    status: string,
    output?: { outputText?: string; tokensUsed?: number; durationMs?: number },
  ): Promise<void> {
    if (output) {
      await this.db
        .prepare(
          "UPDATE bd_artifacts SET status = ?, output_text = ?, tokens_used = ?, duration_ms = ? WHERE id = ?",
        )
        .bind(
          status,
          output.outputText ?? null,
          output.tokensUsed ?? 0,
          output.durationMs ?? 0,
          id,
        )
        .run();
    } else {
      await this.db
        .prepare("UPDATE bd_artifacts SET status = ? WHERE id = ?")
        .bind(status, id)
        .run();
    }
  }
}
