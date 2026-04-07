/**
 * Sprint 53: PRD 템플릿 + 매핑 로직 (F185)
 * 9기준 evidence + 분석 컨텍스트를 PRD 섹션에 매핑
 */

import type { DiscoveryCriterion } from "../../discovery/services/discovery-criteria.js";
import type { AnalysisContext } from "../../discovery/services/analysis-context.js";

export const PRD_SECTIONS = [
  { section: 1, title: "요약 (Executive Summary)", criteriaSource: "all" as const, description: "전체 분석 결과를 1페이지 요약" },
  { section: 2, title: "문제 정의", criteriaSource: [1] as const, description: "고객 세그먼트 + JTBD + Pain Point" },
  { section: 3, title: "타겟 고객", criteriaSource: [1] as const, description: "페르소나 + 세그먼트 프로필" },
  { section: 4, title: "시장 기회", criteriaSource: [2] as const, description: "TAM/SAM/SOM + 성장률 + why now" },
  { section: 5, title: "경쟁 환경 및 차별화", criteriaSource: [3, 8] as const, description: "경쟁사 + 포지셔닝 + 차별화 근거" },
  { section: 6, title: "가치 제안", criteriaSource: [4] as const, description: "JTBD 문장 + 핵심 차별화" },
  { section: 7, title: "수익 구조", criteriaSource: [5] as const, description: "과금 모델 + 유닛 이코노믹스" },
  { section: 8, title: "리스크 및 제약", criteriaSource: [6, 7] as const, description: "리스크 목록 + 규제 + 대응" },
  { section: 9, title: "검증 계획", criteriaSource: [9] as const, description: "실험 3개+ + 판단 기준" },
  { section: 10, title: "오픈 이슈", criteriaSource: "derived" as const, description: "미충족/보완 필요 항목" },
] as const;

export function mapCriteriaToSections(
  criteria: DiscoveryCriterion[],
  contexts: AnalysisContext[],
): Map<number, string> {
  const sectionContents = new Map<number, string>();

  for (const sec of PRD_SECTIONS) {
    const parts: string[] = [];

    if (sec.criteriaSource === "all") {
      // Executive summary — gather all evidence
      for (const c of criteria) {
        if (c.evidence) {
          parts.push(`**${c.name}**: ${c.evidence}`);
        }
      }
      if (contexts.length > 0) {
        parts.push("\n**분석 컨텍스트 요약:**");
        for (const ctx of contexts) {
          parts.push(`- Step ${ctx.stepOrder} (${ctx.pmSkill}): ${ctx.outputText.slice(0, 200)}...`);
        }
      }
    } else if (sec.criteriaSource === "derived") {
      // Open issues — criteria that are not completed
      const missing = criteria.filter((c) => c.status !== "completed");
      if (missing.length > 0) {
        for (const c of missing) {
          parts.push(`- **${c.name}** (${c.status}): ${c.condition}`);
        }
      } else {
        parts.push("모든 Discovery 기준이 충족되었습니다.");
      }
    } else {
      // Map specific criteria to sections
      for (const criterionId of sec.criteriaSource) {
        const c = criteria.find((cr) => cr.criterionId === criterionId);
        if (c?.evidence) {
          parts.push(c.evidence);
        }
      }
      // Add relevant analysis contexts
      for (const ctx of contexts) {
        // Check if this context's skill relates to this section's criteria
        const relatedCriteria = sec.criteriaSource as readonly number[];
        if (relatedCriteria.some((cId) => {
          const c = criteria.find((cr) => cr.criterionId === cId);
          return c && c.status !== "pending";
        })) {
          // Include context if its step maps to one of these criteria
          // Simple heuristic: include all contexts for now
        }
      }
    }

    sectionContents.set(sec.section, parts.length > 0 ? parts.join("\n\n") : `*${sec.description} — 데이터 없음*`);
  }

  return sectionContents;
}

export function renderPrdMarkdown(
  bizItem: { title: string; description: string | null },
  sectionContents: Map<number, string>,
): string {
  const lines: string[] = [];
  lines.push(`# PRD — ${bizItem.title}`);
  lines.push("");
  if (bizItem.description) {
    lines.push(`> ${bizItem.description}`);
    lines.push("");
  }
  lines.push(`> 생성일: ${new Date().toISOString().split("T")[0]}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const sec of PRD_SECTIONS) {
    lines.push(`## ${sec.section}. ${sec.title}`);
    lines.push("");
    const content = sectionContents.get(sec.section) ?? `*${sec.description}*`;
    lines.push(content);
    lines.push("");
  }

  return lines.join("\n");
}
