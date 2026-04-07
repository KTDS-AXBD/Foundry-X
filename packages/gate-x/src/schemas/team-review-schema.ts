/**
 * Sprint 154: F342 팀 검토 투표 스키마
 * Sprint 154+: F349 팀장 최종결정 스키마 추가
 */
import { z } from "zod";

export const SubmitTeamReviewSchema = z.object({
  decision: z.enum(["Go", "Hold", "Drop"]),
  comment: z.string().nullable().default(null),
});

export type SubmitTeamReviewInput = z.infer<typeof SubmitTeamReviewSchema>;

export const TeamDecideSchema = z.object({
  finalDecision: z.enum(["Go", "Hold", "Drop"]),
  reason: z.string().min(1, "결정 사유를 입력해주세요"),
});

export type TeamDecideInput = z.infer<typeof TeamDecideSchema>;
