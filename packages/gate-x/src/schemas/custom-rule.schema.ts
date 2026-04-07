import { z } from "zod";

export const RuleConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["gte", "lte", "eq", "neq", "contains", "regex"]),
  value: z.unknown(),
  score_weight: z.number().min(0).max(1),
});

export const CreateCustomRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  weight: z.number().min(0).max(1).default(0.2),
  threshold: z.number().min(0).max(100).default(60),
  conditions: z.array(RuleConditionSchema).min(1).max(20),
});

export const UpdateCustomRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  weight: z.number().min(0).max(1).optional(),
  threshold: z.number().min(0).max(100).optional(),
  conditions: z.array(RuleConditionSchema).min(1).max(20).optional(),
});

export type RuleConditionInput = z.infer<typeof RuleConditionSchema>;
export type CreateCustomRuleInput = z.infer<typeof CreateCustomRuleSchema>;
export type UpdateCustomRuleInput = z.infer<typeof UpdateCustomRuleSchema>;

export interface CustomValidationRule {
  id: string;
  org_id: string;
  name: string;
  description: string;
  weight: number;
  threshold: number;
  conditions: RuleConditionInput[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}
