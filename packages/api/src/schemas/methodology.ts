/**
 * Sprint 59 F191: Methodology Zod schemas
 */
import { z } from "@hono/zod-openapi";

export const MethodologyModuleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    version: z.string(),
    isActive: z.boolean(),
    configJson: z.record(z.unknown()).nullable(),
    criteriaCount: z.number(),
    reviewMethodCount: z.number(),
  })
  .openapi("MethodologyModule");

export const MethodologyDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    version: z.string(),
    criteria: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        condition: z.string(),
        relatedTools: z.array(z.string()),
      }),
    ),
    reviewMethods: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["ai-review", "persona-evaluation", "debate", "custom"]),
        description: z.string(),
      }),
    ),
  })
  .openapi("MethodologyDetail");

export const MethodologyRecommendationSchema = z
  .object({
    methodologyId: z.string(),
    name: z.string(),
    matchScore: z.number(),
    description: z.string(),
  })
  .openapi("MethodologyRecommendation");

export const MethodologySelectionSchema = z
  .object({
    id: z.string(),
    bizItemId: z.string(),
    methodologyId: z.string(),
    matchScore: z.number().nullable(),
    selectedBy: z.enum(["auto", "manual"]),
    isCurrent: z.boolean(),
    createdAt: z.string(),
  })
  .openapi("MethodologySelection");

export const SelectMethodologySchema = z
  .object({
    methodologyId: z.string().min(1),
  })
  .openapi("SelectMethodology");
