/**
 * F381: Design Token Service (Sprint 173)
 * offering_design_tokens CRUD + bulk upsert + reset to defaults
 */
import type { DesignToken, DesignTokenJson, TokenCategory } from "../schemas/design-token.schema.js";

interface TokenRow {
  id: string;
  offering_id: string;
  token_key: string;
  token_value: string;
  token_category: string;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

function rowToToken(row: TokenRow): DesignToken & { id: string } {
  return {
    id: row.id,
    tokenKey: row.token_key,
    tokenValue: row.token_value,
    tokenCategory: row.token_category as TokenCategory,
  };
}

const DEFAULT_TOKENS: Array<{ key: string; value: string; category: TokenCategory }> = [
  // color
  { key: "color.text.primary", value: "#111", category: "color" },
  { key: "color.text.secondary", value: "#666", category: "color" },
  { key: "color.bg.default", value: "#fff", category: "color" },
  { key: "color.bg.alt", value: "#f8f9fa", category: "color" },
  { key: "color.border.default", value: "#e5e5e5", category: "color" },
  { key: "color.data.positive", value: "#16a34a", category: "color" },
  { key: "color.data.negative", value: "#dc2626", category: "color" },
  // typography
  { key: "typography.hero.size", value: "48px", category: "typography" },
  { key: "typography.hero.weight", value: "900", category: "typography" },
  { key: "typography.section.size", value: "36px", category: "typography" },
  { key: "typography.body.size", value: "15px", category: "typography" },
  { key: "typography.body.weight", value: "400", category: "typography" },
  // layout
  { key: "layout.maxWidth", value: "1200px", category: "layout" },
  { key: "layout.cardRadius", value: "16px", category: "layout" },
  { key: "layout.breakpoint", value: "900px", category: "layout" },
  // spacing
  { key: "spacing.grid.gap", value: "20px", category: "spacing" },
  { key: "spacing.section.marginTop", value: "48px", category: "spacing" },
  { key: "spacing.card.marginBottom", value: "32px", category: "spacing" },
];

export class DesignTokenService {
  constructor(private db: D1Database) {}

  async list(offeringId: string): Promise<Array<DesignToken & { id: string }>> {
    const result = await this.db
      .prepare("SELECT * FROM offering_design_tokens WHERE offering_id = ? ORDER BY token_category, token_key")
      .bind(offeringId)
      .all<TokenRow>();
    return result.results.map(rowToToken);
  }

  async getAsJson(offeringId: string): Promise<DesignTokenJson> {
    const tokens = await this.list(offeringId);
    const json: DesignTokenJson = { color: {}, typography: {}, layout: {}, spacing: {} };
    for (const t of tokens) {
      json[t.tokenCategory][t.tokenKey] = t.tokenValue;
    }
    return json;
  }

  async bulkUpsert(offeringId: string, tokens: DesignToken[]): Promise<Array<DesignToken & { id: string }>> {
    for (const t of tokens) {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT INTO offering_design_tokens (id, offering_id, token_key, token_value, token_category)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(offering_id, token_key) DO UPDATE SET
             token_value = excluded.token_value,
             token_category = excluded.token_category,
             updated_at = datetime('now')`,
        )
        .bind(id, offeringId, t.tokenKey, t.tokenValue, t.tokenCategory)
        .run();
    }
    return this.list(offeringId);
  }

  async resetToDefaults(offeringId: string): Promise<Array<DesignToken & { id: string }>> {
    await this.db
      .prepare("DELETE FROM offering_design_tokens WHERE offering_id = ?")
      .bind(offeringId)
      .run();

    for (const d of DEFAULT_TOKENS) {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT INTO offering_design_tokens (id, offering_id, token_key, token_value, token_category)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(id, offeringId, d.key, d.value, d.category)
        .run();
    }

    return this.list(offeringId);
  }
}
