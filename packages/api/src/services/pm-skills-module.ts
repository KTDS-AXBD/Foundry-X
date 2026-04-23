/**
 * Sprint 60: pm-skills MethodologyModule 구현체 (F193)
 * BDP 모듈과 동일한 인터페이스, 다른 분류/분석/기준 로직
 */

import type {
  MethodologyModule, ClassificationResult, AnalysisStepDefinition,
  CriterionDefinition, GateResult, ReviewMethod,
} from "./methodology-types.js";
import { PM_SKILLS_CRITERIA, PmSkillsCriteriaService } from "../core/discovery/services/pm-skills-criteria.js";
import {
  detectEntryPoint, buildAnalysisSteps, computeSkillScores,
  ENTRY_POINT_ORDERS, type EntryPoint,
} from "./pm-skills-pipeline.js";

export class PmSkillsModule implements MethodologyModule {
  readonly id = "pm-skills";
  readonly name = "PM Skills 기반 분석";
  readonly description = "10개 PM 스킬을 순차 실행하여 사업 아이템을 분석하는 HITL 방식 방법론";
  readonly version = "1.0.0";

  async classifyItem(item: { title: string; description: string | null; source: string }): Promise<ClassificationResult> {
    const entryPoint = detectEntryPoint(item);
    const scores = computeSkillScores(item);

    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const confidence = sortedScores.slice(0, 3).reduce((sum, s) => sum + s, 0) / 3 / 100;

    return {
      methodologyId: this.id,
      entryPoint,
      confidence: Math.min(confidence, 0.95),
      reasoning: `진입 유형: ${entryPoint} — 스킬 적합도 상위 3개 평균 ${(confidence * 100).toFixed(0)}%`,
      metadata: { skillScores: scores, recommendedSkills: ENTRY_POINT_ORDERS[entryPoint] },
    };
  }

  getAnalysisSteps(classification: ClassificationResult): AnalysisStepDefinition[] {
    const entryPoint = (classification.entryPoint as EntryPoint) ?? "discovery";
    const steps = buildAnalysisSteps(entryPoint);

    return steps.map(step => ({
      order: step.order,
      activity: `${step.name} — ${step.purpose}`,
      skills: [step.skill],
      criteriaMapping: step.criteriaMapping,
      isRequired: step.order <= 5,
    }));
  }

  getCriteria(): CriterionDefinition[] {
    return PM_SKILLS_CRITERIA;
  }

  async checkGate(bizItemId: string, db: D1Database): Promise<GateResult> {
    const service = new PmSkillsCriteriaService(db);
    return service.checkGate(bizItemId);
  }

  getReviewMethods(): ReviewMethod[] {
    return [
      { id: "cross-validation", name: "스킬 산출물 교차 검증",
        description: "가치 제안 ↔ 경쟁 차별화 ↔ 수익 모델 간 논리적 일관성 검토",
        type: "cross_validation" },
      { id: "feasibility-check", name: "실행 가능성 검증",
        description: "전략 → 비치헤드 → 검증 실험 간 연결고리 + KT DS 역량 매칭",
        type: "manual" },
    ];
  }

  matchScore(item: { title: string; description: string | null; source: string; classification?: { itemType: string } }): number {
    const text = `${item.title} ${item.description ?? ""}`.toLowerCase();

    let score = 40;

    const hitlKeywords = ["분석", "스킬", "검토", "기획", "pm", "발굴"];
    score += hitlKeywords.filter(k => text.includes(k)).length * 8;

    const ambiguousKeywords = ["새로운", "탐색", "가능성", "아직", "초기"];
    score += ambiguousKeywords.filter(k => text.includes(k)).length * 6;

    if (!item.classification) score += 10;

    return Math.min(score, 100);
  }
}

// ─── 모듈 등록 (app 초기화 시 호출) ───

import { registerMethodology } from "./methodology-types.js";

export function registerPmSkillsModule(): void {
  const module = new PmSkillsModule();
  registerMethodology({
    id: module.id,
    name: module.name,
    description: module.description,
    version: module.version,
    isDefault: false,
    matchScore: (item) => module.matchScore(item),
    module,
  });
}
