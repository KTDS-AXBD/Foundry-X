/**
 * Sprint 223: F459 포트폴리오 연결 구조 검색 서비스
 *
 * D1 환경에서 복잡한 JOIN 대신 개별 쿼리 8개를 Promise.all로 병렬 실행하여 트리를 조립해요.
 */

import type { PortfolioTree, PortfolioProgress, PortfolioOffering } from "../schemas/portfolio.js";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

interface RawBizItem {
  id: string;
  title: string;
  description: string | null;
  source: string;
  status: string;
  created_at: string;
}

interface RawClassification {
  item_type: string;
  confidence: number;
  classified_at: string;
}

interface RawEvaluation {
  id: string;
  verdict: string;
  avg_score: number;
  total_concerns: number;
  evaluated_at: string;
}

interface RawEvaluationScore {
  evaluation_id: string;
  persona_id: string;
  business_viability: number;
  strategic_fit: number;
  customer_value: number;
  summary: string | null;
}

interface RawStartingPoint {
  starting_point: string;
  confidence: number;
  reasoning: string | null;
}

interface RawCriterion {
  criterion_id: number;
  status: string;
  evidence: string | null;
  completed_at: string | null;
}

interface RawBusinessPlan {
  id: string;
  version: number;
  model_used: string | null;
  generated_at: string;
}

interface RawOffering {
  id: string;
  title: string;
  purpose: string;
  format: string;
  status: string;
  current_version: number;
  sections_count: number;
  versions_count: number;
}

interface RawPrototype {
  id: string;
  version: number;
  format: string;
  template_used: string | null;
  generated_at: string;
}

interface RawPipelineStage {
  stage: string;
  entered_at: string;
  exited_at: string | null;
  notes: string | null;
}

interface RawOfferingPrototype {
  offering_id: string;
  prototype_id: string;
}

const STAGE_ORDER = ["REGISTERED", "DISCOVERY", "FORMALIZATION", "REVIEW", "DECISION", "OFFERING"];

export class PortfolioService {
  constructor(private db: D1Database) {}

  async getPortfolioTree(bizItemId: string, orgId: string): Promise<PortfolioTree> {
    const item = await this.getBizItem(bizItemId, orgId);
    if (!item) throw new NotFoundError("사업 아이템을 찾을 수 없어요");

    // 8개 쿼리 병렬 실행
    const [
      classification,
      evaluations,
      startingPoint,
      criteria,
      businessPlans,
      offerings,
      prototypes,
      pipelineStages,
    ] = await Promise.all([
      this.getClassification(bizItemId),
      this.getEvaluationsWithScores(bizItemId),
      this.getStartingPoint(bizItemId),
      this.getCriteria(bizItemId),
      this.getBusinessPlans(bizItemId),
      this.getOfferingsWithCounts(bizItemId),
      this.getPrototypes(bizItemId),
      this.getPipelineStages(bizItemId),
    ]);

    // offering ↔ prototype 연결
    const offeringIds = offerings.map((o) => o.id);
    const offeringsWithPrototypes = offeringIds.length > 0
      ? await this.attachPrototypesToOfferings(offerings, offeringIds)
      : offerings;

    const progress = this.calculateProgress(pipelineStages, criteria, businessPlans, offerings, prototypes);

    return {
      item: {
        id: item.id,
        title: item.title,
        description: item.description,
        source: item.source,
        status: item.status,
        createdAt: item.created_at,
      },
      classification,
      evaluations,
      startingPoint,
      criteria,
      businessPlans,
      offerings: offeringsWithPrototypes,
      prototypes,
      pipelineStages,
      progress,
    };
  }

  private async getBizItem(bizItemId: string, orgId: string): Promise<RawBizItem | null> {
    return this.db
      .prepare("SELECT id, title, description, source, status, created_at FROM biz_items WHERE id = ? AND org_id = ?")
      .bind(bizItemId, orgId)
      .first<RawBizItem>();
  }

