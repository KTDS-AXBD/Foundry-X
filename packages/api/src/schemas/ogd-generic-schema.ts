// F360: O-G-D Generic Schema (Sprint 163)
import { z } from "@hono/zod-openapi";

export const OgdRunRequestSchema = z.object({
  domain: z.string().min(1).openapi({ example: "code-review" }),
  input: z.unknown().openapi({ example: { diff: "..." } }),
  rubric: z.string().optional().openapi({ example: "OWASP Top 10 checklist" }),
  maxRounds: z.number().int().min(1).max(10).optional().openapi({ example: 3 }),
  minScore: z.number().min(0).max(1).optional().openapi({ example: 0.85 }),
});

export const OgdRunRoundSchema = z.object({
  round: z.number(),
  score: z.number(),
  feedback: z.string(),
  passed: z.boolean(),
  durationMs: z.number(),
});

export const OgdRunResponseSchema = z.object({
  runId: z.string(),
  domain: z.string(),
  output: z.unknown(),
  score: z.number(),
  iterations: z.number(),
  converged: z.boolean(),
  rounds: z.array(OgdRunRoundSchema),
});

export const DomainInfoSchema = z.object({
  domain: z.string(),
  displayName: z.string(),
  description: z.string(),
  adapterType: z.string(),
  defaultMaxRounds: z.number(),
  defaultMinScore: z.number(),
  enabled: z.boolean(),
});

export type OgdRunRequest = z.infer<typeof OgdRunRequestSchema>;
export type OgdRunResponse = z.infer<typeof OgdRunResponseSchema>;
export type DomainInfo = z.infer<typeof DomainInfoSchema>;
