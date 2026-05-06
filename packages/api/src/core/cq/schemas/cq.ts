import { z } from "zod";
import { CQ_AXES, REVIEW_CYCLE_STAGES } from "../types.js";

export const CQAxisSchema = z.enum(CQ_AXES);
export const HandoffDecisionSchema = z.enum(["handoff", "human_review"]);
export const ReviewCycleStageSchema = z.enum(REVIEW_CYCLE_STAGES);

export const RegisterCQSchema = z.object({
  orgId: z.string().min(1),
  questionText: z.string().min(1).max(2000),
  answerText: z.string().min(1).max(10000),
  author: z.string().min(1),
});

export const EvaluateCQSchema = z.object({
  orgId: z.string().min(1),
  questionId: z.string().min(1),
  llmCallContext: z.object({
    sessionId: z.string(),
    response: z.string(),
    toolCalls: z.array(z.unknown()).optional(),
  }),
});

export const CQEvaluationResponseSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  questionId: z.string(),
  axisScores: z.record(
    CQAxisSchema,
    z.object({
      axis: CQAxisSchema,
      rawScore: z.number(),
      weighted: z.number(),
      reasoning: z.string(),
    }),
  ),
  totalScore: z.number(),
  handoffDecision: HandoffDecisionSchema,
  evaluatedAt: z.number(),
});

export const StartReviewCycleSchema = z.object({
  orgId: z.string().min(1),
  cqEvaluationId: z.string().optional(),
  initialContent: z.string().min(1),
});
