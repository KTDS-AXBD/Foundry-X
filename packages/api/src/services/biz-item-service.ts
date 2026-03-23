/**
 * BizItemService — CRUD + 상태 관리 + 분류/평가 저장 (F175, F178)
 */

export interface CreateBizItemInput {
  title: string;
  description?: string;
  source?: string;
}

export interface BizItem {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  source: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  classification: {
    itemType: string;
    confidence: number;
    analysisWeights: Record<string, number>;
    classifiedAt: string;
  } | null;
}

export interface ClassificationInput {
  itemType: string;
  confidence: number;
  turn1Answer: string;
  turn2Answer: string;
  turn3Answer: string;
  analysisWeights: Record<string, number>;
}

export interface EvaluationInput {
  verdict: string;
  avgScore: number;
  totalConcerns: number;
}

export interface EvaluationScoreInput {
  personaId: string;
  businessViability: number;
  strategicFit: number;
  customerValue: number;
  techMarket: number;
  execution: number;
  financialFeasibility: number;
  competitiveDiff: number;
  scalability: number;
  summary: string;
  concerns: string[];
}

export interface EvaluationWithScores {
  id: string;
  bizItemId: string;
  verdict: string;
  avgScore: number;
  totalConcerns: number;
  evaluatedAt: string;
  scores: Array<{
    personaId: string;
    businessViability: number;
    strategicFit: number;
    customerValue: number;
    techMarket: number;
    execution: number;
    financialFeasibility: number;
    competitiveDiff: number;
    scalability: number;
    summary: string | null;
    concerns: string[];
  }>;
}

interface BizItemRow {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  source: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ClassificationRow {
  item_type: string;
  confidence: number;
  analysis_weights: string;
  classified_at: string;
}

interface EvaluationRow {
  id: string;
  biz_item_id: string;
  verdict: string;
  avg_score: number;
  total_concerns: number;
  evaluated_at: string;
}

interface EvaluationScoreRow {
  persona_id: string;
  business_viability: number;
  strategic_fit: number;
  customer_value: number;
  tech_market: number;
  execution: number;
  financial_feasibility: number;
  competitive_diff: number;
  scalability: number;
  summary: string | null;
  concerns: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toCamelCase(row: BizItemRow, classification: ClassificationRow | null): BizItem {
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    description: row.description,
    source: row.source,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    classification: classification
      ? {
          itemType: classification.item_type,
          confidence: classification.confidence,
          analysisWeights: JSON.parse(classification.analysis_weights || "{}"),
          classifiedAt: classification.classified_at,
        }
      : null,
  };
}

export class BizItemService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, data: CreateBizItemInput): Promise<BizItem> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      )
      .bind(id, orgId, data.title, data.description ?? null, data.source ?? "field", userId, now, now)
      .run();

    return {
      id,
      orgId,
      title: data.title,
      description: data.description ?? null,
      source: data.source ?? "field",
      status: "draft",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      classification: null,
    };
  }

  async list(orgId: string, filters?: { status?: string; source?: string }): Promise<BizItem[]> {
    let query = "SELECT * FROM biz_items WHERE org_id = ?";
    const bindings: unknown[] = [orgId];

    if (filters?.status) {
      query += " AND status = ?";
      bindings.push(filters.status);
    }
    if (filters?.source) {
      query += " AND source = ?";
      bindings.push(filters.source);
    }

    query += " ORDER BY created_at DESC";

    const { results } = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<BizItemRow>();

    const items: BizItem[] = [];
    for (const row of results) {
      const cls = await this.db
        .prepare("SELECT item_type, confidence, analysis_weights, classified_at FROM biz_item_classifications WHERE biz_item_id = ?")
        .bind(row.id)
        .first<ClassificationRow>();
      items.push(toCamelCase(row, cls));
    }
    return items;
  }

  async getById(orgId: string, id: string): Promise<BizItem | null> {
    const row = await this.db
      .prepare("SELECT * FROM biz_items WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<BizItemRow>();

    if (!row) return null;

    const cls = await this.db
      .prepare("SELECT item_type, confidence, analysis_weights, classified_at FROM biz_item_classifications WHERE biz_item_id = ?")
      .bind(id)
      .first<ClassificationRow>();

    return toCamelCase(row, cls);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare("UPDATE biz_items SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, now, id)
      .run();
  }

  async saveClassification(bizItemId: string, result: ClassificationInput): Promise<void> {
    const id = generateId();
    await this.db
      .prepare(
        `INSERT INTO biz_item_classifications (id, biz_item_id, item_type, confidence, turn_1_answer, turn_2_answer, turn_3_answer, analysis_weights, classified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind(
        id,
        bizItemId,
        result.itemType,
        result.confidence,
        result.turn1Answer,
        result.turn2Answer,
        result.turn3Answer,
        JSON.stringify(result.analysisWeights),
      )
      .run();
  }

  async saveEvaluation(bizItemId: string, evaluation: EvaluationInput): Promise<string> {
    const id = generateId();
    await this.db
      .prepare(
        `INSERT INTO biz_evaluations (id, biz_item_id, verdict, avg_score, total_concerns, evaluated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      )
      .bind(id, bizItemId, evaluation.verdict, evaluation.avgScore, evaluation.totalConcerns)
      .run();
    return id;
  }

  async saveEvaluationScores(evaluationId: string, scores: EvaluationScoreInput[]): Promise<void> {
    for (const score of scores) {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value, tech_market, execution, financial_feasibility, competitive_diff, scalability, summary, concerns)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          evaluationId,
          score.personaId,
          score.businessViability,
          score.strategicFit,
          score.customerValue,
          score.techMarket,
          score.execution,
          score.financialFeasibility,
          score.competitiveDiff,
          score.scalability,
          score.summary,
          JSON.stringify(score.concerns),
        )
        .run();
    }
  }

  async getEvaluation(bizItemId: string): Promise<EvaluationWithScores | null> {
    const evalRow = await this.db
      .prepare("SELECT * FROM biz_evaluations WHERE biz_item_id = ? ORDER BY evaluated_at DESC LIMIT 1")
      .bind(bizItemId)
      .first<EvaluationRow>();

    if (!evalRow) return null;

    const { results: scoreRows } = await this.db
      .prepare("SELECT * FROM biz_evaluation_scores WHERE evaluation_id = ?")
      .bind(evalRow.id)
      .all<EvaluationScoreRow>();

    return {
      id: evalRow.id,
      bizItemId: evalRow.biz_item_id,
      verdict: evalRow.verdict,
      avgScore: evalRow.avg_score,
      totalConcerns: evalRow.total_concerns,
      evaluatedAt: evalRow.evaluated_at,
      scores: scoreRows.map((s) => ({
        personaId: s.persona_id,
        businessViability: s.business_viability,
        strategicFit: s.strategic_fit,
        customerValue: s.customer_value,
        techMarket: s.tech_market,
        execution: s.execution,
        financialFeasibility: s.financial_feasibility,
        competitiveDiff: s.competitive_diff,
        scalability: s.scalability,
        summary: s.summary,
        concerns: JSON.parse(s.concerns || "[]"),
      })),
    };
  }
}
