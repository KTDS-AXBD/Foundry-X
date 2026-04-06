/**
 * ShareLinkService — 산출물 공유 링크 CRUD (F233)
 */

export interface ShareLink {
  id: string;
  bizItemId: string;
  orgId: string;
  token: string;
  accessLevel: "view" | "comment" | "edit";
  expiresAt: string | null;
  createdBy: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateShareLinkInput {
  bizItemId: string;
  orgId: string;
  accessLevel: "view" | "comment" | "edit";
  expiresInDays?: number;
  createdBy: string;
}

export class ShareLinkService {
  constructor(private db: D1Database) {}

  async create(input: CreateShareLinkInput): Promise<ShareLink> {
    const id = crypto.randomUUID();
    const token = crypto.randomUUID().replace(/-/g, "");
    const now = new Date();
    const expiresAt = input.expiresInDays
      ? new Date(now.getTime() + input.expiresInDays * 86400000).toISOString()
      : null;

    await this.db
      .prepare(
        `INSERT INTO share_links (id, biz_item_id, org_id, token, access_level, expires_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.bizItemId, input.orgId, token, input.accessLevel, expiresAt, input.createdBy)
      .run();

    return {
      id,
      bizItemId: input.bizItemId,
      orgId: input.orgId,
      token,
      accessLevel: input.accessLevel,
      expiresAt,
      createdBy: input.createdBy,
      revokedAt: null,
      createdAt: now.toISOString(),
    };
  }

  async listByUser(orgId: string, userId: string): Promise<ShareLink[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, token, access_level, expires_at, created_by, revoked_at, created_at
         FROM share_links
         WHERE org_id = ? AND created_by = ? AND revoked_at IS NULL
         ORDER BY created_at DESC`,
      )
      .bind(orgId, userId)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async getByToken(token: string): Promise<ShareLink | null> {
    const row = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, token, access_level, expires_at, created_by, revoked_at, created_at
         FROM share_links WHERE token = ? AND revoked_at IS NULL`,
      )
      .bind(token)
      .first<Record<string, unknown>>();

    if (!row) return null;

    const link = this.mapRow(row);
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return null;

    return link;
  }

  async revoke(id: string, orgId: string): Promise<boolean> {
    const result = await this.db
      .prepare(`UPDATE share_links SET revoked_at = datetime('now') WHERE id = ? AND org_id = ? AND revoked_at IS NULL`)
      .bind(id, orgId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  private mapRow(r: Record<string, unknown>): ShareLink {
    return {
      id: r.id as string,
      bizItemId: r.biz_item_id as string,
      orgId: r.org_id as string,
      token: r.token as string,
      accessLevel: r.access_level as "view" | "comment" | "edit",
      expiresAt: r.expires_at as string | null,
      createdBy: r.created_by as string,
      revokedAt: r.revoked_at as string | null,
      createdAt: r.created_at as string,
    };
  }
}
