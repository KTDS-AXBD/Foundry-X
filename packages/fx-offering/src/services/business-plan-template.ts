/**
 * Sprint 58: 사업계획서 템플릿 + 매핑 로직 (F180)
 * Sprint 215: F445 — 템플릿 3종 (내부보고/제안서/IR피치) 추가
 * Discovery 분석 결과 + 평가 + 트렌드를 사업계획서 10개 섹션에 매핑
 */

import type { DiscoveryCriterion } from "./discovery-criteria.js";
import type { AnalysisContext } from "./analysis-context.js";
import type { BizItem, EvaluationWithScores } from "./biz-item-service.js";
import type { StartingPointType } from "./analysis-paths.js";

// ─── 10 섹션 정의 ───

export const BP_SECTIONS = [
  { section: 1, title: "요약 (Executive Summary)", source: "all" as const,
    description: "사업 기회·솔루션·시장·예상 성과 1페이지 요약" },
  { section: 2, title: "사업 개요 (Business Overview)", source: "meta" as const,
    description: "아이템 정의 + 분류 유형 + 배경" },
  { section: 3, title: "문제 정의 및 기회", source: [1] as const,
    description: "고객 Pain + JTBD + 시장 트렌드" },
  { section: 4, title: "솔루션 및 가치 제안", source: [4] as const,
    description: "핵심 솔루션 + 차별화된 가치" },
  { section: 5, title: "시장 분석", source: [2] as const,
    description: "TAM/SAM/SOM + 트렌드 + why now" },
  { section: 6, title: "경쟁 환경 및 차별화", source: [3, 8] as const,
    description: "경쟁사 매핑 + 포지셔닝 + 차별화 근거" },
  { section: 7, title: "사업 모델 (Revenue Model)", source: [5] as const,
    description: "과금 모델 + 유닛 이코노믹스 + WTP" },
  { section: 8, title: "실행 계획 (Go-to-Market)", source: [9] as const,
    description: "MVP 정의 + 마일스톤 + 검증 실험" },
  { section: 9, title: "리스크 및 대응 전략", source: [6, 7] as const,
    description: "핵심 가정 + 리스크 + 규제 + 완화 방안" },
  { section: 10, title: "부록 — 평가 결과", source: "evaluation" as const,
    description: "멀티 페르소나 평가 요약 + 주요 concerns" },
] as const;

// ─── 데이터 집합 인터페이스 ───

export interface BpDataBundle {
  bizItem: BizItem;
  classification: { itemType: string; confidence: number } | null;
  evaluation: EvaluationWithScores | null;
  criteria: DiscoveryCriterion[];
  contexts: AnalysisContext[];
  startingPoint: StartingPointType | null;
  trendReport: {
    marketSummary: string;
    marketSizeEstimate: unknown;
    competitors: unknown;
    trends: unknown;
  } | null;
  prdContent: string | null;
  // F443: 업로드 문서 파싱 결과 컨텍스트
  documentContext?: string[];
}

// ─── 매핑 함수 ───

