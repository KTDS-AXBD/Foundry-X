// ─── F334: Execution Event Zod Schemas (Sprint 149) ───

import { z } from "@hono/zod-openapi";

export const ExecutionEventRecordSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  tenant_id: z.string(),
  source: z.string(),
  severity: z.string(),
  payload: z.string().nullable(),
  created_at: z.string(),
});

export const ExecutionEventListSchema = z.object({
  items: z.array(ExecutionEventRecordSchema),
  total: z.number(),
});
