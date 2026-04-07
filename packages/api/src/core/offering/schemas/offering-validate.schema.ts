/**
 * F373: Offering Validate Zod Schemas (Sprint 168)
 */
import { z } from "zod";

export const ValidateOfferingSchema = z.object({
  mode: z.enum(["full", "quick"]).default("full"),
});
export type ValidateOfferingInput = z.infer<typeof ValidateOfferingSchema>;

export type ValidationMode = "full" | "quick";
export type ValidationStatus = "running" | "passed" | "failed" | "error";

export interface OfferingValidation {
  id: string;
  offeringId: string;
  orgId: string;
  mode: ValidationMode;
  status: ValidationStatus;
  ogdRunId: string | null;
  ganScore: number | null;
  ganFeedback: string | null;
  sixhatsSummary: string | null;
  expertSummary: string | null;
  overallScore: number | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}
