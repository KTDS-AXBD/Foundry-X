/**
 * Sprint 154: F342 팀 검토 투표 스키마
 */
import { z } from "zod";

export const SubmitTeamReviewSchema = z.object({
  decision: z.enum(["Go", "Hold", "Drop"]),
  comment: z.string().nullable().default(null),
});

export type SubmitTeamReviewInput = z.infer<typeof SubmitTeamReviewSchema>;
