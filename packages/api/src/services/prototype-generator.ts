/**
 * Sprint 58: Prototype 자동 생성 서비스 (F181)
 */

import type { AgentRunner } from "../core/agent/services/agent-runner.js";
import type { BizItem, EvaluationWithScores } from "../core/discovery/services/biz-item-service.js";
import type { DiscoveryCriterion } from "../core/discovery/services/discovery-criteria.js";
import type { StartingPointType } from "../core/discovery/services/analysis-paths.js";
import type { GeneratedPrd } from "../core/offering/services/prd-generator.js";
import { renderPrototypeHtml, type PrototypeData } from "./prototype-templates.js";
import { flattenTokens, type DesignTokenOverride } from "./prototype-styles.js";

export interface PrototypeGenerationInput {
  bizItemId: string;
  bizItem: BizItem;
  evaluation: EvaluationWithScores | null;
  criteria: DiscoveryCriterion[];
  startingPoint: StartingPointType;
  trendReport: { marketSummary: string; marketSizeEstimate: unknown; competitors: unknown; trends: unknown } | null;
  prd: GeneratedPrd | null;
  businessPlan: { content: string } | null;
  template?: StartingPointType;
  offeringId?: string;  // F465: Offering의 DesignToken을 Prototype에 적용
}

export interface PrototypeResult {
  id: string;
  bizItemId: string;
  version: number;
  format: "html";
  content: string;
  templateUsed: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}

interface ProtoRow {
  id: string;
  biz_item_id: string;
  version: number;
  format: string;
  content: string;
  template_used: string | null;
  model_used: string | null;
  tokens_used: number;
  generated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toProto(row: ProtoRow): PrototypeResult {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    version: row.version,
    format: "html",
    content: row.content,
    templateUsed: row.template_used ?? "idea",
    modelUsed: row.model_used,
    tokensUsed: row.tokens_used,
    generatedAt: row.generated_at,
  };
}

