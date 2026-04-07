/**
 * Sprint 154+155 F342+F344: PersonaConfigService — 페르소나 가중치/맥락 CRUD
 */
import type { PersonaConfigInput } from "../schemas/persona-config.js";
import type { UpsertPersonaConfigInput } from "../schemas/persona-config-schema.js";
import { BIZ_PERSONAS } from "./biz-persona-prompts.js";

export interface PersonaConfigRow {
  id: string;
  item_id: string;
  org_id: string;
  persona_id: string;
  persona_name: string;
  persona_role: string;
  weights: string;
  context_json: string;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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

  /** 아이템 ID로 전체 설정 조회 (orgId 불필요) */
  async getByItem(itemId: string): Promise<PersonaConfigRow[]> {
    const result = await this.db
      .prepare("SELECT * FROM ax_persona_configs WHERE item_id = ? ORDER BY persona_id")
      .bind(itemId)
      .all<PersonaConfigRow>();
    return result.results;
  }

  /** 8인 기본 페르소나 시딩 — 이미 있으면 0 반환 */
  async initDefaults(itemId: string, orgId: string): Promise<number> {
    const existing = await this.getByItem(itemId);
    if (existing.length > 0) return 0;

    const defaultWeights = JSON.stringify({
      strategic_fit: 15, market_potential: 15, technical_feasibility: 15,
      financial_viability: 15, competitive_advantage: 10, risk_assessment: 15, team_readiness: 15,
    });

    const sql = `INSERT INTO ax_persona_configs (id, item_id, org_id, persona_id, persona_name, persona_role, weights, context_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, '{}')`;

    const batch = BIZ_PERSONAS.map((p) =>
      this.db.prepare(sql).bind(generateId(), itemId, orgId, p.id, p.name, p.role, defaultWeights),
    );

    await this.db.batch(batch);
    return BIZ_PERSONAS.length;
  }

  /** 단일 페르소나 설정 upsert */
  async upsert(itemId: string, orgId: string, data: UpsertPersonaConfigInput): Promise<PersonaConfigRow> {
    const id = generateId();
    await this.db
      .prepare(
        `INSERT INTO ax_persona_configs (id, item_id, org_id, persona_id, persona_name, persona_role, weights, context_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(item_id, persona_id) DO UPDATE SET
           persona_name = excluded.persona_name,
           persona_role = excluded.persona_role,
           weights = excluded.weights,
           context_json = excluded.context_json,
           updated_at = datetime('now')`,
      )
      .bind(
        id, itemId, orgId, data.personaId,
        data.personaName, data.personaRole,
        JSON.stringify(data.weights), JSON.stringify(data.contextJson),
      )
      .run();

    const result = await this.db
      .prepare("SELECT * FROM ax_persona_configs WHERE item_id = ? AND persona_id = ?")
      .bind(itemId, data.personaId)
      .first<PersonaConfigRow>();
    return result!;
  }

  /** 가중치만 변경 */
  async updateWeights(itemId: string, personaId: string, weights: Record<string, number>): Promise<void> {
    await this.db
      .prepare(
        "UPDATE ax_persona_configs SET weights = ?, updated_at = datetime('now') WHERE item_id = ? AND persona_id = ?",
      )
      .bind(JSON.stringify(weights), itemId, personaId)
      .run();
  }

  /** 벌크 설정 upsert (SSE 평가용) */
  async upsertConfigs(
    itemId: string,
    orgId: string,
    configs: PersonaConfigInput[],
  ): Promise<void> {
    const sql = `INSERT INTO ax_persona_configs (id, item_id, org_id, persona_id, weights, context_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(item_id, persona_id) DO UPDATE SET
         weights = excluded.weights,
         context_json = excluded.context_json,
         updated_at = datetime('now')`;

    const batch = configs.map((c) =>
      this.db.prepare(sql).bind(
        generateId(),
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
