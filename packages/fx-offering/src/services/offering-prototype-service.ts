/**
 * F382: Offering → Prototype Builder 연동 서비스 (Sprint 173)
 *
 * Offering 데이터를 PrototypeGenerationInput으로 변환하여
 * 기존 PrototypeGeneratorService를 재사용한다.
 */

import type { AgentRunner } from "./agent-runner.js";
import type { BizItem } from "./biz-item-service.js";
import type { StartingPointType } from "./analysis-paths.js";
import {
  PrototypeGeneratorService,
  type PrototypeGenerationInput,
  type PrototypeResult,
} from "./prototype-generator.js";

interface OfferingRow {
  id: string;
  org_id: string;
  biz_item_id: string;
  title: string;
  purpose: string;
  format: string;
  status: string;
}

interface SectionRow {
  section_key: string;
  title: string;
  content: string | null;
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

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function rowToBizItem(row: BizItemRow): BizItem {
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
    classification: null,
  };
}

/**
 * Offering 섹션을 PrototypeGenerationInput으로 매핑
 */
function buildPrototypeInput(
  bizItem: BizItem,
  sections: SectionRow[],
): PrototypeGenerationInput {
  const sectionMap = new Map(sections.map((s) => [s.section_key, s.content ?? ""]));

  // executive_summary → problemStatement fallback
  const problemStatement =
    sectionMap.get("executive_summary") || bizItem.description || "고객이 겪는 핵심 문제를 정의합니다.";

  // market_analysis → trendReport.marketSummary
  const marketSummary = sectionMap.get("market_analysis") || "";

  // product_overview → features (bullet point 파싱)
  const productOverview = sectionMap.get("product_overview") || "";
  const featureLines = productOverview
    .split("\n")
    .filter((l) => l.trim().startsWith("-") || l.trim().startsWith("•"));

  // value_proposition → tagline + solutionOverview
  const valueProp = sectionMap.get("value_proposition") || "";
  const tagline = valueProp.split("\n")[0]?.trim() || `${bizItem.title} — 새로운 가능성`;
  const solutionOverview = valueProp || "혁신적인 솔루션으로 문제를 해결합니다.";

  // competitive_analysis → competitors
  const competitiveRaw = sectionMap.get("competitive_analysis") || "";
  const competitors = competitiveRaw
    .split("\n")
    .filter((l) => l.trim().startsWith("-") || l.trim().startsWith("•"))
    .map((l) => ({ name: l.replace(/^[-•]\s*/, "").trim() }))
    .filter((c) => c.name.length > 0);

  // trendReport 구성
  const trendReport =
    marketSummary || competitors.length > 0
      ? {
          marketSummary,
          marketSizeEstimate: null as unknown,
          competitors,
          trends: featureLines.map((l) => l.replace(/^[-•]\s*/, "").trim()),
        }
      : null;

  return {
    bizItemId: bizItem.id,
    bizItem,
    evaluation: null,
    criteria: valueProp
      ? [
          {
            criterionId: 1,
            evidence: problemStatement,
            score: null,
            evaluatedAt: null,
          } as never,
          {
            criterionId: 4,
            evidence: `${tagline}\n${solutionOverview}`,
            score: null,
            evaluatedAt: null,
          } as never,
        ]
      : [],
    startingPoint: "idea" as StartingPointType,
    trendReport,
    prd: null,
    businessPlan: null,
  };
}

export class OfferingPrototypeService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner | null,
  ) {}

  /**
   * Offering 데이터를 기반으로 Prototype을 생성하고 연동 테이블에 매핑을 저장한다.
   */
  async generateFromOffering(
    orgId: string,
    offeringId: string,
  ): Promise<PrototypeResult> {
    // 1. Offering 조회 + org 검증
    const offering = await this.db
      .prepare("SELECT * FROM offerings WHERE id = ? AND org_id = ?")
      .bind(offeringId, orgId)
      .first<OfferingRow>();

    if (!offering) {
      throw new OfferingNotFoundError(offeringId);
    }

    // 2. BizItem 조회
    const bizItemRow = await this.db
      .prepare("SELECT * FROM biz_items WHERE id = ?")
      .bind(offering.biz_item_id)
      .first<BizItemRow>();

    if (!bizItemRow) {
      throw new Error(`BizItem not found: ${offering.biz_item_id}`);
    }
    const bizItem = rowToBizItem(bizItemRow);

    // 3. Offering 섹션 조회
    const sectionsResult = await this.db
      .prepare(
        "SELECT section_key, title, content FROM offering_sections WHERE offering_id = ? ORDER BY sort_order",
      )
      .bind(offeringId)
      .all<SectionRow>();
    const sections = sectionsResult.results ?? [];

    // 4. PrototypeGenerationInput 구성
    const input = buildPrototypeInput(bizItem, sections);

    // 5. PrototypeGeneratorService로 생성
    const generator = new PrototypeGeneratorService(this.db, this.runner);
    const result = await generator.generate(input);

    // 6. offering_prototypes 매핑 저장
    const mappingId = generateId();
    await this.db
      .prepare(
        "INSERT INTO offering_prototypes (id, offering_id, prototype_id) VALUES (?, ?, ?)",
      )
      .bind(mappingId, offeringId, result.id)
      .run();

    return result;
  }

  /**
   * Offering에 연결된 Prototype 목록을 반환한다.
   */
  async getLinkedPrototypes(offeringId: string): Promise<PrototypeResult[]> {
    const result = await this.db
      .prepare(
        `SELECT p.id, p.biz_item_id, p.version, p.format, p.content,
                p.template_used, p.model_used, p.tokens_used, p.generated_at
         FROM offering_prototypes op
         JOIN prototypes p ON p.id = op.prototype_id
         WHERE op.offering_id = ?
         ORDER BY p.version DESC`,
      )
      .bind(offeringId)
      .all<{
        id: string;
        biz_item_id: string;
        version: number;
        format: string;
        content: string;
        template_used: string | null;
        model_used: string | null;
        tokens_used: number;
        generated_at: string;
      }>();

    return (result.results ?? []).map((row) => ({
      id: row.id,
      bizItemId: row.biz_item_id,
      version: row.version,
      format: "html" as const,
      content: row.content,
      templateUsed: row.template_used ?? "idea",
      modelUsed: row.model_used,
      tokensUsed: row.tokens_used,
      generatedAt: row.generated_at,
    }));
  }
}

export class OfferingNotFoundError extends Error {
  constructor(id: string) {
    super(`Offering not found: ${id}`);
    this.name = "OfferingNotFoundError";
  }
}
