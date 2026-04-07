/**
 * F370: Offerings CRUD Service (Sprint 167)
 */
import type {
  Offering,
  OfferingVersion,
  CreateOfferingInput,
  UpdateOfferingInput,
  OfferingFilter,
} from "../schemas/offering.schema.js";
import type { OfferingSection } from "../schemas/offering-section.schema.js";
import { STANDARD_SECTIONS } from "../schemas/offering-section.schema.js";

interface OfferingRow {
  id: string;
  org_id: string;
  biz_item_id: string;
  title: string;
  purpose: string;
  format: string;
  status: string;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface VersionRow {
  id: string;
  offering_id: string;
  version: number;
  snapshot: string | null;
  change_summary: string | null;
  created_by: string;
  created_at: string;
}

interface SectionRow {
  id: string;
  offering_id: string;
  section_key: string;
  title: string;
  content: string | null;
  sort_order: number;
  is_required: number;
  is_included: number;
  created_at: string;
  updated_at: string;
}

function rowToOffering(row: OfferingRow): Offering {
  return {
    id: row.id,
    orgId: row.org_id,
    bizItemId: row.biz_item_id,
    title: row.title,
    purpose: row.purpose as Offering["purpose"],
    format: row.format as Offering["format"],
    status: row.status as Offering["status"],
    currentVersion: row.current_version,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToVersion(row: VersionRow): OfferingVersion {
  return {
    id: row.id,
    offeringId: row.offering_id,
    version: row.version,
    snapshot: row.snapshot,
    changeSummary: row.change_summary,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function rowToSection(row: SectionRow): OfferingSection {
  return {
    id: row.id,
    offeringId: row.offering_id,
    sectionKey: row.section_key,
    title: row.title,
    content: row.content,
    sortOrder: row.sort_order,
    isRequired: row.is_required === 1,
    isIncluded: row.is_included === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateId(): string {
  return crypto.randomUUID();
}

export class OfferingService {
  constructor(private db: D1Database) {}

  async create(
    input: CreateOfferingInput & { orgId: string; createdBy: string },
  ): Promise<Offering & { sections: OfferingSection[] }> {
    const id = generateId();

    await this.db
      .prepare(
        `INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, status, current_version, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', 1, ?)`,
      )
      .bind(id, input.orgId, input.bizItemId, input.title, input.purpose, input.format, input.createdBy)
      .run();

    // Auto-initialize standard sections
    const sections: OfferingSection[] = [];
    for (const s of STANDARD_SECTIONS) {
      const sectionId = generateId();
      await this.db
        .prepare(
          `INSERT INTO offering_sections (id, offering_id, section_key, title, sort_order, is_required, is_included)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(sectionId, id, s.key, s.title, s.sortOrder, s.isRequired ? 1 : 0, 1)
        .run();
      sections.push({
        id: sectionId,
        offeringId: id,
        sectionKey: s.key,
        title: s.title,
        content: null,
        sortOrder: s.sortOrder,
        isRequired: s.isRequired,
        isIncluded: true,
        createdAt: "",
        updatedAt: "",
      });
    }

    const offering = await this.getOfferingRow(input.orgId, id);
    return { ...offering!, sections };
  }

  async list(orgId: string, filter: OfferingFilter): Promise<{ items: Offering[]; total: number }> {
    const conditions = ["org_id = ?"];
    const params: unknown[] = [orgId];

    if (filter.status) {
      conditions.push("status = ?");
      params.push(filter.status);
    }
    if (filter.bizItemId) {
      conditions.push("biz_item_id = ?");
      params.push(filter.bizItemId);
    }
    if (filter.purpose) {
      conditions.push("purpose = ?");
      params.push(filter.purpose);
    }

    const where = conditions.join(" AND ");

    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM offerings WHERE ${where}`)
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = (filter.page - 1) * filter.limit;
    const result = await this.db
      .prepare(`SELECT * FROM offerings WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, filter.limit, offset)
      .all<OfferingRow>();

    return {
      items: result.results.map(rowToOffering),
      total,
    };
  }

  async getById(
    orgId: string,
    id: string,
  ): Promise<(Offering & { sections: OfferingSection[] }) | null> {
    const offering = await this.getOfferingRow(orgId, id);
    if (!offering) return null;

    const sectionsResult = await this.db
      .prepare("SELECT * FROM offering_sections WHERE offering_id = ? ORDER BY sort_order ASC")
      .bind(id)
      .all<SectionRow>();

    return {
      ...offering,
      sections: sectionsResult.results.map(rowToSection),
    };
  }

  async update(orgId: string, id: string, input: UpdateOfferingInput): Promise<Offering | null> {
    const existing = await this.getOfferingRow(orgId, id);
    if (!existing) return null;

    const sets: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (input.title !== undefined) {
      sets.push("title = ?");
      params.push(input.title);
    }
    if (input.purpose !== undefined) {
      sets.push("purpose = ?");
      params.push(input.purpose);
    }
    if (input.status !== undefined) {
      sets.push("status = ?");
      params.push(input.status);
    }

    params.push(id, orgId);
    await this.db
      .prepare(`UPDATE offerings SET ${sets.join(", ")} WHERE id = ? AND org_id = ?`)
      .bind(...params)
      .run();

    return this.getOfferingRow(orgId, id);
  }

  async delete(orgId: string, id: string): Promise<boolean> {
    const existing = await this.getOfferingRow(orgId, id);
    if (!existing) return false;

    await this.db
      .prepare("DELETE FROM offerings WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .run();
    return true;
  }

  async createVersion(
    orgId: string,
    offeringId: string,
    createdBy: string,
    changeSummary?: string,
  ): Promise<OfferingVersion | null> {
    const offering = await this.getOfferingRow(orgId, offeringId);
    if (!offering) return null;

    // Snapshot current sections
    const sectionsResult = await this.db
      .prepare("SELECT * FROM offering_sections WHERE offering_id = ? ORDER BY sort_order ASC")
      .bind(offeringId)
      .all<SectionRow>();
    const snapshot = JSON.stringify(sectionsResult.results.map(rowToSection));

    const versionId = generateId();
    const newVersion = offering.currentVersion + 1;

    await this.db
      .prepare(
        `INSERT INTO offering_versions (id, offering_id, version, snapshot, change_summary, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(versionId, offeringId, newVersion, snapshot, changeSummary ?? null, createdBy)
      .run();

    // Update current_version on offering
    await this.db
      .prepare("UPDATE offerings SET current_version = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(newVersion, offeringId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM offering_versions WHERE id = ?")
      .bind(versionId)
      .first<VersionRow>();

    return row ? rowToVersion(row) : null;
  }

  async listVersions(orgId: string, offeringId: string): Promise<OfferingVersion[]> {
    const offering = await this.getOfferingRow(orgId, offeringId);
    if (!offering) return [];

    const result = await this.db
      .prepare("SELECT * FROM offering_versions WHERE offering_id = ? ORDER BY version DESC")
      .bind(offeringId)
      .all<VersionRow>();

    return result.results.map(rowToVersion);
  }

  private async getOfferingRow(orgId: string, id: string): Promise<Offering | null> {
    const row = await this.db
      .prepare("SELECT * FROM offerings WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<OfferingRow>();
    return row ? rowToOffering(row) : null;
  }
}
