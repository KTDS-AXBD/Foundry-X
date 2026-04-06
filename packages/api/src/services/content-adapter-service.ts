/**
 * F378: Content Adapter Service — 3가지 톤 변환 (Sprint 171)
 *
 * DiscoveryReport 데이터를 기반으로 Offering 섹션 콘텐츠를 목적별 톤으로 변환한다.
 * - executive: 경영진 보고용 (핵심 수치, ROI, 전략)
 * - technical: 기술 제안용 (아키텍처, 구현 상세)
 * - critical: 심사/검토용 (리스크, 한계, 대안)
 */

import type { AdaptTone, AdaptResult } from "../schemas/content-adapter.schema.js";

interface OfferingRow {
  id: string;
  org_id: string;
  biz_item_id: string;
  title: string;
}

interface SectionRow {
  id: string;
  offering_id: string;
  section_key: string;
  title: string;
  content: string | null;
  sort_order: number;
}

interface ReportRow {
  report_json: string;
  overall_verdict: string | null;
  team_decision: string | null;
}

interface ArtifactRow {
  stage_id: string;
  output_text: string | null;
}

interface BizItemRow {
  id: string;
  title: string;
  description: string | null;
  discovery_type: string | null;
}

/** 섹션별 톤 변환 전략 — 각 섹션 키에 대해 톤별 콘텐츠 생성 방향을 정의 */
const TONE_STRATEGIES: Record<string, Record<AdaptTone, (data: DiscoveryData) => string>> = {
  exec_summary: {
    executive: (d) =>
      `## Executive Summary\n\n${d.title}은(는) ${d.verdict ?? "검토 중인"} 사업 기회로, ` +
      `${d.marketInfo}의 시장 잠재력을 보유하고 있습니다.\n\n` +
      `**핵심 판단:** ${d.teamDecision ?? "미결정"}\n\n${d.keyFindings}`,
    technical: (d) =>
      `## Technical Overview\n\n${d.title} 프로젝트의 기술적 접근 방향입니다.\n\n` +
      `**기술 스택 및 아키텍처:**\n${d.technicalDetails}\n\n` +
      `**데이터 흐름:**\n${d.dataFlow}`,
    critical: (d) =>
      `## Critical Review\n\n${d.title}에 대한 객관적 검토 결과입니다.\n\n` +
      `**종합 판정:** ${d.verdict ?? "미평가"}\n\n` +
      `**주요 리스크:**\n${d.risks}\n\n**한계 및 대안:**\n${d.limitations}`,
  },
  s01: {
    executive: (d) =>
      `## 추진 배경 및 목적\n\n${d.background}\n\n**전략적 필요성:** ${d.strategicNeed}`,
    technical: (d) =>
      `## 추진 배경 및 목적\n\n${d.background}\n\n**기술적 동인:** ${d.technicalDriver}`,
    critical: (d) =>
      `## 추진 배경 및 목적\n\n${d.background}\n\n**검증 필요 가정:** ${d.assumptions}`,
  },
  s02: {
    executive: (d) =>
      `## 사업기회 점검\n\n**시장 규모:** ${d.marketInfo}\n**성장률:** ${d.growthRate}\n` +
      `**핵심 기회:** ${d.opportunity}`,
    technical: (d) =>
      `## 사업기회 점검\n\n**기술 트렌드:** ${d.techTrends}\n` +
      `**기술 성숙도:** ${d.techMaturity}\n**경쟁 기술:** ${d.competitorTech}`,
    critical: (d) =>
      `## 사업기회 점검\n\n**진입 장벽:** ${d.barriers}\n` +
      `**경쟁 환경:** ${d.competition}\n**불확실성:** ${d.uncertainties}`,
  },
  s03: {
    executive: (d) =>
      `## 제안 방향\n\n**수익 모델:** ${d.revenueModel}\n` +
      `**예상 ROI:** ${d.roi}\n**차별화 포인트:** ${d.differentiator}`,
    technical: (d) =>
      `## 제안 방향\n\n**솔루션 아키텍처:**\n${d.architecture}\n` +
      `**핵심 기술 요소:**\n${d.coreTech}`,
    critical: (d) =>
      `## 제안 방향\n\n**대안 분석:**\n${d.alternatives}\n` +
      `**실현 가능성 평가:** ${d.feasibility}`,
  },
  s04: {
    executive: (d) =>
      `## 추진 계획\n\n**투자 규모:** ${d.investment}\n` +
      `**예상 성과:** ${d.expectedOutcome}\n**일정:** ${d.timeline}`,
    technical: (d) =>
      `## 추진 계획\n\n**구현 로드맵:**\n${d.roadmap}\n` +
      `**리소스 요건:**\n${d.resources}`,
    critical: (d) =>
      `## 추진 계획\n\n**이행 리스크:**\n${d.implementRisks}\n` +
      `**의존성 및 제약:**\n${d.constraints}`,
  },
};

