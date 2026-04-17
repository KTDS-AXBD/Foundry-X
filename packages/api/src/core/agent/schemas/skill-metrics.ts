import { z } from "zod";

export const skillMetricsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  status: z.enum(["completed", "failed", "timeout", "cancelled"]).optional(),
});

export const skillDetailQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

export const auditLogQuerySchema = z.object({
  entityType: z.enum(["execution", "version", "lineage", "skill"]).optional(),
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// F305: 스킬 실행 기록 입력 스키마
export const recordSkillExecutionSchema = z.object({
  skillId: z.string().min(1).max(100),
  version: z.coerce.number().int().min(1).optional().default(1),
  bizItemId: z.string().optional(),
  artifactId: z.string().optional(),
  model: z.string().min(1).max(100).default("claude-sonnet-4-6"),
  status: z.enum(["completed", "failed", "timeout", "cancelled"]),
  inputTokens: z.coerce.number().int().min(0).default(0),
  outputTokens: z.coerce.number().int().min(0).default(0),
  costUsd: z.coerce.number().min(0).default(0),
  durationMs: z.coerce.number().int().min(0),
  errorMessage: z.string().max(2000).optional(),
});

export type RecordSkillExecutionInput = z.infer<typeof recordSkillExecutionSchema>;
export type SkillMetricsQuery = z.infer<typeof skillMetricsQuerySchema>;
export type SkillDetailQuery = z.infer<typeof skillDetailQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
