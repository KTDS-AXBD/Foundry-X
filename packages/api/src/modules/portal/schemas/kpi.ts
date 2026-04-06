import { z } from "@hono/zod-openapi";

export const KpiEventTypeEnum = z.enum([
  "page_view",
  "api_call",
  "agent_task",
  "cli_invoke",
  "sdd_check",
]);

export const KpiTrackRequestSchema = z
  .object({
    eventType: KpiEventTypeEnum,
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi("KpiTrackRequest");

export const KpiTrackResponseSchema = z
  .object({
    id: z.string(),
    recorded: z.boolean(),
  })
  .openapi("KpiTrackResponse");

export const KpiSummaryResponseSchema = z
  .object({
    wau: z.number(),
    agentCompletionRate: z.number(),
    sddIntegrityRate: z.number(),
    totalEvents: z.number(),
    breakdown: z.record(z.number()),
    period: z.object({
      from: z.string(),
      to: z.string(),
    }),
  })
  .openapi("KpiSummaryResponse");

export const KpiTrendsResponseSchema = z
  .object({
    trends: z.array(
      z.object({
        date: z.string(),
        pageViews: z.number(),
        apiCalls: z.number(),
        agentTasks: z.number(),
      }),
    ),
  })
  .openapi("KpiTrendsResponse");

export const KpiEventsResponseSchema = z
  .object({
    events: z.array(
      z.object({
        id: z.string(),
        tenantId: z.string(),
        eventType: z.string(),
        userId: z.string().nullable(),
        agentId: z.string().nullable(),
        metadata: z.record(z.unknown()),
        createdAt: z.string(),
      }),
    ),
    total: z.number(),
  })
  .openapi("KpiEventsResponse");
