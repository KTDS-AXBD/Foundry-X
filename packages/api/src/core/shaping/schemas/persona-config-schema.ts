/**
 * Sprint 154: F342 페르소나 설정 스키마
 */
import { z } from "zod";

export const PersonaWeightsSchema = z.object({
  strategic_fit: z.number().min(0).max(100),
  market_potential: z.number().min(0).max(100),
  technical_feasibility: z.number().min(0).max(100),
  financial_viability: z.number().min(0).max(100),
  competitive_advantage: z.number().min(0).max(100),
  risk_assessment: z.number().min(0).max(100),
  team_readiness: z.number().min(0).max(100),
});

export const UpsertPersonaConfigSchema = z.object({
  personaId: z.string().min(1),
  personaName: z.string().min(1),
  personaRole: z.string().default(""),
  weights: PersonaWeightsSchema,
  contextJson: z.record(z.unknown()).default({}),
});

export type UpsertPersonaConfigInput = z.infer<typeof UpsertPersonaConfigSchema>;

export const UpdateWeightsSchema = z.object({
  weights: PersonaWeightsSchema,
});
