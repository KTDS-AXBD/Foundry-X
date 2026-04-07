// ─── DB Row 타입 ───
interface IdeaRow {
  id: string;
  title: string;
  description: string | null;
  tags: string | null; // JSON array
  git_ref: string;
  author_id: string;
  org_id: string;
  sync_status: string;
  is_deleted: number;
  created_at: number;
  updated_at: number;
}

// ─── API 타입 ───
export interface Idea {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  createdAt: number;
  updatedAt: number;
}

function toIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: row.tags ? JSON.parse(row.tags) : [],
    gitRef: row.git_ref,
    authorId: row.author_id,
    orgId: row.org_id,
    syncStatus: row.sync_status as Idea["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class IdeaService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, data: { title: string; description?: string; tags?: string[] }): Promise<Idea> {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO ax_ideas (id, title, description, tags, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, 'pending', 0, ?, ?)`
      )
      .bind(id, data.title, data.description ?? null, data.tags ? JSON.stringify(data.tags) : null, userId, orgId, now, now)
      .run();

    return this.getById(orgId, id) as Promise<Idea>;
  }

  async getById(orgId: string, id: string): Promise<Idea | null> {
    const row = await this.db
      .prepare("SELECT * FROM ax_ideas WHERE id = ? AND org_id = ? AND is_deleted = 0")
      .bind(id, orgId)
      .first<IdeaRow>();
    return row ? toIdea(row) : null;
  }

  async list(orgId: string, opts: { page: number; limit: number; tag?: string }) {
    const offset = (opts.page - 1) * opts.limit;
    let sql = "SELECT * FROM ax_ideas WHERE org_id = ? AND is_deleted = 0";
    const params: unknown[] = [orgId];

    if (opts.tag) {
      // JSON array 내 태그 검색 (SQLite JSON 함수)
      sql += " AND tags LIKE ?";
      params.push(`%"${opts.tag}"%`);
    }

    sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
    params.push(opts.limit, offset);

    const { results } = await this.db
      .prepare(sql)
      .bind(...params)
      .all<IdeaRow>();

    const countSql = opts.tag
      ? "SELECT COUNT(*) as total FROM ax_ideas WHERE org_id = ? AND is_deleted = 0 AND tags LIKE ?"
      : "SELECT COUNT(*) as total FROM ax_ideas WHERE org_id = ? AND is_deleted = 0";
    const countParams: unknown[] = opts.tag ? [orgId, `%"${opts.tag}"%`] : [orgId];

    const countRow = await this.db
      .prepare(countSql)
      .bind(...countParams)
      .first<{ total: number }>();

    return {
      items: (results ?? []).map(toIdea),
      total: countRow?.total ?? 0,
      page: opts.page,
      limit: opts.limit,
    };
  }

  async update(orgId: string, id: string, data: { title?: string; description?: string; tags?: string[] }): Promise<Idea | null> {
    const existing = await this.getById(orgId, id);
    if (!existing) return null;

    const now = Date.now();
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      params.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.tags !== undefined) {
      updates.push("tags = ?");
      params.push(JSON.stringify(data.tags));
    }

    updates.push("updated_at = ?", "sync_status = 'pending'");
    params.push(now, id, orgId);

    await this.db
      .prepare(`UPDATE ax_ideas SET ${updates.join(", ")} WHERE id = ? AND org_id = ?`)
      .bind(...params)
      .run();

    return this.getById(orgId, id);
  }

  async softDelete(orgId: string, id: string): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE ax_ideas SET is_deleted = 1, updated_at = ? WHERE id = ? AND org_id = ?")
      .bind(Date.now(), id, orgId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }
}
