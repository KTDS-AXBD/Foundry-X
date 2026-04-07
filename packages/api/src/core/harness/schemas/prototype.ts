/**
 * Sprint 58: Prototype Zod 스키마 (F181)
 */

import { z } from "@hono/zod-openapi";

export const GeneratePrototypeSchema = z.object({
  template: z.enum(["idea", "market", "problem", "tech", "service"]).optional(),
}).openapi("GeneratePrototype");

export const PrototypeSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number().int(),
  format: z.literal("html"),
  content: z.string(),
  templateUsed: z.string(),
  modelUsed: z.string().nullable(),
  tokensUsed: z.number(),
  generatedAt: z.string(),
}).openapi("Prototype");
