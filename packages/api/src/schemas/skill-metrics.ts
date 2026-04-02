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

export type SkillMetricsQuery = z.infer<typeof skillMetricsQuerySchema>;
export type SkillDetailQuery = z.infer<typeof skillDetailQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
