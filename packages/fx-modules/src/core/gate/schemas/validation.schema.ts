import { z } from "zod";

// F294: Validation tier
export const VALIDATION_TIERS = [
  "none", "division_pending", "division_approved", "company_pending", "company_approved",
] as const;
export type ValidationTier = (typeof VALIDATION_TIERS)[number];
export const ValidationTierEnum = z.enum(VALIDATION_TIERS);

export const SubmitValidationSchema = z.object({
  bizItemId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  comment: z.string().max(2000).optional(),
});

export const ValidationFilterSchema = z.object({
  tier: ValidationTierEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// F295: Meeting
export const MEETING_TYPES = ["interview", "meeting", "workshop", "review"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const MEETING_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const CreateMeetingSchema = z.object({
  bizItemId: z.string().min(1),
  type: z.enum(MEETING_TYPES).default("interview"),
  title: z.string().min(1).max(200),
  scheduledAt: z.string(),
  attendees: z.array(z.string()).default([]),
  location: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduledAt: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(MEETING_STATUSES).optional(),
});

export const MeetingFilterSchema = z.object({
  bizItemId: z.string().optional(),
  status: z.enum(MEETING_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
