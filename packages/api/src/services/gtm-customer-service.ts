/**
 * GtmCustomerService — GTM 고객 프로필 관리 (F299)
 */
type CompanySize = "startup" | "smb" | "mid" | "enterprise";

interface GtmCustomer {
  id: string;
  orgId: string;
  companyName: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactRole: string | null;
  companySize: CompanySize | null;
  notes: string | null;
  tags: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGtmCustomerInput {
  orgId: string;
  companyName: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  contactRole?: string;
  companySize?: CompanySize;
  notes?: string;
  tags?: string;
  createdBy: string;
}

export interface GtmCustomerFilter {
  search?: string;
  industry?: string;
  companySize?: CompanySize;
  limit: number;
  offset: number;
}

export class GtmCustomerService {
  constructor(private db: D1Database) {}

  async create(input: CreateGtmCustomerInput): Promise<GtmCustomer> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO gtm_customers (id, org_id, company_name, industry, contact_name, contact_email, contact_role, company_size, notes, tags, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id, input.orgId, input.companyName,
        input.industry ?? null, input.contactName ?? null, input.contactEmail ?? null,
        input.contactRole ?? null, input.companySize ?? null,
        input.notes ?? null, input.tags ?? null,
        input.createdBy, now, now,
      )
      .run();

    return {
      id, orgId: input.orgId, companyName: input.companyName,
      industry: input.industry ?? null, contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null, contactRole: input.contactRole ?? null,
      companySize: (input.companySize as CompanySize) ?? null,
      notes: input.notes ?? null, tags: input.tags ?? null,
      createdBy: input.createdBy, createdAt: now, updatedAt: now,
    };
  }

  async list(orgId: string, filter: GtmCustomerFilter): Promise<{ items: GtmCustomer[]; total: number }> {
    const conditions = ["org_id = ?"];
    const params: unknown[] = [orgId];

    if (filter.search) {
      conditions.push("(company_name LIKE ? OR contact_name LIKE ?)");
      const s = `%${filter.search}%`;
      params.push(s, s);
    }
    if (filter.industry) {
      conditions.push("industry = ?");
      params.push(filter.industry);
    }
    if (filter.companySize) {
      conditions.push("company_size = ?");
      params.push(filter.companySize);
    }

    const where = conditions.join(" AND ");

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM gtm_customers WHERE ${where}`)
      .bind(...params)
      .first<{ cnt: number }>();

    const rows = await this.db
      .prepare(
        `SELECT * FROM gtm_customers WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, filter.limit, filter.offset)
      .all();

    return {
      items: (rows.results ?? []).map(mapCustomerRow),
      total: countResult?.cnt ?? 0,
    };
  }

  async getById(id: string, orgId: string): Promise<GtmCustomer | null> {
    const row = await this.db
      .prepare("SELECT * FROM gtm_customers WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first();
    return row ? mapCustomerRow(row) : null;
  }

  async update(id: string, orgId: string, data: Partial<CreateGtmCustomerInput>): Promise<GtmCustomer | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const mapping: [string, unknown][] = [
      ["company_name", data.companyName],
      ["industry", data.industry],
      ["contact_name", data.contactName],
      ["contact_email", data.contactEmail],
      ["contact_role", data.contactRole],
      ["company_size", data.companySize],
      ["notes", data.notes],
      ["tags", data.tags],
    ];

    for (const [col, val] of mapping) {
      if (val !== undefined) {
        fields.push(`${col} = ?`);
        params.push(val);
      }
    }
    if (fields.length === 0) return this.getById(id, orgId);

    const now = new Date().toISOString();
    fields.push("updated_at = ?");
    params.push(now, id, orgId);

    await this.db
      .prepare(`UPDATE gtm_customers SET ${fields.join(", ")} WHERE id = ? AND org_id = ?`)
      .bind(...params)
      .run();

    return this.getById(id, orgId);
  }
}

function mapCustomerRow(row: Record<string, unknown>): GtmCustomer {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    companyName: row.company_name as string,
    industry: (row.industry as string) ?? null,
    contactName: (row.contact_name as string) ?? null,
    contactEmail: (row.contact_email as string) ?? null,
    contactRole: (row.contact_role as string) ?? null,
    companySize: (row.company_size as CompanySize) ?? null,
    notes: (row.notes as string) ?? null,
    tags: (row.tags as string) ?? null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
