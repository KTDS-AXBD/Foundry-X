/**
 * F378: Content Adapter Zod Schemas (Sprint 171)
 */
import { z } from "zod";

export const AdaptToneEnum = z.enum(["executive", "technical", "critical"]);
export type AdaptTone = z.infer<typeof AdaptToneEnum>;

export const AdaptRequestSchema = z.object({
  tone: AdaptToneEnum,
  sectionKeys: z.array(z.string().min(1)).optional(),
});
export type AdaptRequestInput = z.infer<typeof AdaptRequestSchema>;

export const AdaptPreviewQuerySchema = z.object({
  tone: AdaptToneEnum,
});

export interface AdaptResult {
  sectionKey: string;
  title: string;
  content: string;
}

export interface AdaptResponse {
  adaptedSections: AdaptResult[];
  tone: AdaptTone;
  offeringId: string;
  sourceItemId: string;
}
