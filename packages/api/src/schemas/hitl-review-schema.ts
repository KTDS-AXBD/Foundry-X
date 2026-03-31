import { z } from "zod";

export const submitReviewSchema = z
  .object({
    artifactId: z.string().min(1),
    action: z.enum(["approved", "modified", "regenerated", "rejected"]),
    reason: z.string().optional(),
    modifiedContent: z.string().optional(),
  })
  .refine(
    (data) => data.action !== "rejected" || (data.reason && data.reason.length > 0),
    { message: "reason is required when action is rejected", path: ["reason"] },
  )
  .refine(
    (data) => data.action !== "modified" || (data.modifiedContent && data.modifiedContent.length > 0),
    { message: "modifiedContent is required when action is modified", path: ["modifiedContent"] },
  );

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export interface HitlReview {
  id: string;
  tenantId: string;
  artifactId: string;
  reviewerId: string;
  action: "approved" | "modified" | "regenerated" | "rejected";
  reason: string | null;
  modifiedContent: string | null;
  previousVersion: string | null;
  createdAt: string;
}