export class PrototypeGeneratorService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner | null,
  ) {}

  async generate(input: PrototypeGenerationInput): Promise<PrototypeResult> {
    // 1. 데이터 → PrototypeData 변환
    const protoData = this.extractPrototypeData(input);
    const templateType = input.template ?? input.startingPoint;

    // F465: Offering의 DesignToken 조회 → Prototype 스타일에 적용
    let tokenOverride: DesignTokenOverride | undefined;
    if (input.offeringId) {
      try {
        const { results } = await this.db
          .prepare("SELECT token_key, token_value, token_category FROM offering_design_tokens WHERE offering_id = ?")
          .bind(input.offeringId)
          .all<{ token_key: string; token_value: string; token_category: string }>();
        if (results.length > 0) {
          const json: Record<string, Record<string, string>> = {};
          for (const r of results) {
            if (!json[r.token_category]) json[r.token_category] = {};
            json[r.token_category]![r.token_key] = r.token_value;
          }
          tokenOverride = flattenTokens(json);
        }
      } catch {
        // 토큰 조회 실패 시 기본 스타일로 폴백
      }
    }

    // 2. HTML 렌더링 (토큰이 있으면 적용)
    const content = renderPrototypeHtml(protoData, templateType, tokenOverride);

    // 3. 버전
    const latestRow = await this.db
      .prepare("SELECT MAX(version) as max_ver FROM prototypes WHERE biz_item_id = ?")
      .bind(input.bizItemId)
      .first<{ max_ver: number | null }>();
    const nextVersion = (latestRow?.max_ver ?? 0) + 1;

    // 4. 저장
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO prototypes (id, biz_item_id, version, format, content, template_used, model_used, tokens_used, generated_at)
         VALUES (?, ?, ?, 'html', ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.bizItemId, nextVersion, content, templateType, null, 0, now)
      .run();

    return {
      id,
      bizItemId: input.bizItemId,
      version: nextVersion,
      format: "html",
      content,
      templateUsed: templateType,
      modelUsed: null,
      tokensUsed: 0,
      generatedAt: now,
    };
  }

  extractPrototypeData(input: PrototypeGenerationInput): PrototypeData {
    const item = input.bizItem;
    const eval_ = input.evaluation;

    // 문제 정의 (Criterion 1)
    const c1 = input.criteria.find(c => c.criterionId === 1);
    const problemStatement = c1?.evidence ?? item.description ?? "고객이 겪는 핵심 문제를 정의합니다.";

    // 가치 제안 (Criterion 4)
    const c4 = input.criteria.find(c => c.criterionId === 4);
    const tagline = c4?.evidence?.split("\n")[0] ?? `${item.title} — 새로운 가능성`;

    // 솔루션 (Criterion 4 + PRD)
    const solutionOverview = c4?.evidence ?? "혁신적인 솔루션으로 문제를 해결합니다.";

    // 기능 카드
    const features = this.extractFeatures(input);

    // 시장 통계
    const marketStats = this.extractMarketStats(input);

    // 경쟁사
    const competitors = this.extractCompetitors(input);

    // 페르소나 인용
    const personaQuotes = this.extractPersonaQuotes(input);

    return {
      title: item.title,
      tagline,
      problemStatement,
      solutionOverview,
      features,
      marketStats,
      competitors,
      evaluationSummary: eval_
        ? `전문가 ${eval_.scores.length}인 평가 평균 ${eval_.avgScore.toFixed(1)}점`
        : "평가 대기 중",
      personaQuotes,
      verdict: eval_?.verdict ?? "default",
      avgScore: eval_?.avgScore ?? 0,
      ctaText: "자세히 알아보기",
    };
  }

  private extractFeatures(input: PrototypeGenerationInput): PrototypeData["features"] {
    const defaults = [
      { title: "핵심 기능 1", description: "고객 Pain Point를 직접 해결하는 기능" },
      { title: "핵심 기능 2", description: "차별화된 가치를 제공하는 기능" },
      { title: "핵심 기능 3", description: "확장 가능한 플랫폼 기능" },
    ];
    const c4 = input.criteria.find(c => c.criterionId === 4);
    if (c4?.evidence) {
      const lines = c4.evidence.split("\n").filter(l => l.trim().startsWith("-"));
      if (lines.length >= 2) {
        return lines.slice(0, 3).map((l, i) => ({
          title: `핵심 기능 ${i + 1}`,
          description: l.replace(/^-\s*/, "").trim(),
        }));
      }
    }
    return defaults;
  }

  private extractMarketStats(input: PrototypeGenerationInput): PrototypeData["marketStats"] {
    const stats: PrototypeData["marketStats"] = [];
    if (input.trendReport?.marketSizeEstimate && typeof input.trendReport.marketSizeEstimate === "object") {
      const mse = input.trendReport.marketSizeEstimate as Record<string, string>;
      if (mse.tam) stats.push({ label: "TAM", value: mse.tam });
      if (mse.sam) stats.push({ label: "SAM", value: mse.sam });
      if (mse.som) stats.push({ label: "SOM", value: mse.som });
    }
    if (stats.length === 0) {
      stats.push({ label: "시장 규모", value: "분석 필요" });
    }
    return stats;
  }

  private extractCompetitors(input: PrototypeGenerationInput): string[] {
    if (Array.isArray(input.trendReport?.competitors)) {
      return (input.trendReport!.competitors as Array<{ name: string }>).slice(0, 5).map(c => c.name);
    }
    return [];
  }

  private extractPersonaQuotes(input: PrototypeGenerationInput): PrototypeData["personaQuotes"] {
    if (!input.evaluation?.scores) return [];
    return input.evaluation.scores
      .filter(s => s.summary)
      .slice(0, 3)
      .map(s => ({ persona: s.personaId, quote: s.summary ?? "" }));
  }

  async getLatest(bizItemId: string): Promise<PrototypeResult | null> {
    const row = await this.db
      .prepare("SELECT * FROM prototypes WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId)
      .first<ProtoRow>();
    return row ? toProto(row) : null;
  }

  async getLatestContent(bizItemId: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT content FROM prototypes WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId)
      .first<{ content: string }>();
    return row?.content ?? null;
  }
}
