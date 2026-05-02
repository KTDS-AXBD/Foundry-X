/**
 * F152: 에이전트 마켓플레이스 — AgentMarketplace
 * 커스텀 역할을 게시·검색·설치·평가하는 마켓 서비스
 */

export interface MarketplaceItem {
  id: string;
  roleId: string;
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
  preferredModel: string | null;
  preferredRunnerType: string;
  taskType: string;
  category: string;
  tags: string[];
  publisherOrgId: string;
  status: "published" | "archived";
  avgRating: number;
  ratingCount: number;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceItemRow {
  id: string;
  role_id: string;
  name: string;
  description: string;
  system_prompt: string;
  allowed_tools: string;
  preferred_model: string | null;
  preferred_runner_type: string;
  task_type: string;
  category: string;
  tags: string;
  publisher_org_id: string;
  status: string;
  avg_rating: number;
  rating_count: number;
  install_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublishItemInput {
  roleId: string;
  tags?: string[];
  category?: string;
}

export interface MarketplaceSearchParams {
  query?: string;
  category?: string;
  tags?: string[];
  sortBy?: "rating" | "installs" | "recent";
  limit?: number;
  offset?: number;
}

export interface MarketplaceSearchResult {
  items: MarketplaceItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface MarketplaceRating {
  id: string;
  itemId: string;
  userId: string;
  orgId: string | null;
  score: number;
  reviewText: string;
  createdAt: string;
}

export interface MarketplaceInstall {
  id: string;
  itemId: string;
  orgId: string;
  installedRoleId: string;
  installedAt: string;
}

export interface MarketplaceItemStats {
  itemId: string;
  installCount: number;
  avgRating: number;
  ratingCount: number;
  recentRatings: MarketplaceRating[];
}

export class AgentMarketplace {
  constructor(private db: D1Database) {}

  async publishItem(input: PublishItemInput, publisherOrgId: string): Promise<MarketplaceItem> {
    const role = await this.db
      .prepare("SELECT * FROM custom_agent_roles WHERE id = ?")
      .bind(input.roleId)
      .first<Record<string, unknown>>();

    if (!role) {
      throw new Error("Role not found");
    }
    if (role.is_builtin === 1) {
      throw new Error("Cannot publish builtin role");
    }

    const existing = await this.db
      .prepare("SELECT id FROM agent_marketplace_items WHERE role_id = ?")
      .bind(input.roleId)
      .first();

    if (existing) {
      throw new Error("CONFLICT: Role already published");
    }

    const id = `mkt-${crypto.randomUUID().slice(0, 12)}`;
    const category = input.category ?? (role.task_type as string);
    const tags = JSON.stringify(input.tags ?? []);
    const allowedTools = role.allowed_tools as string ?? "[]";

    await this.db
      .prepare(
        `INSERT INTO agent_marketplace_items
         (id, role_id, name, description, system_prompt, allowed_tools, preferred_model,
          preferred_runner_type, task_type, category, tags, publisher_org_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      )
      .bind(
        id,
        input.roleId,
        role.name as string,
        (role.description as string) ?? "",
        (role.system_prompt as string) ?? "",
        allowedTools,
        (role.preferred_model as string | null) ?? null,
        (role.preferred_runner_type as string) ?? "openrouter",
        role.task_type as string,
        category,
        tags,
        publisherOrgId,
      )
      .run();

    return (await this.getItem(id))!;
  }

  async searchItems(params: MarketplaceSearchParams): Promise<MarketplaceSearchResult> {
    const limit = Math.min(params.limit ?? 20, 50);
    const offset = params.offset ?? 0;

    const conditions: string[] = ["status = 'published'"];
    const bindings: unknown[] = [];

    if (params.query) {
      conditions.push("(name LIKE ? OR description LIKE ?)");
      bindings.push(`%${params.query}%`, `%${params.query}%`);
    }
    if (params.category) {
      conditions.push("category = ?");
      bindings.push(params.category);
    }

    const where = conditions.join(" AND ");

    let orderBy: string;
    switch (params.sortBy) {
      case "installs":
        orderBy = "install_count DESC";
        break;
      case "recent":
        orderBy = "created_at DESC";
        break;
      default:
        orderBy = "avg_rating DESC";
    }

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM agent_marketplace_items WHERE ${where}`)
      .bind(...bindings)
      .first<{ cnt: number }>();
    const total = countResult?.cnt ?? 0;

    const { results } = await this.db
      .prepare(
        `SELECT * FROM agent_marketplace_items WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      )
      .bind(...bindings, limit, offset)
      .all<MarketplaceItemRow>();

    return {
      items: results.map((r) => this.toMarketplaceItem(r)),
      total,
      limit,
      offset,
    };
  }

  async getItem(itemId: string): Promise<MarketplaceItem | null> {
    const row = await this.db
      .prepare("SELECT * FROM agent_marketplace_items WHERE id = ?")
      .bind(itemId)
      .first<MarketplaceItemRow>();

    return row ? this.toMarketplaceItem(row) : null;
  }

  async installItem(itemId: string, targetOrgId: string): Promise<MarketplaceInstall> {
    const item = await this.getItem(itemId);
    if (!item) {
      throw new Error("NOT_FOUND: Item not found");
    }
    if (item.status === "archived") {
      throw new Error("Cannot install archived item");
    }

    const existingInstall = await this.db
      .prepare("SELECT id FROM agent_marketplace_installs WHERE item_id = ? AND org_id = ?")
      .bind(itemId, targetOrgId)
      .first();

    if (existingInstall) {
      throw new Error("CONFLICT: Already installed");
    }

    const newRoleId = `role-${crypto.randomUUID().slice(0, 12)}`;
    await this.db
      .prepare(
        `INSERT INTO custom_agent_roles
         (id, name, description, system_prompt, allowed_tools, preferred_model,
          preferred_runner_type, task_type, org_id, is_builtin, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      )
      .bind(
        newRoleId,
        `${item.name} (marketplace-${targetOrgId})`,
        item.description,
        item.systemPrompt,
        JSON.stringify(item.allowedTools),
        item.preferredModel,
        item.preferredRunnerType,
        item.taskType,
        targetOrgId,
      )
      .run();

    const installId = `inst-${crypto.randomUUID().slice(0, 12)}`;
    await this.db
      .prepare(
        "INSERT INTO agent_marketplace_installs (id, item_id, org_id, installed_role_id) VALUES (?, ?, ?, ?)",
      )
      .bind(installId, itemId, targetOrgId, newRoleId)
      .run();

    await this.db
      .prepare("UPDATE agent_marketplace_items SET install_count = install_count + 1 WHERE id = ?")
      .bind(itemId)
      .run();

    return {
      id: installId,
      itemId,
      orgId: targetOrgId,
      installedRoleId: newRoleId,
      installedAt: new Date().toISOString(),
    };
  }

  async uninstallItem(itemId: string, orgId: string): Promise<{ uninstalled: boolean }> {
    const result = await this.db
      .prepare("DELETE FROM agent_marketplace_installs WHERE item_id = ? AND org_id = ?")
      .bind(itemId, orgId)
      .run();

    if (result.meta.changes > 0) {
      await this.db
        .prepare(
          "UPDATE agent_marketplace_items SET install_count = install_count - 1 WHERE id = ?",
        )
        .bind(itemId)
        .run();
      return { uninstalled: true };
    }

    return { uninstalled: false };
  }

  async rateItem(
    itemId: string,
    userId: string,
    orgId: string | null,
    score: number,
    reviewText?: string,
  ): Promise<MarketplaceRating> {
    const item = await this.getItem(itemId);
    if (!item) {
      throw new Error("NOT_FOUND: Item not found");
    }

    const ratingId = `rat-${crypto.randomUUID().slice(0, 12)}`;
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO agent_marketplace_ratings
         (id, item_id, user_id, org_id, score, review_text)
         VALUES (
           COALESCE((SELECT id FROM agent_marketplace_ratings WHERE item_id = ? AND user_id = ?), ?),
           ?, ?, ?, ?, ?
         )`,
      )
      .bind(itemId, userId, ratingId, itemId, userId, orgId, score, reviewText ?? "")
      .run();

    await this.recalculateRating(itemId);

    const row = await this.db
      .prepare("SELECT * FROM agent_marketplace_ratings WHERE item_id = ? AND user_id = ?")
      .bind(itemId, userId)
      .first<Record<string, unknown>>();

    return {
      id: row!.id as string,
      itemId: row!.item_id as string,
      userId: row!.user_id as string,
      orgId: (row!.org_id as string | null) ?? null,
      score: row!.score as number,
      reviewText: (row!.review_text as string) ?? "",
      createdAt: row!.created_at as string,
    };
  }

  async deleteItem(itemId: string, requestOrgId: string): Promise<{ deleted: boolean }> {
    const item = await this.getItem(itemId);
    if (!item) {
      throw new Error("NOT_FOUND: Item not found");
    }
    if (item.publisherOrgId !== requestOrgId) {
      throw new Error("FORBIDDEN: Not the publisher");
    }

    await this.db
      .prepare(
        "UPDATE agent_marketplace_items SET status = 'archived', updated_at = datetime('now') WHERE id = ?",
      )
      .bind(itemId)
      .run();

    return { deleted: true };
  }

  async getItemStats(itemId: string): Promise<MarketplaceItemStats> {
    const item = await this.db
      .prepare("SELECT install_count, avg_rating, rating_count FROM agent_marketplace_items WHERE id = ?")
      .bind(itemId)
      .first<{ install_count: number; avg_rating: number; rating_count: number }>();

    const { results: ratingRows } = await this.db
      .prepare(
        "SELECT * FROM agent_marketplace_ratings WHERE item_id = ? ORDER BY created_at DESC LIMIT 5",
      )
      .bind(itemId)
      .all<Record<string, unknown>>();

    const recentRatings: MarketplaceRating[] = ratingRows.map((r) => ({
      id: r.id as string,
      itemId: r.item_id as string,
      userId: r.user_id as string,
      orgId: (r.org_id as string | null) ?? null,
      score: r.score as number,
      reviewText: (r.review_text as string) ?? "",
      createdAt: r.created_at as string,
    }));

    return {
      itemId,
      installCount: item?.install_count ?? 0,
      avgRating: item?.avg_rating ?? 0,
      ratingCount: item?.rating_count ?? 0,
      recentRatings,
    };
  }

  private toMarketplaceItem(row: MarketplaceItemRow): MarketplaceItem {
    return {
      id: row.id,
      roleId: row.role_id,
      name: row.name,
      description: row.description,
      systemPrompt: row.system_prompt,
      allowedTools: JSON.parse(row.allowed_tools || "[]"),
      preferredModel: row.preferred_model,
      preferredRunnerType: row.preferred_runner_type,
      taskType: row.task_type,
      category: row.category,
      tags: JSON.parse(row.tags || "[]"),
      publisherOrgId: row.publisher_org_id,
      status: row.status as "published" | "archived",
      avgRating: row.avg_rating,
      ratingCount: row.rating_count,
      installCount: row.install_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async recalculateRating(itemId: string): Promise<void> {
    const stats = await this.db
      .prepare("SELECT AVG(score) as avg_score, COUNT(*) as cnt FROM agent_marketplace_ratings WHERE item_id = ?")
      .bind(itemId)
      .first<{ avg_score: number; cnt: number }>();

    await this.db
      .prepare("UPDATE agent_marketplace_items SET avg_rating = ?, rating_count = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(stats?.avg_score ?? 0, stats?.cnt ?? 0, itemId)
      .run();
  }
}
