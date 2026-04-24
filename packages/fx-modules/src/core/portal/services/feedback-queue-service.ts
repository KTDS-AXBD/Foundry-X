export class FeedbackQueueService {
  constructor(private db: D1Database) {}

  async enqueue(orgId: string, issue: {
    number: number;
    url: string;
    title: string;
    body: string | null;
    labels: string[];
    screenshotUrl?: string;
  }): Promise<{ id: string; created: boolean }> {
    const id = crypto.randomUUID();
    const result = await this.db.prepare(
      `INSERT OR IGNORE INTO feedback_queue
       (id, org_id, github_issue_number, github_issue_url, title, body, labels, screenshot_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, orgId, issue.number, issue.url, issue.title, issue.body,
           JSON.stringify(issue.labels), issue.screenshotUrl ?? null).run();
    return { id, created: (result.meta?.changes ?? 0) > 0 };
  }

  async consume(): Promise<Record<string, unknown> | null> {
    const item = await this.db.prepare(
      `UPDATE feedback_queue SET status = 'processing', updated_at = datetime('now')
       WHERE id = (SELECT id FROM feedback_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1)
       RETURNING *`
    ).first();
    return item ?? null;
  }

  async complete(id: string, prUrl: string): Promise<void> {
    await this.db.prepare(
      `UPDATE feedback_queue SET status = 'done', agent_pr_url = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(prUrl, id).run();
  }

  async fail(id: string, error: string): Promise<void> {
    await this.db.prepare(
      `UPDATE feedback_queue SET status = 'failed', error_message = ?,
       retry_count = retry_count + 1, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(error, id).run();
  }

  async skip(id: string, reason: string): Promise<void> {
    await this.db.prepare(
      `UPDATE feedback_queue SET status = 'skipped', error_message = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(reason, id).run();
  }

  async list(params: { status?: string; limit?: number; offset?: number }) {
    const { status, limit = 20, offset = 0 } = params;
    const where = status ? "WHERE status = ?" : "";
    const countBinds = status ? [status] : [];

    const countResult = await this.db.prepare(
      `SELECT COUNT(*) as total FROM feedback_queue ${where}`
    ).bind(...countBinds).first<{ total: number }>();

    const queryBinds = status ? [status, limit, offset] : [limit, offset];
    const items = await this.db.prepare(
      `SELECT * FROM feedback_queue ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...queryBinds).all();

    return { items: items.results ?? [], total: countResult?.total ?? 0 };
  }

  async getById(id: string) {
    return this.db.prepare("SELECT * FROM feedback_queue WHERE id = ?").bind(id).first();
  }

  async update(id: string, data: {
    status?: string;
    agentPrUrl?: string;
    agentLog?: string;
    errorMessage?: string;
  }): Promise<Record<string, unknown> | null> {
    const sets: string[] = [];
    const binds: unknown[] = [];

    if (data.status) { sets.push("status = ?"); binds.push(data.status); }
    if (data.status === "failed") { sets.push("retry_count = retry_count + 1"); }
    if (data.agentPrUrl !== undefined) { sets.push("agent_pr_url = ?"); binds.push(data.agentPrUrl); }
    if (data.agentLog !== undefined) { sets.push("agent_log = ?"); binds.push(data.agentLog); }
    if (data.errorMessage !== undefined) { sets.push("error_message = ?"); binds.push(data.errorMessage); }

    if (sets.length === 0) return this.getById(id);

    sets.push("updated_at = datetime('now')");
    binds.push(id);

    return this.db.prepare(
      `UPDATE feedback_queue SET ${sets.join(", ")} WHERE id = ? RETURNING *`
    ).bind(...binds).first();
  }
}
