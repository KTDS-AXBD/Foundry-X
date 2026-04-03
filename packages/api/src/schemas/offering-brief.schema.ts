import { z } from "zod";

export const MEETING_TYPES = ["initial", "followup", "demo", "closing"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const CreateOfferingBriefSchema = z.object({
  targetAudience: z.string().max(500).optional(),
  meetingType: z.enum(MEETING_TYPES).default("initial"),
});

export const OfferingBriefFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
