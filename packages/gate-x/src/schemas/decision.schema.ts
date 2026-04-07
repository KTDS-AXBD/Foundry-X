import { z } from "zod";

export const DecisionEnum = z.enum(["GO", "HOLD", "DROP"]);

export type DecisionType = z.infer<typeof DecisionEnum>;

export const CreateDecisionSchema = z.object({
  bizItemId: z.string().min(1),
  decision: DecisionEnum,
  comment: z.string().min(1).max(2000),
});

export const DecisionFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
