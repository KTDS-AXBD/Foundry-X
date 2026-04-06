/**
 * GtmOutreachService — GTM 아웃리치 파이프라인 관리 (F299)
 */
type OutreachStatus =
  | "draft" | "proposal_ready" | "sent" | "opened" | "responded"
  | "meeting_set" | "converted" | "declined" | "archived";

interface GtmOutreach {
  id: string;
  orgId: string;
  customerId: string;
  offeringPackId: string | null;
  title: string;
  status: OutreachStatus;
  proposalContent: string | null;
  proposalGeneratedAt: string | null;
  sentAt: string | null;
  responseNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  offeringPackTitle?: string;
}

export interface CreateGtmOutreachInput {
  orgId: string;
  customerId: string;
  offeringPackId?: string;
  title: string;
  createdBy: string;
}

export interface GtmOutreachFilter {
  status?: OutreachStatus;
  customerId?: string;
  search?: string;
  limit: number;
  offset: number;
}

export interface OutreachStats {
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["proposal_ready", "declined", "archived"],
  proposal_ready: ["sent", "declined", "archived"],
  sent: ["opened", "responded", "declined", "archived"],
  opened: ["responded", "declined", "archived"],
  responded: ["meeting_set", "declined", "archived"],
  meeting_set: ["converted", "declined", "archived"],
  converted: ["archived"],
  declined: ["archived"],
  archived: [],
};

export class GtmOutreachService {
  constructor(private db: D1Database) {}

  async create(input: CreateGtmOutreachInput): Promise<GtmOutreach> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO gtm_outreach (id, org_id, customer_id, offering_pack_id, title, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      )
      .bind(
        id, input.orgId, input.customerId,
        input.offeringPackId ?? null,
        input.title, input.createdBy, now, now,
      )
      .run();

    return {
      id, orgId: input.orgId, customerId: input.customerId,
      offeringPackId: input.offeringPackId ?? null,
      title: input.title, status: "draft",
      proposalContent: null, proposalGeneratedAt: null,
      sentAt: null, responseNote: null,
      createdBy: input.createdBy, createdAt: now, updatedAt: now,
    };
  }

  async list(orgId: string, filter: GtmOutreachFilter): Promise<{ items: GtmOutreach[]; total: number }> {
    const conditions = ["o.org_id = ?"];
    const params: unknown[] = [orgId];

    if (filter.status) {
      conditions.push("o.status = ?");
      params.push(filter.status);
    }
    if (filter.customerId) {
      conditions.push("o.customer_id = ?");
      params.push(filter.customerId);
    }
    if (filter.search) {
      conditions.push("(o.title LIKE ? OR c.company_name LIKE ?)");
      const s = `%${filter.search}%`;
      params.push(s, s);
    }

    const where = conditions.join(" AND ");

    const countResult = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM gtm_outreach o LEFT JOIN gtm_customers c ON o.customer_id = c.id WHERE ${where}`,
      )
      .bind(...params)
      .first<{ cnt: number }>();

    const rows = await this.db
      .prepare(
        `SELECT o.*, c.company_name as customer_name, p.title as offering_pack_title
         FROM gtm_outreach o
         LEFT JOIN gtm_customers c ON o.customer_id = c.id
         LEFT JOIN offering_packs p ON o.offering_pack_id = p.id
         WHERE ${where}
         ORDER BY o.updated_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, filter.limit, filter.offset)
      .all();

    return {
      items: (rows.results ?? []).map(mapOutreachRow),
      total: countResult?.cnt ?? 0,
    };
  }

  async getById(id: string, orgId: string): Promise<GtmOutreach | null> {
    const row = await this.db
      .prepare(
        `SELECT o.*, c.company_name as customer_name, p.title as offering_pack_title
         FROM gtm_outreach o
         LEFT JOIN gtm_customers c ON o.customer_id = c.id
         LEFT JOIN offering_packs p ON o.offering_pack_id = p.id
         WHERE o.id = ? AND o.org_id = ?`,
      )
      .bind(id, orgId)
      .first();
    return row ? mapOutreachRow(row) : null;
  }

  async updateStatus(
    id: string, orgId: string, newStatus: OutreachStatus, responseNote?: string,
  ): Promise<GtmOutreach | null> {
    const current = await this.getById(id, orgId);
    if (!current) return null;

    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${current.status} → ${newStatus}`);
    }

    const now = new Date().toISOString();
    const sentAt = newStatus === "sent" ? now : current.sentAt;

    await this.db
      .prepare(
        `UPDATE gtm_outreach SET status = ?, response_note = COALESCE(?, response_note), sent_at = ?, updated_at = ? WHERE id = ? AND org_id = ?`,
      )
      .bind(newStatus, responseNote ?? null, sentAt, now, id, orgId)
      .run();

    return this.getById(id, orgId);
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    const current = await this.getById(id, orgId);
    if (!current) return false;
    if (current.status !== "draft") {
      throw new Error("Only draft outreach can be deleted");
    }

    const result = await this.db
      .prepare("DELETE FROM gtm_outreach WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async updateProposal(id: string, orgId: string, content: string): Promise<GtmOutreach | null> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE gtm_outreach SET proposal_content = ?, proposal_generated_at = ?, status = 'proposal_ready', updated_at = ? WHERE id = ? AND org_id = ?`,
      )
      .bind(content, now, now, id, orgId)
      .run();
    return this.getById(id, orgId);
  }

  async stats(orgId: string): Promise<OutreachStats> {
    const rows = await this.db
      .prepare("SELECT status, COUNT(*) as cnt FROM gtm_outreach WHERE org_id = ? GROUP BY status")
      .bind(orgId)
      .all<{ status: string; cnt: number }>();

    const byStatus: Record<string, number> = {};
    let total = 0;
    let converted = 0;
    for (const r of rows.results ?? []) {
      byStatus[r.status] = r.cnt;
      total += r.cnt;
      if (r.status === "converted") converted = r.cnt;
    }

    return {
      total,
      byStatus,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    };
  }
}

function mapOutreachRow(row: Record<string, unknown>): GtmOutreach {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    customerId: row.customer_id as string,
    offeringPackId: (row.offering_pack_id as string) ?? null,
    title: row.title as string,
    status: row.status as OutreachStatus,
    proposalContent: (row.proposal_content as string) ?? null,
    proposalGeneratedAt: (row.proposal_generated_at as string) ?? null,
    sentAt: (row.sent_at as string) ?? null,
    responseNote: (row.response_note as string) ?? null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    customerName: (row.customer_name as string) ?? undefined,
    offeringPackTitle: (row.offering_pack_title as string) ?? undefined,
  };
}