export function mapDataToSections(data: BpDataBundle): Map<number, string> {
  const sections = new Map<number, string>();

  for (const sec of BP_SECTIONS) {
    const parts: string[] = [];

    if (sec.source === "all") {
      // Section 1: Executive Summary — 전체 종합
      parts.push(`**사업 아이템:** ${data.bizItem.title}`);
      if (data.bizItem.description) parts.push(data.bizItem.description);
      if (data.classification) parts.push(`**유형:** ${formatItemType(data.classification.itemType)} (신뢰도 ${(data.classification.confidence * 100).toFixed(0)}%)`);
      if (data.evaluation) parts.push(`**평가 결과:** ${formatVerdict(data.evaluation.verdict)} (평균 ${data.evaluation.avgScore.toFixed(1)}점)`);
      if (data.trendReport?.marketSummary) parts.push(`**시장 요약:** ${data.trendReport.marketSummary}`);
      if (data.startingPoint) parts.push(`**접근 방식:** ${formatStartingPoint(data.startingPoint)}`);

    } else if (sec.source === "meta") {
      // Section 2: Business Overview
      parts.push(`### 아이템 정보`);
      parts.push(`- **제목:** ${data.bizItem.title}`);
      if (data.bizItem.description) parts.push(`- **설명:** ${data.bizItem.description}`);
      parts.push(`- **출처:** ${data.bizItem.source}`);
      if (data.classification) {
        parts.push(`\n### 분류 결과`);
        parts.push(`- **유형:** ${formatItemType(data.classification.itemType)}`);
        parts.push(`- **신뢰도:** ${(data.classification.confidence * 100).toFixed(0)}%`);
      }
      if (data.startingPoint) {
        parts.push(`\n### 분석 접근`);
        parts.push(`- **시작점:** ${formatStartingPoint(data.startingPoint)}`);
      }

    } else if (sec.source === "evaluation") {
      // Section 10: 부록 — 평가 결과
      if (data.evaluation) {
        parts.push(`### 종합 평가`);
        parts.push(`- **판정:** ${formatVerdict(data.evaluation.verdict)}`);
        parts.push(`- **평균 점수:** ${data.evaluation.avgScore.toFixed(1)} / 10`);
        parts.push(`- **주요 우려사항:** ${data.evaluation.totalConcerns}건`);
        if (data.evaluation.scores.length > 0) {
          parts.push(`\n### 페르소나별 점수`);
          parts.push(`| 페르소나 | 사업성 | 전략적합 | 고객가치 | 기술시장 | 실행력 | 재무 | 경쟁 | 확장 |`);
          parts.push(`|----------|--------|----------|----------|----------|--------|------|------|------|`);
          for (const s of data.evaluation.scores) {
            parts.push(`| ${s.personaId} | ${s.businessViability} | ${s.strategicFit} | ${s.customerValue} | ${s.techMarket} | ${s.execution} | ${s.financialFeasibility} | ${s.competitiveDiff} | ${s.scalability} |`);
          }
          const allConcerns = data.evaluation.scores.flatMap(s => s.concerns);
          if (allConcerns.length > 0) {
            parts.push(`\n### 주요 Concerns`);
            for (const concern of allConcerns.slice(0, 5)) {
              parts.push(`- ${concern}`);
            }
          }
        }
      } else {
        parts.push("*평가 미실시*");
      }

    } else {
      // Sections 3~9: 기준 기반 매핑
      const criteriaIds = sec.source as readonly number[];
      for (const cId of criteriaIds) {
        const c = data.criteria.find(cr => cr.criterionId === cId);
        if (c?.evidence) {
          parts.push(`**${c.name}:**\n${c.evidence}`);
        }
      }
      // 트렌드 데이터 보강 (Section 3, 5, 6)
      if ([3, 5, 6].includes(sec.section) && data.trendReport) {
        appendTrendData(parts, sec.section, data.trendReport);
      }
      // 분석 컨텍스트 보강
      for (const ctx of data.contexts) {
        if (isContextRelevant(ctx, criteriaIds, data.criteria)) {
          parts.push(`\n> 분석 Step ${ctx.stepOrder} (${ctx.pmSkill}): ${ctx.outputText.slice(0, 300)}${ctx.outputText.length > 300 ? "..." : ""}`);
        }
      }
    }

    sections.set(sec.section, parts.length > 0 ? parts.join("\n\n") : `*${sec.description} — 데이터 수집 필요*`);
  }

  return sections;
}

// ─── F445: 템플릿 3종 정의 ───

export type TemplateType = 'internal' | 'proposal' | 'ir-pitch';
export type ToneType = 'formal' | 'casual';
export type LengthType = 'short' | 'medium' | 'long';

export interface TemplateConfig {
  name: string;
  sections: readonly number[];
  focus: string;
  defaultLength: LengthType;
}

export const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
  'internal': {
    name: '내부보고',
    sections: [1, 2, 3, 4, 5, 7, 9] as const,
    focus: '핵심 지표 + 실행 가능성',
    defaultLength: 'short',
  },
  'proposal': {
    name: '제안서',
    sections: [1, 2, 3, 4, 5, 6, 7, 8] as const,
    focus: '문제→해결→효과 구조',
    defaultLength: 'medium',
  },
  'ir-pitch': {
    name: 'IR피치',
    sections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const,
    focus: '시장→제품→비즈모델→팀 스토리',
    defaultLength: 'long',
  },
};

