/**
 * OfferingPackService — Offering Pack 번들 패키징 (F236)
 */
import type { OfferingPackStatus, PackItemType } from "../schemas/offering-pack.schema.js";

export interface OfferingPack {
  id: string;
  bizItemId: string;
  orgId: string;
  title: string;
  description: string | null;
  status: OfferingPackStatus;
  createdBy: string;
  shareToken: string | null;
  shareExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfferingPackItem {
  id: string;
  packId: string;
  itemType: PackItemType;
  title: string;
  content: string | null;
  url: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface OfferingPackDetail extends OfferingPack {
  items: OfferingPackItem[];
}

export interface CreateOfferingPackInput {
  bizItemId: string;
  orgId: string;
  title: string;
  description?: string;
  createdBy: string;
}

export interface AddPackItemInput {
  itemType: PackItemType;
  title: string;
  content?: string;
  url?: string;
  sortOrder?: number;
}

const VALID_STATUS_TRANSITIONS: Record<OfferingPackStatus, OfferingPackStatus[]> = {
  draft: ["review"],
  review: ["approved", "draft"],
  approved: ["shared", "review"],
  shared: ["approved"],
};

export class OfferingPackService {
  constructor(private db: D1Database) {}

  async create(input: CreateOfferingPackInput): Promise<OfferingPack> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO offering_packs (id, biz_item_id, org_id, title, description, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      )
      .bind(id, input.bizItemId, input.orgId, input.title, input.description ?? null, input.createdBy, now, now)
      .run();

    return {
      id,
      bizItemId: input.bizItemId,
      orgId: input.orgId,
      title: input.title,
      description: input.description ?? null,
      status: "draft",
      createdBy: input.createdBy,
      shareToken: null,
      shareExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async list(orgId: string, opts?: { status?: OfferingPackStatus; limit?: number; offset?: number }): Promise<OfferingPack[]> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    let query = `SELECT id, biz_item_id, org_id, title, description, status, created_by, share_token, share_expires_at, created_at, updated_at
                 FROM offering_packs WHERE org_id = ?`;
    const binds: unknown[] = [orgId];

    if (opts?.status) {
      query += ` AND status = ?`;
      binds.push(opts.status);
    }

    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    binds.push(limit, offset);

    const { results } = await this.db
      .prepare(query)
      .bind(...binds)
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapRow(r));
  }

  async getById(id: string, orgId: string): Promise<OfferingPackDetail | null> {
    const row = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, title, description, status, created_by, share_token, share_expires_at, created_at, updated_at
         FROM offering_packs WHERE id = ? AND org_id = ?`,
      )
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    const pack = this.mapRow(row);

    const { results } = await this.db
      .prepare(
        `SELECT id, pack_id, item_type, title, content, url, sort_order, created_at
         FROM offering_pack_items WHERE pack_id = ? ORDER BY sort_order ASC, created_at ASC`,
      )
      .bind(id)
      .all<Record<string, unknown>>();

    const items: OfferingPackItem[] = results.map((r) => ({
      id: r.id as string,
      packId: r.pack_id as string,
      itemType: r.item_type as PackItemType,
      title: r.title as string,
      content: r.content as string | null,
      url: r.url as string | null,
      sortOrder: r.sort_order as number,
      createdAt: r.created_at as string,
    }));

    return { ...pack, items };
  }

  async addItem(packId: string, orgId: string, input: AddPackItemInput): Promise<OfferingPackItem> {
    // Verify pack belongs to org
    const pack = await this.db
      .prepare(`SELECT id FROM offering_packs WHERE id = ? AND org_id = ?`)
      .bind(packId, orgId)
      .first<Record<string, unknown>>();

    if (!pack) throw new Error("Offering pack not found");

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const sortOrder = input.sortOrder ?? 0;

    await this.db
      .prepare(
        `INSERT INTO offering_pack_items (id, pack_id, item_type, title, content, url, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, packId, input.itemType, input.title, input.content ?? null, input.url ?? null, sortOrder, now)
      .run();

    return {
      id,
      packId,
      itemType: input.itemType,
      title: input.title,
      content: input.content ?? null,
      url: input.url ?? null,
      sortOrder,
      createdAt: now,
    };
  }

  async updateStatus(id: string, orgId: string, newStatus: OfferingPackStatus): Promise<OfferingPack> {
    const row = await this.db
      .prepare(`SELECT id, status FROM offering_packs WHERE id = ? AND org_id = ?`)
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    if (!row) throw new Error("Offering pack not found");

    const currentStatus = row.status as OfferingPackStatus;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`);
    }

    await this.db
      .prepare(`UPDATE offering_packs SET status = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`)
      .bind(newStatus, id, orgId)
      .run();

    const updated = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, title, description, status, created_by, share_token, share_expires_at, created_at, updated_at
         FROM offering_packs WHERE id = ?`,
      )
      .bind(id)
      .first<Record<string, unknown>>();

    return this.mapRow(updated!);
  }

  async createShareLink(id: string, orgId: string, expiresInDays?: number): Promise<OfferingPack> {
    const row = await this.db
      .prepare(`SELECT id, status FROM offering_packs WHERE id = ? AND org_id = ?`)
      .bind(id, orgId)
      .first<Record<string, unknown>>();

    if (!row) throw new Error("Offering pack not found");

    const currentStatus = row.status as OfferingPackStatus;
    if (currentStatus !== "approved" && currentStatus !== "shared") {
      throw new Error("Share link can only be created for approved or shared packs");
    }

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null;

    await this.db
      .prepare(
        `UPDATE offering_packs SET share_token = ?, share_expires_at = ?, status = 'shared', updated_at = datetime('now')
         WHERE id = ? AND org_id = ?`,
      )
      .bind(token, expiresAt, id, orgId)
      .run();

    const updated = await this.db
      .prepare(
        `SELECT id, biz_item_id, org_id, title, description, status, created_by, share_token, share_expires_at, created_at, updated_at
         FROM offering_packs WHERE id = ?`,
      )
      .bind(id)
      .first<Record<string, unknown>>();

    return this.mapRow(updated!);
  }

  private mapRow(r: Record<string, unknown>): OfferingPack {
    return {
      id: r.id as string,
      bizItemId: r.biz_item_id as string,
      orgId: r.org_id as string,
      title: r.title as string,
      description: r.description as string | null,
      status: r.status as OfferingPackStatus,
      createdBy: r.created_by as string,
      shareToken: r.share_token as string | null,
      shareExpiresAt: r.share_expires_at as string | null,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }
}
