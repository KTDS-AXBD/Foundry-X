/**
 * Sprint 155 F344: PersonaConfigService — 페르소나 가중치/맥락 CRUD
 */
import type { PersonaConfigInput } from "../schemas/persona-config.js";

export interface PersonaConfigRow {
  id: string;
  item_id: string;
  org_id: string;
  persona_id: string;
  weights: string;
  context_json: string;
  created_at: string;
  updated_at: string;
}

export class PersonaConfigService {
  constructor(private db: D1Database) {}

  async getByItemId(itemId: string, orgId: string): Promise<PersonaConfigRow[]> {
    const result = await this.db
      .prepare("SELECT * FROM ax_persona_configs WHERE item_id = ? AND org_id = ? ORDER BY persona_id")
      .bind(itemId, orgId)
      .all<PersonaConfigRow>();
    return result.results;
  }

  async upsertConfigs(
    itemId: string,
    orgId: string,
    configs: PersonaConfigInput[],
  ): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT INTO ax_persona_configs (item_id, org_id, persona_id, weights, context_json, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(item_id, persona_id) DO UPDATE SET
         weights = excluded.weights,
         context_json = excluded.context_json,
         updated_at = datetime('now')`,
    );

    const batch = configs.map((c) =>
      stmt.bind(
        itemId,
        orgId,
        c.personaId,
        JSON.stringify(c.weights),
        JSON.stringify(c.context),
      ),
    );

    await this.db.batch(batch);
  }
}
