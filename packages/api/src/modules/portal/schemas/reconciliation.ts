import { z } from "@hono/zod-openapi";

// ─── F99: Reconciliation Schemas ───

export const ReconciliationRunRequestSchema = z
  .object({
    strategy: z
      .enum(["git-wins", "db-wins", "manual"])
      .default("git-wins")
      .openapi({ description: "Drift 해소 전략" }),
  })
  .openapi("ReconciliationRunRequest");

export const DriftItemSchema = z
  .object({
    entity: z.enum(["spec_item", "requirement", "wiki_page", "agent_config"]),
    id: z.string(),
    gitStatus: z.string().optional(),
    dbStatus: z.string().optional(),
    action: z.enum(["created", "updated", "deleted", "skipped"]),
  })
  .openapi("DriftItem");

export const ReconciliationRunResponseSchema = z
  .object({
    runId: z.string(),
    status: z.enum(["running", "completed", "failed"]),
    driftCount: z.number(),
    fixedCount: z.number(),
    skippedCount: z.number(),
    drifts: z.array(DriftItemSchema),
  })
  .openapi("ReconciliationRunResponse");

export const ReconciliationStatusResponseSchema = z
  .object({
    lastRun: z
      .object({
        runId: z.string(),
        status: z.enum(["running", "completed", "failed"]),
        strategy: z.string(),
        driftCount: z.number(),
        fixedCount: z.number(),
        skippedCount: z.number(),
        startedAt: z.string(),
        completedAt: z.string().nullable(),
      })
      .nullable(),
  })
  .openapi("ReconciliationStatusResponse");

export const ReconciliationHistoryResponseSchema = z
  .object({
    runs: z.array(
      z.object({
        runId: z.string(),
        status: z.enum(["running", "completed", "failed"]),
        triggerType: z.string(),
        strategy: z.string(),
        driftCount: z.number(),
        fixedCount: z.number(),
        skippedCount: z.number(),
        startedAt: z.string(),
        completedAt: z.string().nullable(),
      }),
    ),
  })
  .openapi("ReconciliationHistoryResponse");