  private async getClassification(bizItemId: string) {
    const row = await this.db
      .prepare("SELECT item_type, confidence, classified_at FROM biz_item_classifications WHERE biz_item_id = ?")
      .bind(bizItemId)
      .first<RawClassification>();

    if (!row) return null;
    return {
      itemType: row.item_type,
      confidence: row.confidence,
      classifiedAt: row.classified_at,
    };
  }

  private async getEvaluationsWithScores(bizItemId: string) {
    const { results: evals } = await this.db
      .prepare("SELECT id, verdict, avg_score, total_concerns, evaluated_at FROM biz_evaluations WHERE biz_item_id = ? ORDER BY evaluated_at DESC")
      .bind(bizItemId)
      .all<RawEvaluation>();

    if (evals.length === 0) return [];

    const evalIds = evals.map((e) => e.id);
    const placeholders = evalIds.map(() => "?").join(",");
    const { results: scores } = await this.db
      .prepare(`SELECT evaluation_id, persona_id, business_viability, strategic_fit, customer_value, summary FROM biz_evaluation_scores WHERE evaluation_id IN (${placeholders})`)
      .bind(...evalIds)
      .all<RawEvaluationScore>();

    const scoresByEval = new Map<string, RawEvaluationScore[]>();
    for (const s of scores) {
      const arr = scoresByEval.get(s.evaluation_id) ?? [];
      arr.push(s);
      scoresByEval.set(s.evaluation_id, arr);
    }

    return evals.map((e) => ({
      id: e.id,
      verdict: e.verdict,
      avgScore: e.avg_score,
      totalConcerns: e.total_concerns,
      evaluatedAt: e.evaluated_at,
      scores: (scoresByEval.get(e.id) ?? []).map((s) => ({
        personaId: s.persona_id,
        businessViability: s.business_viability,
        strategicFit: s.strategic_fit,
        customerValue: s.customer_value,
        summary: s.summary,
      })),
    }));
  }

  private async getStartingPoint(bizItemId: string) {
    const row = await this.db
      .prepare("SELECT starting_point, confidence, reasoning FROM biz_item_starting_points WHERE biz_item_id = ?")
      .bind(bizItemId)
      .first<RawStartingPoint>();

    if (!row) return null;
    return {
      startingPoint: row.starting_point as "idea" | "market" | "problem" | "tech" | "service",
      confidence: row.confidence,
      reasoning: row.reasoning,
    };
  }

  private async getCriteria(bizItemId: string) {
    const { results } = await this.db
      .prepare("SELECT criterion_id, status, evidence, completed_at FROM biz_discovery_criteria WHERE biz_item_id = ? ORDER BY criterion_id")
      .bind(bizItemId)
      .all<RawCriterion>();

    return results.map((r) => ({
      criterionId: r.criterion_id,
      status: r.status as "pending" | "in_progress" | "completed" | "needs_revision",
      evidence: r.evidence,
      completedAt: r.completed_at,
    }));
  }

  private async getBusinessPlans(bizItemId: string) {
    const { results } = await this.db
      .prepare("SELECT id, version, model_used, generated_at FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC")
      .bind(bizItemId)
      .all<RawBusinessPlan>();

    return results.map((r) => ({
      id: r.id,
      version: r.version,
      modelUsed: r.model_used,
      generatedAt: r.generated_at,
    }));
  }

