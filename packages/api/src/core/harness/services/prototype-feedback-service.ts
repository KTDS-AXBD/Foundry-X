// ─── F356: Prototype Feedback Service (Sprint 160) ───

import type { FeedbackCategory, PrototypeFeedback } from "@foundry-x/shared";

interface FeedbackRow {
  id: string;
  job_id: string;
  org_id: string;
  author_id: string | null;
  category: string;
  content: string;
  status: string;
  created_at: number;
}

function toFeedback(row: FeedbackRow): PrototypeFeedback {
  return {
    id: row.id,
    jobId: row.job_id,
    orgId: row.org_id,
    authorId: row.author_id,
    category: row.category as FeedbackCategory,
    content: row.content,
    status: row.status as PrototypeFeedback["status"],
    createdAt: row.created_at,
  };
}

export class PrototypeFeedbackService {
  constructor(private db: D1Database) {}

  async create(
    orgId: string,
    jobId: string,
    input: {
      authorId?: string;
      category: FeedbackCategory;
      content: string;
    },
  ): Promise<PrototypeFeedback> {
    // Verify job exists and belongs to org
    const job = await this.db
      .prepare("SELECT id, status FROM prototype_jobs WHERE id = ? AND org_id = ?")
      .bind(jobId, orgId)
      .first<{ id: string; status: string }>();

    if (!job) throw new Error("Job not found");

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO prototype_feedback (id, job_id, org_id, author_id, category, content, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(id, jobId, orgId, input.authorId ?? null, input.category, input.content, now)
      .run();

    // job이 live 상태면 feedback_pending으로 전환
    if (job.status === "live") {
      await this.db
        .prepare(
          "UPDATE prototype_jobs SET status = 'feedback_pending', feedback_content = ?, updated_at = ? WHERE id = ?",
        )
        .bind(input.content, now, jobId)
        .run();
    }

    const row = await this.db
      .prepare("SELECT * FROM prototype_feedback WHERE id = ?")
      .bind(id)
      .first<FeedbackRow>();
    return toFeedback(row!);
  }

  async listByJob(orgId: string, jobId: string): Promise<PrototypeFeedback[]> {
    const rows = await this.db
      .prepare(
        "SELECT * FROM prototype_feedback WHERE job_id = ? AND org_id = ? ORDER BY created_at DESC",
      )
      .bind(jobId, orgId)
      .all<FeedbackRow>();
    return (rows.results ?? []).map(toFeedback);
  }

  async updateStatus(
    id: string,
    orgId: string,
    status: "applied" | "dismissed",
  ): Promise<PrototypeFeedback | null> {
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare(
        "UPDATE prototype_feedback SET status = ? WHERE id = ? AND org_id = ?",
      )
      .bind(status, id, orgId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM prototype_feedback WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<FeedbackRow>();
    return row ? toFeedback(row) : null;
  }
}
