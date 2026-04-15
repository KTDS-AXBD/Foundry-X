/**
 * Portfolio Service — fx-discovery (hotfix: biz-items 정적 경로 이전)
 *
 * 원본: packages/api/src/core/discovery/services/portfolio-service.ts
 * 포팅 범위: biz-items/portfolio-list, biz-items/by-artifact 두 라우트가 필요한 메서드만.
 * (getPortfolioTree 등 다른 메서드는 이전 불필요 — 호출 경로 없음)
 */

const STAGE_ORDER = ["REGISTERED", "DISCOVERY", "FORMALIZATION", "REVIEW", "DECISION", "OFFERING"];

export interface PortfolioListItem {
  id: string;
  title: string;
  status: string;
  currentStage: string;
  hasEvaluation: boolean;
  prdCount: number;
  offeringCount: number;
  prototypeCount: number;
  overallPercent: number;
  createdAt: string;
}

export interface ArtifactLookupResponse {
  artifactType: "prd" | "offering" | "prototype";
  artifactId: string;
  bizItems: Array<{
    id: string;
    title: string;
    status: string;
    currentStage: string;
  }>;
}

interface RawCoverageRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  current_stage: string | null;
  has_evaluation: number;
  prd_count: number;
  offering_count: number;
  prototype_count: number;
  criteria_completed: number;
  criteria_total: number;
}

interface RawBizItemRef {
  id: string;
  title: string;
  status: string;
  current_stage: string | null;
}

export class PortfolioService {
  constructor(private db: D1Database) {}

  async listWithCoverage(orgId: string): Promise<{ items: PortfolioListItem[]; total: number }> {
    const { results } = await this.db
      .prepare(
        `SELECT
          b.id,
          b.title,
          b.status,
          b.created_at,
          (SELECT ps.stage FROM pipeline_stages ps WHERE ps.biz_item_id = b.id ORDER BY ps.entered_at DESC LIMIT 1) AS current_stage,
          (SELECT COUNT(*) FROM biz_evaluations be WHERE be.biz_item_id = b.id) AS has_evaluation,
          (SELECT COUNT(*) FROM business_plan_drafts bp WHERE bp.biz_item_id = b.id) AS prd_count,
          (SELECT COUNT(*) FROM offerings o WHERE o.biz_item_id = b.id) AS offering_count,
          (SELECT COUNT(*) FROM prototypes p WHERE p.biz_item_id = b.id) AS prototype_count,
          (SELECT COUNT(*) FROM biz_discovery_criteria dc WHERE dc.biz_item_id = b.id AND dc.status = 'completed') AS criteria_completed,
          (SELECT COUNT(*) FROM biz_discovery_criteria dc WHERE dc.biz_item_id = b.id) AS criteria_total
        FROM biz_items b
        WHERE b.org_id = ?
        ORDER BY b.created_at DESC`,
      )
      .bind(orgId)
      .all<RawCoverageRow>();

    const items: PortfolioListItem[] = results.map((r) => {
      const currentStage = r.current_stage ?? "REGISTERED";
      const stageIdx = STAGE_ORDER.indexOf(currentStage);
      const completedStagesCount = Math.max(0, stageIdx + 1);

      const stagePercent = (completedStagesCount / STAGE_ORDER.length) * 30;
      const criteriaPercent = r.criteria_total > 0 ? (r.criteria_completed / 9) * 25 : 0;
      const planPercent = r.prd_count > 0 ? 15 : 0;
      const offeringPercent = r.offering_count > 0 ? 15 : 0;
      const prototypePercent = r.prototype_count > 0 ? 15 : 0;

      return {
        id: r.id,
        title: r.title,
        status: r.status,
        currentStage,
        hasEvaluation: r.has_evaluation > 0,
        prdCount: r.prd_count,
        offeringCount: r.offering_count,
        prototypeCount: r.prototype_count,
        overallPercent: Math.round(stagePercent + criteriaPercent + planPercent + offeringPercent + prototypePercent),
        createdAt: r.created_at,
      };
    });

    return { items, total: items.length };
  }

  async findByArtifact(
    type: "prd" | "offering" | "prototype",
    artifactId: string,
    orgId: string,
  ): Promise<ArtifactLookupResponse> {
    const tableMap = {
      prd: { table: "business_plan_drafts", fk: "biz_item_id" },
      offering: { table: "offerings", fk: "biz_item_id" },
      prototype: { table: "prototypes", fk: "biz_item_id" },
    } as const;

    const { table, fk } = tableMap[type];

    const { results } = await this.db
      .prepare(
        `SELECT DISTINCT
          b.id,
          b.title,
          b.status,
          (SELECT ps.stage FROM pipeline_stages ps WHERE ps.biz_item_id = b.id ORDER BY ps.entered_at DESC LIMIT 1) AS current_stage
        FROM biz_items b
        INNER JOIN ${table} a ON a.${fk} = b.id
        WHERE a.id = ? AND b.org_id = ?`,
      )
      .bind(artifactId, orgId)
      .all<RawBizItemRef>();

    return {
      artifactType: type,
      artifactId,
      bizItems: results.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        currentStage: r.current_stage ?? "REGISTERED",
      })),
    };
  }
}
