// F602: 4대 진단 PoC schemas
import { z } from "@hono/zod-openapi";
import { DIAGNOSTIC_TYPES, SEVERITIES } from "../types.js";

export const DiagnosticTypeSchema = z.enum(DIAGNOSTIC_TYPES);
export const SeveritySchema = z.enum(SEVERITIES);

export const RunDiagnosticSchema = z.object({
  orgId: z.string().min(1),
  diagnosticTypes: z.array(DiagnosticTypeSchema).default([...DIAGNOSTIC_TYPES]),
});

export const DiagnosticFindingResponseSchema = z.object({
  id: z.string(),
  runId: z.string(),
  orgId: z.string(),
  diagnosticType: DiagnosticTypeSchema,
  severity: SeveritySchema,
  entityId: z.string().nullable(),
  detail: z.record(z.unknown()),
  createdAt: z.number(),
});

export const DiagnosticReportResponseSchema = z.object({
  runId: z.string(),
  orgId: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  summary: z.record(DiagnosticTypeSchema, z.number()),
  findings: z.array(DiagnosticFindingResponseSchema),
  startedAt: z.number(),
  completedAt: z.number().nullable(),
});
