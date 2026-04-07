/**
 * Sprint 154: F342 페르소나 평가 결과 스키마
 */
import { z } from "zod";
import { PersonaWeightsSchema } from "./persona-config-schema.js";

export const SavePersonaEvalSchema = z.object({
  personaId: z.string().min(1),
  scores: PersonaWeightsSchema,
  verdict: z.enum(["Go", "Conditional", "NoGo"]),
  summary: z.string().min(1),
  concern: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  evalModel: z.string().optional(),
  evalDurationMs: z.number().int().optional(),
  evalCostUsd: z.number().optional(),
});

export type SavePersonaEvalInput = z.infer<typeof SavePersonaEvalSchema>;
