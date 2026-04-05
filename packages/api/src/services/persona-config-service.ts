/**
 * Sprint 154: F342 PersonaConfigService — 페르소나 가중치/맥락 관리
 */
import type { UpsertPersonaConfigInput } from "../schemas/persona-config-schema.js";

interface PersonaConfigRow {
  id: string;
  org_id: string;
  item_id: string;
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
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const DEFAULT_WEIGHTS = JSON.stringify({
  strategic_fit: 20,
  market_potential: 15,
  technical_feasibility: 15,
  financial_viability: 15,
  competitive_advantage: 10,
  risk_assessment: 15,
  team_readiness: 10,
});

const DEFAULT_PERSONAS = [
  { id: "strategy", name: "전략담당", role: "사업 전략 및 비전 평가" },
  { id: "sales", name: "영업담당", role: "고객 접점 및 수주 가능성" },
  { id: "ap-biz", name: "AP사업담당", role: "파트너십 및 서비스 확장성" },
  { id: "ai-tech", name: "AI기술담당", role: "기술 실현 가능성 및 차별화" },
  { id: "finance", name: "재무담당", role: "수익성 및 투자 효율" },
  { id: "security", name: "보안담당", role: "보안/규제 리스크" },
  { id: "partner", name: "파트너담당", role: "외부 파트너 생태계" },
  { id: "product", name: "제품담당", role: "제품 완성도 및 사용자 경험" },
];

export class PersonaConfigService {
  constructor(private db: D1Database) {}

  async initDefaults(itemId: string, orgId: string): Promise<number> {
    let count = 0;
    for (const persona of DEFAULT_PERSONAS) {
      const id = generateId();
      const result = await this.db
        .prepare(
          `INSERT OR IGNORE INTO ax_persona_configs (id, org_id, item_id, persona_id, persona_name, persona_role, weights, context_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, '{}')`,
        )
        .bind(id, orgId, itemId, persona.id, persona.name, persona.role, DEFAULT_WEIGHTS)
        .run();
      if (result.meta.changes > 0) count++;
    }
    return count;
  }

  async getByItem(itemId: string): Promise<PersonaConfigRow[]> {
    const result = await this.db
      .prepare("SELECT * FROM ax_persona_configs WHERE item_id = ? ORDER BY persona_id")
      .bind(itemId)
      .all<PersonaConfigRow>();
    return result.results;
  }

  async upsert(itemId: string, orgId: string, input: UpsertPersonaConfigInput): Promise<PersonaConfigRow> {
    const id = generateId();
    const weightsJson = JSON.stringify(input.weights);
    const contextJson = JSON.stringify(input.contextJson);

    await this.db
      .prepare(
        `INSERT INTO ax_persona_configs (id, org_id, item_id, persona_id, persona_name, persona_role, weights, context_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id, persona_id) DO UPDATE SET
           persona_name = excluded.persona_name,
           persona_role = excluded.persona_role,
           weights = excluded.weights,
           context_json = excluded.context_json,
           updated_at = datetime('now')`,
      )
      .bind(id, orgId, itemId, input.personaId, input.personaName, input.personaRole, weightsJson, contextJson)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM ax_persona_configs WHERE item_id = ? AND persona_id = ?")
      .bind(itemId, input.personaId)
      .first<PersonaConfigRow>();

    return row!;
  }

  async updateWeights(itemId: string, personaId: string, weights: Record<string, number>): Promise<void> {
    await this.db
      .prepare(
        `UPDATE ax_persona_configs SET weights = ?, updated_at = datetime('now')
         WHERE item_id = ? AND persona_id = ?`,
      )
      .bind(JSON.stringify(weights), itemId, personaId)
      .run();
  }
}
