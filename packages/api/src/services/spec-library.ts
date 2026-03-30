/**
 * SpecLibraryService — F227: Spec Library
 */

export interface SpecLibraryRow {
  id: string;
  org_id: string;
  title: string;
  category: string;
  tags: string;
  content: string;
  version: string;
  status: string;
  author: string;
  created_at: string;
  updated_at: string;
}

type SpecCategory = "feature" | "api" | "component" | "integration" | "other";
type SpecStatus = "draft" | "active" | "deprecated";

function toSpec(row: SpecLibraryRow) {
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    category: row.category as SpecCategory,
    tags: JSON.parse(row.tags) as string[],
    content: row.content,
    version: row.version,
    status: row.status as SpecStatus,
    author: row.author,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SpecLibraryService {
  constructor(private db: D1Database) {}

  async create(
    orgId: string,
    author: string,
    data: { title: string; category?: string; tags?: string[]; content: string; version?: string; status?: string },
  ) {
    const id = `spec-${crypto.randomUUID()}`;
    const category = data.category ?? "other";
    const tags = JSON.stringify(data.tags ?? []);
    const version = data.version ?? "1.0.0";
    const status = data.status ?? "draft";

    await this.db
      .prepare(
        "INSERT INTO spec_library (id, org_id, title, category, tags, content, version, status, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, orgId, data.title, category, tags, data.content, version, status, author)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM spec_library WHERE id = ?")
      .bind(id)
      .first<SpecLibraryRow>();

    return toSpec(row!);
  }

  async getById(id: string) {
    const row = await this.db
      .prepare("SELECT * FROM spec_library WHERE id = ?")
      .bind(id)
      .first<SpecLibraryRow>();

    return row ? toSpec(row) : null;
  }

  async list(orgId: string, opts?: { category?: string; tag?: string; status?: string }) {
    let sql = "SELECT * FROM spec_library WHERE org_id = ?";
    const bindings: string[] = [orgId];

    if (opts?.category) {
      sql += " AND category = ?";
      bindings.push(opts.category);
    }
    if (opts?.status) {
      sql += " AND status = ?";
      bindings.push(opts.status);
    }
    if (opts?.tag) {
      sql += " AND tags LIKE ?";
      bindings.push(`%"${opts.tag}"%`);
    }

    sql += " ORDER BY updated_at DESC";

    const { results } = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<SpecLibraryRow>();

    return (results ?? []).map(toSpec);
  }

  async update(id: string, data: Partial<{ title: string; category: string; tags: string[]; content: string; version: string; status: string }>) {
    const sets: string[] = [];
    const bindings: unknown[] = [];

    if (data.title !== undefined) { sets.push("title = ?"); bindings.push(data.title); }
    if (data.category !== undefined) { sets.push("category = ?"); bindings.push(data.category); }
    if (data.tags !== undefined) { sets.push("tags = ?"); bindings.push(JSON.stringify(data.tags)); }
    if (data.content !== undefined) { sets.push("content = ?"); bindings.push(data.content); }
    if (data.version !== undefined) { sets.push("version = ?"); bindings.push(data.version); }
    if (data.status !== undefined) { sets.push("status = ?"); bindings.push(data.status); }

    if (sets.length === 0) return this.getById(id);

    sets.push("updated_at = datetime('now')");
    bindings.push(id);

    await this.db
      .prepare(`UPDATE spec_library SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...bindings)
      .run();

    return this.getById(id);
  }

  async remove(id: string) {
    await this.db
      .prepare("DELETE FROM spec_library WHERE id = ?")
      .bind(id)
      .run();
  }

  async search(orgId: string, query: string) {
    const pattern = `%${query}%`;
    const { results } = await this.db
      .prepare(
        "SELECT * FROM spec_library WHERE org_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC",
      )
      .bind(orgId, pattern, pattern)
      .all<SpecLibraryRow>();

    return (results ?? []).map(toSpec);
  }

  async listCategories(orgId: string) {
    const { results } = await this.db
      .prepare("SELECT DISTINCT category FROM spec_library WHERE org_id = ? ORDER BY category")
      .bind(orgId)
      .all<{ category: string }>();

    return (results ?? []).map((r) => r.category);
  }
}
