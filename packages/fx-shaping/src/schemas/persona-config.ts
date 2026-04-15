/**
 * Sprint 155 F344: 페르소나 설정 Zod 스키마
 */
import { z } from "@hono/zod-openapi";

export const WEIGHT_AXES = [
  "businessViability",
  "strategicFit",
  "customerValue",
  "techMarket",
  "execution",
  "financialFeasibility",
  "competitiveDiff",
] as const;

export const WeightsSchema = z.object({
  businessViability: z.number().min(0).max(100).default(15),
  strategicFit: z.number().min(0).max(100).default(15),
  customerValue: z.number().min(0).max(100).default(15),
  techMarket: z.number().min(0).max(100).default(15),
  execution: z.number().min(0).max(100).default(15),
  financialFeasibility: z.number().min(0).max(100).default(15),
  competitiveDiff: z.number().min(0).max(100).default(10),
});

export const PersonaContextSchema = z.object({
  situation: z.string().default(""),
  priorities: z.array(z.string()).default([]),
  style: z.string().default("neutral"),
  redLines: z.array(z.string()).default([]),
});

export const PersonaConfigSchema = z.object({
  personaId: z.string(),
  weights: WeightsSchema,
  context: PersonaContextSchema,
});

export const UpsertPersonaConfigsSchema = z.object({
  configs: z.array(PersonaConfigSchema).min(1).max(8),
});

export const PersonaConfigResponseSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  personaId: z.string(),
  weights: WeightsSchema,
  context: PersonaContextSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Weights = z.infer<typeof WeightsSchema>;
export type PersonaContext = z.infer<typeof PersonaContextSchema>;
export type PersonaConfigInput = z.infer<typeof PersonaConfigSchema>;