/** Discovery 데이터 구조 — ReportJSON + Stage 산출물에서 추출 */
interface DiscoveryData {
  title: string;
  verdict: string | null;
  teamDecision: string | null;
  marketInfo: string;
  growthRate: string;
  opportunity: string;
  keyFindings: string;
  technicalDetails: string;
  dataFlow: string;
  risks: string;
  limitations: string;
  background: string;
  strategicNeed: string;
  technicalDriver: string;
  assumptions: string;
  techTrends: string;
  techMaturity: string;
  competitorTech: string;
  barriers: string;
  competition: string;
  uncertainties: string;
  revenueModel: string;
  roi: string;
  differentiator: string;
  architecture: string;
  coreTech: string;
  alternatives: string;
  feasibility: string;
  investment: string;
  expectedOutcome: string;
  timeline: string;
  roadmap: string;
  resources: string;
  implementRisks: string;
  constraints: string;
}

function extractField(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "object" && val !== null) return JSON.stringify(val).slice(0, 500);
  }
  return "(데이터 수집 중)";
}

function buildDiscoveryData(
  title: string,
  reportJson: Record<string, unknown>,
  artifacts: ArtifactRow[],
  verdict: string | null,
  teamDecision: string | null,
): DiscoveryData {
  const stageTexts = artifacts
    .filter((a) => a.output_text)
    .reduce(
      (acc, a) => {
        acc[a.stage_id] = a.output_text!;
        return acc;
      },
      {} as Record<string, string>,
    );

  return {
    title,
    verdict,
    teamDecision,
    marketInfo: extractField(reportJson, "market_size", "tam", "market"),
    growthRate: extractField(reportJson, "growth_rate", "cagr", "growth"),
    opportunity: extractField(reportJson, "opportunity", "key_opportunity"),
    keyFindings: extractField(reportJson, "key_findings", "summary", "findings"),
    technicalDetails: extractField(reportJson, "tech_stack", "technology", "technical"),
    dataFlow: extractField(reportJson, "data_flow", "architecture", "data"),
    risks: extractField(reportJson, "risks", "risk_factors", "concerns"),
    limitations: extractField(reportJson, "limitations", "constraints", "weaknesses"),
    background: extractField(reportJson, "background", "context", "problem"),
    strategicNeed: extractField(reportJson, "strategic_need", "strategic_fit"),
    technicalDriver: extractField(reportJson, "tech_driver", "innovation"),
    assumptions: extractField(reportJson, "assumptions", "hypotheses"),
    techTrends: extractField(reportJson, "trends", "tech_trends"),
    techMaturity: extractField(reportJson, "maturity", "trl"),
    competitorTech: extractField(reportJson, "competitor_tech", "competitors"),
    barriers: extractField(reportJson, "barriers", "entry_barriers"),
    competition: extractField(reportJson, "competition", "competitive_landscape"),
    uncertainties: extractField(reportJson, "uncertainties", "unknowns"),
    revenueModel: extractField(reportJson, "revenue_model", "business_model"),
    roi: extractField(reportJson, "roi", "expected_roi"),
    differentiator: extractField(reportJson, "differentiator", "unique_value"),
    architecture: stageTexts["2-3"] ?? extractField(reportJson, "architecture"),
    coreTech: stageTexts["2-2"] ?? extractField(reportJson, "core_technology"),
    alternatives: extractField(reportJson, "alternatives", "alt_approaches"),
    feasibility: extractField(reportJson, "feasibility", "viability"),
    investment: extractField(reportJson, "investment", "budget", "cost"),
    expectedOutcome: extractField(reportJson, "expected_outcome", "targets"),
    timeline: extractField(reportJson, "timeline", "schedule", "milestones"),
    roadmap: stageTexts["2-7"] ?? extractField(reportJson, "roadmap"),
    resources: extractField(reportJson, "resources", "team", "hr"),
    implementRisks: extractField(reportJson, "implement_risks", "execution_risks"),
    constraints: extractField(reportJson, "constraints", "dependencies"),
  };
}

