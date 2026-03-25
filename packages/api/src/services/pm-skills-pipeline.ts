/**
 * Sprint 60: pm-skills 실행 파이프라인 (F193)
 * 스킬 의존 관계 기반 실행 순서 추천
 */

import { PM_SKILLS_GUIDES, type PmSkillGuide } from "./pm-skills-guide.js";

// ─── 스킬 의존 관계 그래프 ───

export const SKILL_DEPENDENCIES: Record<string, string[]> = {
  "/interview": [],
  "/research-users": [],
  "/market-scan": [],
  "/brainstorm": [],
  "/competitive-analysis": ["/market-scan"],
  "/value-proposition": ["/interview", "/competitive-analysis"],
  "/business-model": ["/value-proposition"],
  "/beachhead-segment": ["/research-users", "/market-scan"],
  "/pre-mortem": ["/strategy"],
  "/strategy": ["/value-proposition", "/competitive-analysis"],
};

// ─── 진입 유형별 추천 순서 ───

export type EntryPoint = "discovery" | "validation" | "expansion";

export const ENTRY_POINT_ORDERS: Record<EntryPoint, string[]> = {
  discovery: [
    "/interview", "/research-users", "/market-scan",
    "/competitive-analysis", "/value-proposition",
    "/business-model", "/pre-mortem", "/strategy", "/beachhead-segment",
  ],
  validation: [
    "/pre-mortem", "/interview", "/competitive-analysis",
    "/value-proposition", "/strategy",
  ],
  expansion: [
    "/market-scan", "/competitive-analysis", "/beachhead-segment",
    "/business-model", "/strategy",
  ],
};

// ─── 진입 유형 판별 ───

export function detectEntryPoint(item: { title: string; description: string | null }): EntryPoint {
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();

  const validationKeywords = ["검증", "가설", "테스트", "확인", "피봇", "pivot", "validate"];
  if (validationKeywords.some(k => text.includes(k))) return "validation";

  const expansionKeywords = ["확장", "기존", "서비스", "운영", "업그레이드", "마이그레이션", "expand"];
  if (expansionKeywords.some(k => text.includes(k))) return "expansion";

  return "discovery";
}

// ─── 분석 단계 생성 ───

export interface PmSkillAnalysisStep {
  order: number;
  skill: string;
  name: string;
  purpose: string;
  dependencies: string[];
  criteriaMapping: number[];
  isCompleted: boolean;
}

export function buildAnalysisSteps(
  entryPoint: EntryPoint,
  completedSkills: string[] = [],
): PmSkillAnalysisStep[] {
  const skillOrder = ENTRY_POINT_ORDERS[entryPoint];
  return skillOrder.map((skill, idx) => {
    const guide = PM_SKILLS_GUIDES.find(g => g.skill === skill);
    return {
      order: idx + 1,
      skill,
      name: guide?.name ?? skill,
      purpose: guide?.purpose ?? "",
      dependencies: SKILL_DEPENDENCIES[skill] ?? [],
      criteriaMapping: guide?.relatedCriteria ?? [],
      isCompleted: completedSkills.includes(skill),
    };
  });
}

// ─── 다음 실행 가능 스킬 추천 ───

export function getNextExecutableSkills(
  entryPoint: EntryPoint,
  completedSkills: string[],
): string[] {
  const order = ENTRY_POINT_ORDERS[entryPoint];
  return order.filter(skill => {
    if (completedSkills.includes(skill)) return false;
    const deps = SKILL_DEPENDENCIES[skill] ?? [];
    return deps.every(dep => completedSkills.includes(dep));
  });
}

// ─── 스킬 적합도 계산 ───

export function computeSkillScores(
  item: { title: string; description: string | null },
): Record<string, number> {
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
  const scores: Record<string, number> = {};

  for (const guide of PM_SKILLS_GUIDES) {
    let score = 50;

    const keywords: Record<string, string[]> = {
      "/interview": ["고객", "인터뷰", "pain", "문제", "니즈", "jtbd"],
      "/research-users": ["세그먼트", "사용자", "타겟", "페르소나"],
      "/market-scan": ["시장", "규모", "트렌드", "tam", "sam"],
      "/competitive-analysis": ["경쟁", "차별화", "포지셔닝"],
      "/value-proposition": ["가치", "제안", "솔루션"],
      "/business-model": ["수익", "비즈니스", "모델", "과금", "bmc"],
      "/pre-mortem": ["리스크", "실패", "검증"],
      "/strategy": ["전략", "우선순위", "로드맵"],
      "/brainstorm": ["아이디어", "발산", "use case"],
      "/beachhead-segment": ["비치헤드", "진입", "초기 시장"],
    };

    const skillKeywords = keywords[guide.skill] ?? [];
    const matchCount = skillKeywords.filter(k => text.includes(k)).length;
    score += matchCount * 15;

    scores[guide.skill] = Math.min(score, 100);
  }

  return scores;
}