export function getTemplateSections(templateType: TemplateType): typeof BP_SECTIONS[number][] {
  const config = TEMPLATE_CONFIGS[templateType] ?? TEMPLATE_CONFIGS['internal'];
  return BP_SECTIONS.filter(s => (config.sections as readonly number[]).includes(s.section));
}

export function buildGenerationPrompt(
  templateType: TemplateType,
  tone: ToneType,
  length: LengthType,
): string {
  const config = TEMPLATE_CONFIGS[templateType];
  const toneStr = tone === 'formal' ? '공식적이고 전문적인 어투' : '친근하고 명확한 어투';
  const lengthStr = length === 'short' ? '간결하게 (섹션당 2~3문장)' : length === 'long' ? '풍부하게 (섹션당 5~7문장)' : '적당하게 (섹션당 3~5문장)';
  return `템플릿: ${config.name} | 포커스: ${config.focus} | 어투: ${toneStr} | 분량: ${lengthStr}`;
}

// ─── Markdown 렌더링 ───

export function renderBpMarkdown(
  bizItem: { title: string; description: string | null },
  sectionContents: Map<number, string>,
): string {
  const lines: string[] = [];
  lines.push(`# 사업계획서 초안 — ${bizItem.title}`);
  lines.push("");
  if (bizItem.description) {
    lines.push(`> ${bizItem.description}`);
    lines.push("");
  }
  lines.push(`> 자동 생성일: ${new Date().toISOString().split("T")[0]} | Foundry-X Discovery Pipeline`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const sec of BP_SECTIONS) {
    lines.push(`## ${sec.section}. ${sec.title}`);
    lines.push("");
    const content = sectionContents.get(sec.section) ?? `*${sec.description}*`;
    lines.push(content);
    lines.push("");
  }

  return lines.join("\n");
}

// ─── 헬퍼 함수 (export for testing) ───

export function formatItemType(type: string): string {
  const map: Record<string, string> = {
    type_a: "Type A (벤치마크/레퍼런스 기반)",
    type_b: "Type B (트렌드/시장 기반)",
    type_c: "Type C (고객 Pain/현장 기반)",
  };
  return map[type] ?? type;
}

export function formatVerdict(verdict: string): string {
  const map: Record<string, string> = {
    green: "🟢 Green (진행)",
    keep: "🟡 Keep (보완 후 진행)",
    red: "🔴 Red (재검토 필요)",
  };
  return map[verdict] ?? verdict;
}

function formatStartingPoint(sp: string): string {
  const map: Record<string, string> = {
    idea: "아이디어에서 시작",
    market: "시장/타겟에서 시작",
    problem: "고객 문제에서 시작",
    tech: "기술에서 시작",
    service: "기존 서비스에서 시작",
  };
  return map[sp] ?? sp;
}

function appendTrendData(
  parts: string[],
  section: number,
  trend: NonNullable<BpDataBundle["trendReport"]>,
): void {
  if (section === 3 || section === 5) {
    if (trend.marketSummary) parts.push(`\n**시장 트렌드:** ${trend.marketSummary}`);
    if (trend.marketSizeEstimate && typeof trend.marketSizeEstimate === "object") {
      const mse = trend.marketSizeEstimate as Record<string, string>;
      if (mse.tam) parts.push(`- TAM: ${mse.tam}`);
      if (mse.sam) parts.push(`- SAM: ${mse.sam}`);
      if (mse.som) parts.push(`- SOM: ${mse.som}`);
    }
    if (Array.isArray(trend.trends)) {
      for (const t of (trend.trends as Array<{ title: string; description: string }>).slice(0, 3)) {
        parts.push(`- **${t.title}:** ${t.description}`);
      }
    }
  }
  if (section === 6) {
    if (Array.isArray(trend.competitors)) {
      parts.push("\n**경쟁사 (트렌드 분석 기반):**");
      for (const comp of (trend.competitors as Array<{ name: string; description: string }>).slice(0, 5)) {
        parts.push(`- **${comp.name}:** ${comp.description}`);
      }
    }
  }
}

function isContextRelevant(
  ctx: AnalysisContext,
  criteriaIds: readonly number[],
  criteria: DiscoveryCriterion[],
): boolean {
  return criteriaIds.some(cId => {
    const c = criteria.find(cr => cr.criterionId === cId);
    return c && c.status !== "pending";
  });
}
