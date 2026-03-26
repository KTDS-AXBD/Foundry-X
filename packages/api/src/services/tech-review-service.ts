/**
 * Sprint 67: F209 — 기술 타당성 분석 서비스
 * Phase 1: 규칙 기반 분석 (AI 분석은 Phase 2)
 */

export interface TechReviewResult {
  id: string;
  prototypeId: string;
  feasibility: "high" | "medium" | "low";
  stackFit: number;
  complexity: "low" | "medium" | "high";
  risks: string[];
  recommendation: "proceed" | "modify" | "reject";
  estimatedEffort: string;
  reviewedAt: string;
  createdAt: string;
}

interface TechReviewRow {
  id: string;
  prototype_id: string;
  feasibility: string;
  stack_fit: number;
  complexity: string;
  risks: string;
  recommendation: string;
  estimated_effort: string | null;
  reviewed_at: string;
  created_at: string;
}

function toReview(row: TechReviewRow): TechReviewResult {
  return {
    id: row.id,
    prototypeId: row.prototype_id,
    feasibility: row.feasibility as TechReviewResult["feasibility"],
    stackFit: row.stack_fit,
    complexity: row.complexity as TechReviewResult["complexity"],
    risks: JSON.parse(row.risks || "[]") as string[],
    recommendation: row.recommendation as TechReviewResult["recommendation"],
    estimatedEffort: row.estimated_effort ?? "",
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export class TechReviewService {
  constructor(private db: D1Database) {}

  async analyze(prototypeId: string, tenantId: string): Promise<TechReviewResult> {
    // 1. Verify prototype and get content
    const proto = await this.db.prepare(
      `SELECT p.id, p.content, p.template_used, bi.title, bi.description
       FROM prototypes p
       JOIN biz_items bi ON p.biz_item_id = bi.id
       WHERE p.id = ? AND bi.org_id = ?`
    ).bind(prototypeId, tenantId).first<{
      id: string;
      content: string;
      template_used: string | null;
      title: string;
      description: string | null;
    }>();
    if (!proto) throw new Error("Prototype not found");

    // 2. Rule-based analysis
    const contentLength = proto.content?.length ?? 0;
    const hasTemplate = !!proto.template_used;

    // Feasibility: based on content richness
    let feasibility: TechReviewResult["feasibility"];
    if (contentLength > 5000 && hasTemplate) feasibility = "high";
    else if (contentLength > 2000) feasibility = "medium";
    else feasibility = "low";

    // Stack fit: 0~100 based on template completeness
    const stackFit = Math.min(100, Math.round((contentLength / 100) + (hasTemplate ? 30 : 0)));

    // Complexity
    let complexity: TechReviewResult["complexity"];
    if (contentLength > 10000) complexity = "high";
    else if (contentLength > 3000) complexity = "medium";
    else complexity = "low";

    // Risks
    const risks: string[] = [];
    if (!hasTemplate) risks.push("No template applied — may lack structure");
    if (contentLength < 1000) risks.push("Prototype content is minimal");
    if (complexity === "high") risks.push("High complexity may require extended timeline");

    // Recommendation
    let recommendation: TechReviewResult["recommendation"];
    if (feasibility === "high" && risks.length === 0) recommendation = "proceed";
    else if (feasibility === "low") recommendation = "reject";
    else recommendation = "modify";

    // Effort estimate
    const effortWeeks = complexity === "high" ? 4 : complexity === "medium" ? 2 : 1;
    const estimatedEffort = `${effortWeeks} weeks`;

    // 3. Save to DB
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.prepare(
      `INSERT INTO tech_reviews (id, prototype_id, feasibility, stack_fit, complexity, risks, recommendation, estimated_effort, reviewed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, prototypeId, feasibility, stackFit, complexity, JSON.stringify(risks), recommendation, estimatedEffort, now, now).run();

    return {
      id,
      prototypeId,
      feasibility,
      stackFit,
      complexity,
      risks,
      recommendation,
      estimatedEffort,
      reviewedAt: now,
      createdAt: now,
    };
  }

  async getByPrototype(prototypeId: string, tenantId: string): Promise<TechReviewResult | null> {
    const row = await this.db.prepare(
      `SELECT tr.* FROM tech_reviews tr
       JOIN prototypes p ON tr.prototype_id = p.id
       JOIN biz_items bi ON p.biz_item_id = bi.id
       WHERE tr.prototype_id = ? AND bi.org_id = ?
       ORDER BY tr.created_at DESC LIMIT 1`
    ).bind(prototypeId, tenantId).first<TechReviewRow>();
    return row ? toReview(row) : null;
  }
}
