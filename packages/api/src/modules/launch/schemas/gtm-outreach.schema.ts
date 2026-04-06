import { z } from "zod";

export const OUTREACH_STATUSES = [
  "draft", "proposal_ready", "sent", "opened", "responded",
  "meeting_set", "converted", "declined", "archived",
] as const;
export type OutreachStatusType = (typeof OUTREACH_STATUSES)[number];

export const CreateGtmOutreachSchema = z.object({
  customerId: z.string().min(1),
  offeringPackId: z.string().optional(),
  title: z.string().min(1).max(300),
});

export const UpdateOutreachStatusSchema = z.object({
  status: z.enum(OUTREACH_STATUSES),
  responseNote: z.string().max(5000).optional(),
});

export const GtmOutreachFilterSchema = z.object({
  status: z.enum(OUTREACH_STATUSES).optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
