/**
 * F275: SkillSearchService — TF-IDF Lite 기반 시맨틱 검색
 */

import type { SkillSearchResult, SkillCategory, SkillSafetyGrade } from "@foundry-x/shared";

const FIELD_WEIGHTS: { [key: string]: number } = {
  name: 3.0,
  tags: 2.0,
  category: 1.5,
  description: 1.0,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export class SkillSearchService {
  constructor(private db: D1Database) {}

  async buildIndex(
    tenantId: string,
    skillId: string,
    entry: { name: string; description?: string | null; tags?: string[]; category?: string },
  ): Promise<void> {
    // Remove existing index for this skill
    await this.removeIndex(tenantId, skillId);

    const inserts: { token: string; weight: number; field: string }[] = [];

    // Name tokens
    for (const token of tokenize(entry.name)) {
      inserts.push({ token, weight: FIELD_WEIGHTS["name"] ?? 1.0, field: "name" });
    }

    // Description tokens
    if (entry.description) {
      for (const token of tokenize(entry.description)) {
        inserts.push({ token, weight: FIELD_WEIGHTS["description"] ?? 1.0, field: "description" });
      }
    }

    // Tags
    if (entry.tags) {
      for (const tag of entry.tags) {
        for (const token of tokenize(tag)) {
          inserts.push({ token, weight: FIELD_WEIGHTS["tags"] ?? 1.0, field: "tags" });
        }
      }
    }

    // Category
    if (entry.category) {
      for (const token of tokenize(entry.category)) {
        inserts.push({ token, weight: FIELD_WEIGHTS["category"] ?? 1.0, field: "category" });
      }
    }

    // Batch insert (dedup by token+field)
    const seen = new Set<string>();
    for (const item of inserts) {
      const key = `${item.token}:${item.field}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const id = generateId("ssi");
      await this.db
        .prepare(
          `INSERT INTO skill_search_index (id, tenant_id, skill_id, token, weight, field)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, tenantId, skillId, item.token, item.weight, item.field)
        .run();
    }
  }

  async search(
    tenantId: string,
    query: string,
    options?: { category?: string; limit?: number },
  ): Promise<SkillSearchResult[]> {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const limit = options?.limit ?? 20;

    // Build query with OR matching across tokens
    const placeholders = tokens.map(() => "?").join(", ");
    let sql = `
      SELECT si.skill_id, SUM(si.weight) as score,
             sr.name, sr.description, sr.category, sr.tags, sr.safety_grade
      FROM skill_search_index si
      JOIN skill_registry sr ON si.tenant_id = sr.tenant_id AND si.skill_id = sr.skill_id
      WHERE si.tenant_id = ?
        AND si.token IN (${placeholders})
        AND sr.deleted_at IS NULL
        AND sr.status != 'archived'`;

    const bindings: unknown[] = [tenantId, ...tokens];

    if (options?.category) {
      sql += " AND sr.category = ?";
      bindings.push(options.category);
    }

    sql += " GROUP BY si.skill_id ORDER BY score DESC LIMIT ?";
    bindings.push(limit);

    const rows = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<{
        skill_id: string;
        score: number;
        name: string;
        description: string | null;
        category: string;
        tags: string | null;
        safety_grade: string;
      }>();

    return (rows.results ?? []).map((r) => ({
      skillId: r.skill_id,
      name: r.name,
      description: r.description,
      category: r.category as SkillCategory,
      tags: parseTags(r.tags),
      safetyGrade: r.safety_grade as SkillSafetyGrade,
      score: Math.round(r.score * 100) / 100,
    }));
  }

  async removeIndex(tenantId: string, skillId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM skill_search_index WHERE tenant_id = ? AND skill_id = ?")
      .bind(tenantId, skillId)
      .run();
  }
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function generateId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${t}${r}`;
}
