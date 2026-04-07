import { z } from "@hono/zod-openapi";

export const DataClassificationSchema = z.enum([
  "public",
  "internal",
  "confidential",
  "restricted",
]);

export const MaskingStrategySchema = z.enum([
  "redact",
  "hash",
  "partial",
  "tokenize",
]);

export const ClassificationRuleSchema = z
  .object({
    id: z.string(),
    tenantId: z.string(),
    patternName: z.string(),
    patternRegex: z.string(),
    classification: DataClassificationSchema,
    maskingStrategy: MaskingStrategySchema,
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("ClassificationRule");

export const UpdateRuleSchema = z
  .object({
    classification: DataClassificationSchema.optional(),
    maskingStrategy: MaskingStrategySchema.optional(),
    isActive: z.boolean().optional(),
  })
  .openapi("UpdateRule");

export const RuleQuerySchema = z.object({
  classification: DataClassificationSchema.optional(),
  isActive: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .optional(),
});

export const RuleListResponseSchema = z
  .object({
    rules: z.array(ClassificationRuleSchema),
    total: z.number(),
  })
  .openapi("RuleListResponse");

export const RuleUpdateResponseSchema = z
  .object({
    updated: z.boolean(),
    rule: ClassificationRuleSchema,
  })
  .openapi("RuleUpdateResponse");

export const ErrorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi("GovernanceError");