export class ContentAdapterService {
  constructor(private db: D1Database) {}

  /** DiscoveryReport 데이터를 기반으로 Offering 섹션 콘텐츠를 톤 변환 */
  async adaptSections(
    orgId: string,
    offeringId: string,
    tone: AdaptTone,
    sectionKeys?: string[],
  ): Promise<AdaptResult[]> {
    const results = await this.generateAdaptedContent(orgId, offeringId, tone, sectionKeys);

    // DB에 실제 반영
    for (const r of results) {
      await this.db
        .prepare(
          "UPDATE offering_sections SET content = ?, updated_at = datetime('now') WHERE offering_id = ? AND section_key = ?",
        )
        .bind(r.content, offeringId, r.sectionKey)
        .run();
    }

    return results;
  }

  /** 프리뷰 전용 — DB 저장 없이 변환 결과만 반환 */
  async previewAdapt(
    orgId: string,
    offeringId: string,
    tone: AdaptTone,
  ): Promise<AdaptResult[]> {
    return this.generateAdaptedContent(orgId, offeringId, tone);
  }

  private async generateAdaptedContent(
    orgId: string,
    offeringId: string,
    tone: AdaptTone,
    sectionKeys?: string[],
  ): Promise<AdaptResult[]> {
    // 1. Offering 조회
    const offering = await this.db
      .prepare("SELECT * FROM offerings WHERE id = ? AND org_id = ?")
      .bind(offeringId, orgId)
      .first<OfferingRow>();
    if (!offering) throw new Error("Offering not found");

    // 2. DiscoveryReport 조회
    const report = await this.db
      .prepare("SELECT report_json, overall_verdict, team_decision FROM ax_discovery_reports WHERE item_id = ?")
      .bind(offering.biz_item_id)
      .first<ReportRow>();

    const reportJson: Record<string, unknown> = report?.report_json
      ? (JSON.parse(report.report_json) as Record<string, unknown>)
      : {};

    // 3. 발굴 산출물 조회 (bd_artifacts 테이블)
    const artifacts = await this.db
      .prepare("SELECT stage_id, output_text FROM bd_artifacts WHERE biz_item_id = ? ORDER BY stage_id")
      .bind(offering.biz_item_id)
      .all<ArtifactRow>();

    // 4. BizItem 제목 조회
    const bizItem = await this.db
      .prepare("SELECT id, title, description FROM biz_items WHERE id = ?")
      .bind(offering.biz_item_id)
      .first<BizItemRow>();

    const title = bizItem?.title ?? offering.title;

    // 5. Discovery 데이터 구성
    const data = buildDiscoveryData(
      title,
      reportJson,
      artifacts.results,
      report?.overall_verdict ?? null,
      report?.team_decision ?? null,
    );

    // 6. 섹션 조회
    const sections = await this.db
      .prepare("SELECT id, offering_id, section_key, title, content, sort_order FROM offering_sections WHERE offering_id = ? ORDER BY sort_order")
      .bind(offeringId)
      .all<SectionRow>();

    // 7. 톤 변환
    const results: AdaptResult[] = [];
    for (const section of sections.results) {
      if (sectionKeys && !sectionKeys.includes(section.section_key)) continue;

      const strategy = TONE_STRATEGIES[section.section_key];
      if (strategy && strategy[tone]) {
        results.push({
          sectionKey: section.section_key,
          title: section.title,
          content: strategy[tone](data),
        });
      } else {
        // 전략이 없는 섹션은 기본 톤 헤더 + 기존 콘텐츠 유지
        const toneLabel =
          tone === "executive" ? "경영진 보고" : tone === "technical" ? "기술 제안" : "검토/심사";
        results.push({
          sectionKey: section.section_key,
          title: section.title,
          content:
            section.content ??
            `## ${section.title}\n\n*[${toneLabel} 관점] 콘텐츠 생성 대기 중*`,
        });
      }
    }

    return results;
  }
}
