/**
 * F371: Offering Section Service (Sprint 167)
 */
import type { OfferingSection, UpdateSectionInput } from "../schemas/offering-section.schema.js";
import { STANDARD_SECTIONS } from "../schemas/offering-section.schema.js";

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

export class OfferingSectionService {
  constructor(private db: D1Database) {}

  async listByOffering(offeringId: string): Promise<OfferingSection[]> {
    const result = await this.db
      .prepare("SELECT * FROM offering_sections WHERE offering_id = ? ORDER BY sort_order ASC")
      .bind(offeringId)
      .all<SectionRow>();
    return result.results.map(rowToSection);
  }

  async update(sectionId: string, input: UpdateSectionInput): Promise<OfferingSection | null> {
    const existing = await this.db
      .prepare("SELECT * FROM offering_sections WHERE id = ?")
      .bind(sectionId)
      .first<SectionRow>();
    if (!existing) return null;

    const sets: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (input.title !== undefined) {
      sets.push("title = ?");
      params.push(input.title);
    }
    if (input.content !== undefined) {
      sets.push("content = ?");
      params.push(input.content);
    }
    if (input.isIncluded !== undefined) {
      sets.push("is_included = ?");
      params.push(input.isIncluded ? 1 : 0);
    }

    params.push(sectionId);
    await this.db
      .prepare(`UPDATE offering_sections SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...params)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM offering_sections WHERE id = ?")
      .bind(sectionId)
      .first<SectionRow>();
    return row ? rowToSection(row) : null;
  }

  async toggleIncluded(sectionId: string): Promise<OfferingSection | null> {
    const existing = await this.db
      .prepare("SELECT * FROM offering_sections WHERE id = ?")
      .bind(sectionId)
      .first<SectionRow>();
    if (!existing) return null;

    // Required sections cannot be toggled off
    if (existing.is_required === 1 && existing.is_included === 1) {
      return null; // caller should return 400
    }

    const newValue = existing.is_included === 1 ? 0 : 1;
    await this.db
      .prepare("UPDATE offering_sections SET is_included = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(newValue, sectionId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM offering_sections WHERE id = ?")
      .bind(sectionId)
      .first<SectionRow>();
    return row ? rowToSection(row) : null;
  }

  async initStandard(offeringId: string, includeOptional: boolean): Promise<OfferingSection[]> {
    // Delete existing sections
    await this.db
      .prepare("DELETE FROM offering_sections WHERE offering_id = ?")
      .bind(offeringId)
      .run();

    const sections: OfferingSection[] = [];
    const toInsert = includeOptional
      ? STANDARD_SECTIONS
      : STANDARD_SECTIONS.filter((s) => s.isRequired);

    for (const s of toInsert) {
      const sectionId = generateId();
      await this.db
        .prepare(
          `INSERT INTO offering_sections (id, offering_id, section_key, title, sort_order, is_required, is_included)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
        )
        .bind(sectionId, offeringId, s.key, s.title, s.sortOrder, s.isRequired ? 1 : 0)
        .run();

      const row = await this.db
        .prepare("SELECT * FROM offering_sections WHERE id = ?")
        .bind(sectionId)
        .first<SectionRow>();
      if (row) sections.push(rowToSection(row));
    }

    return sections;
  }

  async reorder(offeringId: string, sectionIds: string[]): Promise<OfferingSection[]> {
    for (let i = 0; i < sectionIds.length; i++) {
      await this.db
        .prepare(
          "UPDATE offering_sections SET sort_order = ?, updated_at = datetime('now') WHERE id = ? AND offering_id = ?",
        )
        .bind(i, sectionIds[i], offeringId)
        .run();
    }

    return this.listByOffering(offeringId);
  }

  async offeringExists(offeringId: string, orgId: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT id FROM offerings WHERE id = ? AND org_id = ?")
      .bind(offeringId, orgId)
      .first<{ id: string }>();
    return row !== null;
  }
}
