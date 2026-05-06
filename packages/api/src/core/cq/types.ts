export const CQ_AXES = [
  "ontology_usage",
  "tool_selection",
  "code_quality",
  "result_match",
  "governance",
] as const;

export type CQAxis = (typeof CQ_AXES)[number];

export const CQ_AXIS_WEIGHTS: Record<CQAxis, number> = {
  ontology_usage: 25,
  tool_selection: 20,
  code_quality: 15,
  result_match: 30,
  governance: 10,
};

export interface AxisScore {
  axis: CQAxis;
  rawScore: number;
  weighted: number;
  reasoning: string;
}

export type CQHandoffDecision = "handoff" | "human_review";

export interface CQEvaluationResult {
  id: string;
  orgId: string;
  questionId: string;
  axisScores: Record<CQAxis, AxisScore>;
  totalScore: number;
  handoffDecision: CQHandoffDecision;
  evaluatedAt: number;
}

export const REVIEW_CYCLE_STAGES = [
  "ai_initial_80",
  "self_eval",
  "human_intensive_20",
  "ai_refinement_80",
] as const;

export type ReviewCycleStage = (typeof REVIEW_CYCLE_STAGES)[number];

export interface ReviewCycleResult {
  cycleId: string;
  orgId: string;
  stages: {
    stage: ReviewCycleStage;
    content: string;
    status: string;
    durationMs: number | null;
  }[];
  finalContent: string;
}

export { CQEvaluator } from "./services/cq-evaluator.service.js";
export { ReviewCycle } from "./services/review-cycle.service.js";
export * from "./schemas/cq.js";
