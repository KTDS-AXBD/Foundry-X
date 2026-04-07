import { z } from "zod";

export const UpdatePlanSchema = z.object({
  planId: z.enum(["free", "pro", "enterprise"]),
});

export const UsageSummarySchema = z.object({
  orgId: z.string(),
  month: z.string(),
  used: z.number().int().min(0),
  limit: z.number().int().min(-1),
  remaining: z.number().int().min(-1),
  planId: z.string(),
});

export const SubscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  monthlyLimit: z.number().int().min(-1),
});

export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;
