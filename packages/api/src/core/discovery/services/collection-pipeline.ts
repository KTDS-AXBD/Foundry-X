/**
 * Sprint 57 F179: CollectionPipelineService — 수집 오케스트레이터
 * 3채널(Agent/Field/Idea Portal) 수집을 통합하는 파이프라인 서비스
 */

export interface CollectionCandidate {
  title: string;
  description: string;
  source: "agent" | "idea_portal";
  sourceUrl?: string;
  keywords?: string[];
}

export interface CollectionResult {
  jobId: string;
  channel: "agent" | "idea_portal";
  itemsFound: number;
  itemsNew: number;
  itemsDuplicate: number;
  items: Array<{ id: string; title: string; status: string }>;
}

export interface CollectionStats {
  total: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
  recentJobs: Array<{
    id: string;
    channel: string;
    status: string;
    itemsFound: number;
    itemsNew: number;
    startedAt: string;
  }>;
  approvalRate: number;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class CollectionPipelineService {
  constructor(private db: D1Database) {}

  async ingest(
    orgId: string,
    userId: string,
    candidates: CollectionCandidate[],
    jobId: string,
  ): Promise<CollectionResult> {
    const channel = candidates[0]?.source ?? "agent";
    const items: Array<{ id: string; title: string; status: string }> = [];
    let itemsDuplicate = 0;

    for (const candidate of candidates) {
      const dup = await this.checkDuplicate(orgId, candidate.title);
      if (dup.isDuplicate) {
        itemsDuplicate++;
        continue;
      }

      const id = generateId();
      const now = new Date().toISOString();

      await this.db
        .prepare(
          `INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'pending_review', ?, ?, ?)`,
        )
        .bind(id, orgId, candidate.title, candidate.description || null, candidate.source, userId, now, now)
        .run();

      items.push({ id, title: candidate.title, status: "pending_review" });
    }

    await this.completeJob(jobId, {
      itemsFound: candidates.length,
      itemsNew: items.length,
      itemsDuplicate,
    });

    return {
      jobId,
      channel,
      itemsFound: candidates.length,
      itemsNew: items.length,
      itemsDuplicate,
      items,
    };
  }

  async checkDuplicate(orgId: string, title: string): Promise<{
    isDuplicate: boolean;
    matchedItemId?: string;
  }> {
    const row = await this.db
      .prepare(
        `SELECT id FROM biz_items WHERE org_id = ? AND title = ? LIMIT 1`,
      )
      .bind(orgId, title)
      .first<{ id: string }>();

    return row
      ? { isDuplicate: true, matchedItemId: row.id }
      : { isDuplicate: false };
  }

  async createJob(
    orgId: string,
    userId: string,
    channel: string,
    keywords?: string[],
  ): Promise<string> {
    const id = generateId();

    await this.db
      .prepare(
        `INSERT INTO collection_jobs (id, org_id, channel, status, keywords, created_by)
         VALUES (?, ?, ?, 'running', ?, ?)`,
      )
      .bind(id, orgId, channel, keywords ? JSON.stringify(keywords) : null, userId)
      .run();

    return id;
  }

  async completeJob(
    jobId: string,
    result: { itemsFound: number; itemsNew: number; itemsDuplicate: number },
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE collection_jobs
         SET status = 'completed', items_found = ?, items_new = ?, items_duplicate = ?, completed_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(result.itemsFound, result.itemsNew, result.itemsDuplicate, jobId)
      .run();
  }

  async failJob(jobId: string, error: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE collection_jobs
         SET status = 'failed', error_message = ?, completed_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(error, jobId)
      .run();
  }

  async listJobs(
    orgId: string,
    filters?: { channel?: string; limit?: number },
  ): Promise<Array<{
    id: string;
    channel: string;
    status: string;
    keywords: string[];
    itemsFound: number;
    itemsNew: number;
    itemsDuplicate: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
  }>> {
    const limit = filters?.limit ?? 20;
    let sql = `SELECT * FROM collection_jobs WHERE org_id = ?`;
    const binds: unknown[] = [orgId];

    if (filters?.channel) {
      sql += ` AND channel = ?`;
      binds.push(filters.channel);
    }

    sql += ` ORDER BY started_at DESC LIMIT ?`;
    binds.push(limit);

    const stmt = this.db.prepare(sql);
    const { results } = await stmt.bind(...binds).all<{
      id: string;
      channel: string;
      status: string;
      keywords: string | null;
      items_found: number;
      items_new: number;
      items_duplicate: number;
      error_message: string | null;
      started_at: string;
      completed_at: string | null;
    }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      channel: r.channel,
      status: r.status,
      keywords: r.keywords ? JSON.parse(r.keywords) : [],
      itemsFound: r.items_found,
      itemsNew: r.items_new,
      itemsDuplicate: r.items_duplicate,
      errorMessage: r.error_message,
      startedAt: r.started_at,
      completedAt: r.completed_at,
    }));
  }

  async getStats(orgId: string): Promise<CollectionStats> {
    const totalRow = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM biz_items WHERE org_id = ?`)
      .bind(orgId)
      .first<{ cnt: number }>();

    const channelRows = await this.db
      .prepare(`SELECT source, COUNT(*) as cnt FROM biz_items WHERE org_id = ? GROUP BY source`)
      .bind(orgId)
      .all<{ source: string; cnt: number }>();

    const statusRows = await this.db
      .prepare(`SELECT status, COUNT(*) as cnt FROM biz_items WHERE org_id = ? GROUP BY status`)
      .bind(orgId)
      .all<{ status: string; cnt: number }>();

    const recentJobRows = await this.db
      .prepare(
        `SELECT id, channel, status, items_found, items_new, started_at
         FROM collection_jobs WHERE org_id = ? ORDER BY started_at DESC LIMIT 5`,
      )
      .bind(orgId)
      .all<{
        id: string;
        channel: string;
        status: string;
        items_found: number;
        items_new: number;
        started_at: string;
      }>();

    const byChannel: Record<string, number> = {};
    for (const r of channelRows.results ?? []) {
      byChannel[r.source] = r.cnt;
    }

    const byStatus: Record<string, number> = {};
    for (const r of statusRows.results ?? []) {
      byStatus[r.status] = r.cnt;
    }

    const approved = byStatus["draft"] ?? 0;
    const rejected = byStatus["rejected"] ?? 0;
    const approvalRate =
      approved + rejected > 0 ? approved / (approved + rejected) : 0;

    return {
      total: totalRow?.cnt ?? 0,
      byChannel,
      byStatus,
      recentJobs: (recentJobRows.results ?? []).map((r) => ({
        id: r.id,
        channel: r.channel,
        status: r.status,
        itemsFound: r.items_found,
        itemsNew: r.items_new,
        startedAt: r.started_at,
      })),
      approvalRate,
    };
  }

  async getScreeningQueue(orgId: string): Promise<Array<{
    id: string;
    title: string;
    description: string | null;
    source: string;
    createdAt: string;
  }>> {
    const { results } = await this.db
      .prepare(
        `SELECT id, title, description, source, created_at
         FROM biz_items WHERE org_id = ? AND status = 'pending_review'
         ORDER BY created_at DESC`,
      )
      .bind(orgId)
      .all<{
        id: string;
        title: string;
        description: string | null;
        source: string;
        created_at: string;
      }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      source: r.source,
      createdAt: r.created_at,
    }));
  }

  async approveItem(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE biz_items SET status = 'draft', updated_at = ? WHERE id = ? AND status = 'pending_review'`,
      )
      .bind(now, id)
      .run();
  }

  async rejectItem(id: string, _reason?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE biz_items SET status = 'rejected', updated_at = ? WHERE id = ? AND status = 'pending_review'`,
      )
      .bind(now, id)
      .run();
  }
}
