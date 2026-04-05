/**
 * Sprint 154: F342 PersonaEvalService — 페르소나별 평가 결과 관리
 */
import type { SavePersonaEvalInput } from "../schemas/persona-eval-schema.js";

interface PersonaEvalRow {
  id: string;
  org_id: string;
  item_id: string;
  persona_id: string;
  scores: string;
  verdict: string;
  summary: string;
  concern: string | null;
  condition: string | null;
  eval_model: string;
  eval_duration_ms: number | null;
  eval_cost_usd: number | null;
  created_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class PersonaEvalService {
  constructor(private db: D1Database) {}

  async getByItem(itemId: string): Promise<PersonaEvalRow[]> {
    const result = await this.db
      .prepare("SELECT * FROM ax_persona_evals WHERE item_id = ? ORDER BY persona_id")
      .bind(itemId)
      .all<PersonaEvalRow>();
    return result.results;
  }

  async save(itemId: string, orgId: string, input: SavePersonaEvalInput): Promise<PersonaEvalRow> {
    const id = generateId();
    const scoresJson = JSON.stringify(input.scores);

    await this.db
      .prepare(
        `INSERT INTO ax_persona_evals (id, org_id, item_id, persona_id, scores, verdict, summary, concern, condition, eval_model, eval_duration_ms, eval_cost_usd)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id, persona_id) DO UPDATE SET
           scores = excluded.scores,
           verdict = excluded.verdict,
           summary = excluded.summary,
           concern = excluded.concern,
           condition = excluded.condition,
           eval_model = excluded.eval_model,
           eval_duration_ms = excluded.eval_duration_ms,
           eval_cost_usd = excluded.eval_cost_usd,
           created_at = datetime('now')`,
      )
      .bind(
        id, orgId, itemId,
        input.personaId, scoresJson, input.verdict,
        input.summary, input.concern ?? null, input.condition ?? null,
        input.evalModel ?? "claude-sonnet-4-5-20250514", input.evalDurationMs ?? null, input.evalCostUsd ?? null,
      )
      .run();

    const row = await this.db
      .prepare("SELECT * FROM ax_persona_evals WHERE item_id = ? AND persona_id = ?")
      .bind(itemId, input.personaId)
      .first<PersonaEvalRow>();

    return row!;
  }

  async getOverallVerdict(itemId: string): Promise<{ verdict: string; go: number; conditional: number; noGo: number }> {
    const evals = await this.getByItem(itemId);
    let go = 0, conditional = 0, noGo = 0;
    for (const e of evals) {
      if (e.verdict === "Go") go++;
      else if (e.verdict === "Conditional") conditional++;
      else noGo++;
    }

    let verdict: string;
    if (evals.length === 0) verdict = "Conditional";
    else if (noGo > evals.length / 2) verdict = "NoGo";
    else if (go > evals.length / 2) verdict = "Go";
    else verdict = "Conditional";

    return { verdict, go, conditional, noGo };
  }
}
