// ─── F361+F362: 운영 지표 Zod 스키마 (Sprint 164, Phase 17) ───

import { z } from "@hono/zod-openapi";

export const RuleEffectivenessSchema = z.object({
  proposalId: z.string(),
  ruleFilename: z.string(),
  patternId: z.string(),
  preDeployFailures: z.number(),
  postDeployFailures: z.number(),
  effectivenessScore: z.number(),
  measuredAt: z.string().nullable(),
  status: z.enum(["measuring", "measured", "insufficient_data"]),
});

export const RuleEffectivenessResponseSchema = z.object({
  items: z.array(RuleEffectivenessSchema),
  averageScore: z.number(),
  totalRules: z.number(),
  measuredRules: z.number(),
});

export const SkillReuseSchema = z.object({
  skillId: z.string(),
  derivationType: z.enum(["manual", "derived", "captured", "forked"]),
  totalExecutions: z.number(),
  reuseCount: z.number(),
  reuseRate: z.number(),
});

export const SkillReuseResponseSchema = z.object({
  items: z.array(SkillReuseSchema),
  overallReuseRate: z.number(),
  derivedCount: z.number(),
  capturedCount: z.number(),
});

export const AgentUsageSchema = z.object({
  source: z.string(),
  month: z.string(),
  eventCount: z.number(),
  isUnused: z.boolean(),
});

export const AgentUsageResponseSchema = z.object({
  items: z.array(AgentUsageSchema),
  totalSources: z.number(),
  activeSources: z.number(),
  unusedSources: z.array(z.string()),
});

export const MetricsOverviewSchema = z.object({
  ruleEffectiveness: z.object({
    averageScore: z.number(),
    totalRules: z.number(),
    measuredRules: z.number(),
  }),
  skillReuse: z.object({
    overallReuseRate: z.number(),
    derivedCount: z.number(),
    capturedCount: z.number(),
  }),
  agentUsage: z.object({
    totalSources: z.number(),
    activeSources: z.number(),
    unusedCount: z.number(),
  }),
  period: z.string(),
});
