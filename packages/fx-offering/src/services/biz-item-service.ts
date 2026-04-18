/**
 * BizItemService — CRUD + 상태 관리 + 분류/평가 저장 (F175, F178)
 * + 5시작점 분류 저장/조회/확인 (F182)
 */

import type { StartingPointType, StartingPointResult } from "./analysis-paths.js";

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

interface StartingPointRow {
  id: string;
  biz_item_id: string;
  starting_point: string;
  confidence: number;
  reasoning: string | null;
  needs_confirmation: number;
  confirmed_by: string | null;
  confirmed_at: string | null;
  classified_at: string;
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

    try {
      const pipelineId = crypto.randomUUID().replace(/-/g, "");
      await this.db
        .prepare(
          `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, entered_by)
           VALUES (?, ?, ?, 'REGISTERED', ?, ?)`,
        )
        .bind(pipelineId, id, orgId, now, userId)
        .run();
    } catch {
      // pipeline_stages 미존재 환경(테스트 등)에선 무시
    }

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

  async getFullClassification(bizItemId: string): Promise<{
    itemType: string;
    confidence: number;
    turnAnswers: { turn1: string; turn2: string; turn3: string };
    analysisWeights: Record<string, number>;
    reasoning: string;
    cached: true;
  } | null> {
    const row = await this.db
      .prepare(
        `SELECT item_type, confidence, turn_1_answer, turn_2_answer, turn_3_answer, analysis_weights
         FROM biz_item_classifications WHERE biz_item_id = ?`,
      )
      .bind(bizItemId)
      .first<{
        item_type: string;
        confidence: number;
        turn_1_answer: string | null;
        turn_2_answer: string | null;
        turn_3_answer: string | null;
        analysis_weights: string | null;
      }>();
    if (!row) return null;
    return {
      itemType: row.item_type,
      confidence: row.confidence,
      turnAnswers: {
        turn1: row.turn_1_answer ?? "",
        turn2: row.turn_2_answer ?? "",
        turn3: row.turn_3_answer ?? "",
      },
      analysisWeights: JSON.parse(row.analysis_weights || "{}"),
      reasoning: "",
      cached: true,
    };
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

  // ─── F182: 5시작점 분류 저장/조회/확인 ───

  async saveStartingPoint(
    bizItemId: string,
    result: { startingPoint: string; confidence: number; reasoning: string; needsConfirmation: boolean },
  ): Promise<string> {
    const id = generateId();
    await this.db
      .prepare(
        `INSERT INTO biz_item_starting_points
           (id, biz_item_id, starting_point, confidence, reasoning, needs_confirmation, classified_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(biz_item_id) DO UPDATE SET
           starting_point = excluded.starting_point,
           confidence = excluded.confidence,
           reasoning = excluded.reasoning,
           needs_confirmation = excluded.needs_confirmation,
           classified_at = datetime('now'),
           confirmed_by = NULL,
           confirmed_at = NULL`,
      )
      .bind(id, bizItemId, result.startingPoint, result.confidence, result.reasoning, result.needsConfirmation ? 1 : 0)
      .run();
    return id;
  }

  async getStartingPoint(bizItemId: string): Promise<StartingPointResult | null> {
    const row = await this.db
      .prepare("SELECT * FROM biz_item_starting_points WHERE biz_item_id = ?")
      .bind(bizItemId)
      .first<StartingPointRow>();

    if (!row) return null;

    return {
      id: row.id,
      bizItemId: row.biz_item_id,
      startingPoint: row.starting_point as StartingPointType,
      confidence: row.confidence,
      reasoning: row.reasoning ?? "",
      needsConfirmation: row.needs_confirmation === 1,
      confirmedBy: row.confirmed_by,
      confirmedAt: row.confirmed_at,
      classifiedAt: row.classified_at,
    };
  }

  async confirmStartingPoint(
    bizItemId: string,
    userId: string,
    startingPoint?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    if (startingPoint) {
      await this.db
        .prepare(
          `UPDATE biz_item_starting_points
           SET starting_point = ?, confirmed_by = ?, confirmed_at = ?, needs_confirmation = 0
           WHERE biz_item_id = ?`,
        )
        .bind(startingPoint, userId, now, bizItemId)
        .run();
    } else {
      await this.db
        .prepare(
          `UPDATE biz_item_starting_points
           SET confirmed_by = ?, confirmed_at = ?, needs_confirmation = 0
           WHERE biz_item_id = ?`,
        )
        .bind(userId, now, bizItemId)
        .run();
    }
  }

  // ─── F190: 트렌드 리포트 저장/조회 ───

  async saveTrendReport(
    bizItemId: string,
    report: {
      marketSummary: string;
      marketSizeEstimate: unknown;
      competitors: unknown;
      trends: unknown;
      keywordsUsed: string[];
      modelUsed: string;
      tokensUsed: number;
      analyzedAt: string;
    },
  ): Promise<string> {
    const id = generateId();
    const expiresAt = new Date(new Date(report.analyzedAt).getTime() + 24 * 60 * 60 * 1000).toISOString();

    await this.db
      .prepare(
        `INSERT INTO biz_item_trend_reports
           (id, biz_item_id, market_summary, market_size_estimate, competitors, trends, keywords_used, model_used, tokens_used, analyzed_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        bizItemId,
        report.marketSummary,
        JSON.stringify(report.marketSizeEstimate),
        JSON.stringify(report.competitors),
        JSON.stringify(report.trends),
        JSON.stringify(report.keywordsUsed),
        report.modelUsed,
        report.tokensUsed,
        report.analyzedAt,
        expiresAt,
      )
      .run();

    return id;
  }

  async getTrendReport(bizItemId: string): Promise<{
    id: string;
    bizItemId: string;
    marketSummary: string;
    marketSizeEstimate: unknown;
    competitors: unknown;
    trends: unknown;
    keywordsUsed: string[];
    modelUsed: string;
    tokensUsed: number;
    analyzedAt: string;
    expiresAt: string;
  } | null> {
    const row = await this.db
      .prepare(
        "SELECT * FROM biz_item_trend_reports WHERE biz_item_id = ? ORDER BY analyzed_at DESC LIMIT 1",
      )
      .bind(bizItemId)
      .first<{
        id: string;
        biz_item_id: string;
        market_summary: string | null;
        market_size_estimate: string | null;
        competitors: string | null;
        trends: string | null;
        keywords_used: string | null;
        model_used: string | null;
        tokens_used: number;
        analyzed_at: string;
        expires_at: string | null;
      }>();

    if (!row) return null;

    return {
      id: row.id,
      bizItemId: row.biz_item_id,
      marketSummary: row.market_summary ?? "",
      marketSizeEstimate: row.market_size_estimate ? JSON.parse(row.market_size_estimate) : null,
      competitors: row.competitors ? JSON.parse(row.competitors) : [],
      trends: row.trends ? JSON.parse(row.trends) : [],
      keywordsUsed: row.keywords_used ? JSON.parse(row.keywords_used) : [],
      modelUsed: row.model_used ?? "",
      tokensUsed: row.tokens_used,
      analyzedAt: row.analyzed_at,
      expiresAt: row.expires_at ?? "",
    };
  }

  // Sprint 69: discovery_type 업데이트 (F213)
  async updateDiscoveryType(orgId: string, id: string, discoveryType: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE biz_items SET discovery_type = ?, updated_at = datetime('now')
         WHERE id = ? AND org_id = ?`,
      )
      .bind(discoveryType, id, orgId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  async getDiscoveryType(orgId: string, id: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT discovery_type FROM biz_items WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<{ discovery_type: string | null }>();

    return row?.discovery_type ?? null;
  }
}