  private async getOfferingsWithCounts(bizItemId: string): Promise<PortfolioOffering[]> {
    const { results: offs } = await this.db
      .prepare("SELECT id, title, purpose, format, status, current_version FROM offerings WHERE biz_item_id = ?")
      .bind(bizItemId)
      .all<RawOffering>();

    if (offs.length === 0) return [];

    // 각 offering의 섹션/버전 카운트 조회
    const enriched = await Promise.all(
      offs.map(async (o) => {
        const [sectionsResult, versionsResult] = await Promise.all([
          this.db
            .prepare("SELECT COUNT(*) as cnt FROM offering_sections WHERE offering_id = ?")
            .bind(o.id)
            .first<{ cnt: number }>(),
          this.db
            .prepare("SELECT COUNT(*) as cnt FROM offering_versions WHERE offering_id = ?")
            .bind(o.id)
            .first<{ cnt: number }>(),
        ]);

        return {
          id: o.id,
          title: o.title,
          purpose: o.purpose as "report" | "proposal" | "review",
          format: o.format as "html" | "pptx",
          status: o.status,
          currentVersion: o.current_version,
          sectionsCount: sectionsResult?.cnt ?? 0,
          versionsCount: versionsResult?.cnt ?? 0,
          linkedPrototypeIds: [] as string[],
        };
      }),
    );

    return enriched;
  }

  private async getPrototypes(bizItemId: string) {
    const { results } = await this.db
      .prepare("SELECT id, version, format, template_used, generated_at FROM prototypes WHERE biz_item_id = ? ORDER BY version DESC")
      .bind(bizItemId)
      .all<RawPrototype>();

    return results.map((r) => ({
      id: r.id,
      version: r.version,
      format: r.format,
      templateUsed: r.template_used,
      generatedAt: r.generated_at,
    }));
  }

  private async getPipelineStages(bizItemId: string) {
    const { results } = await this.db
      .prepare("SELECT stage, entered_at, exited_at, notes FROM pipeline_stages WHERE biz_item_id = ? ORDER BY entered_at ASC")
      .bind(bizItemId)
      .all<RawPipelineStage>();

    return results.map((r) => ({
      stage: r.stage,
      enteredAt: r.entered_at,
      exitedAt: r.exited_at,
      notes: r.notes,
    }));
  }

  private async attachPrototypesToOfferings(
    offerings: PortfolioOffering[],
    offeringIds: string[],
  ): Promise<PortfolioOffering[]> {
    const placeholders = offeringIds.map(() => "?").join(",");
    const { results } = await this.db
      .prepare(`SELECT offering_id, prototype_id FROM offering_prototypes WHERE offering_id IN (${placeholders})`)
      .bind(...offeringIds)
      .all<RawOfferingPrototype>();

    const linkMap = new Map<string, string[]>();
    for (const r of results) {
      const arr = linkMap.get(r.offering_id) ?? [];
      arr.push(r.prototype_id);
      linkMap.set(r.offering_id, arr);
    }

    return offerings.map((o) => ({
      ...o,
      linkedPrototypeIds: linkMap.get(o.id) ?? [],
    }));
  }

  calculateProgress(
    stages: Array<{ stage: string }>,
    criteria: Array<{ status: string }>,
    plans: unknown[],
    offerings: unknown[],
    prototypes: unknown[],
  ): PortfolioProgress {
    const currentStage = stages.length > 0 ? stages[stages.length - 1]!.stage : "REGISTERED";
    const stageIdx = STAGE_ORDER.indexOf(currentStage);
    const completedStages = STAGE_ORDER.slice(0, stageIdx + 1);
    const criteriaCompleted = criteria.filter((c) => c.status === "completed").length;

    // 가중치 기반 진행률: 단계진입 30% + 기준완료 25% + 기획서 15% + Offering 15% + Prototype 15%
    const stagePercent = (completedStages.length / STAGE_ORDER.length) * 30;
    const criteriaPercent = (criteriaCompleted / 9) * 25;
    const planPercent = plans.length > 0 ? 15 : 0;
    const offeringPercent = offerings.length > 0 ? 15 : 0;
    const prototypePercent = prototypes.length > 0 ? 15 : 0;

    return {
      currentStage,
      completedStages,
      criteriaCompleted,
      criteriaTotal: 9,
      hasBusinessPlan: plans.length > 0,
      hasOffering: offerings.length > 0,
      hasPrototype: prototypes.length > 0,
      overallPercent: Math.round(stagePercent + criteriaPercent + planPercent + offeringPercent + prototypePercent),
    };
  }
}
