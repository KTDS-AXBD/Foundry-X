/**
 * F560: ax-bd-discovery routes — fx-shaping 이전
 * api/src/core/discovery/routes/ax-bd-discovery.ts → fx-shaping
 * gateway /api/ax-bd/* → SHAPING (기존 라우팅 유지)
 */
import { Hono } from "hono";
import { z } from "zod";
import type { ShapingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { DiscoveryXIngestService } from "../services/discovery-x-ingest.service.js";

const discoveryIngestPayloadSchema = z.object({
  version: z.literal("v1"),
  source: z.object({
    id: z.string().min(1),
    type: z.string(),
    name: z.string().min(1),
    url: z.string().url().optional(),
  }),
  timestamp: z.number().int().positive(),
  data: z.array(z.record(z.unknown())).default([]),
});

export const axBdDiscoveryRoute = new Hono<{ Bindings: ShapingEnv; Variables: TenantVariables }>();

axBdDiscoveryRoute.post("/ax-bd/discovery/ingest", async (c) => {
  const body = await c.req.json();
  const parsed = discoveryIngestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new DiscoveryXIngestService(c.env.DB);
  const result = await svc.ingest(parsed.data as unknown as Parameters<typeof svc.ingest>[0], c.get("orgId"));
  return c.json({ ok: true, received: result.received });
});

axBdDiscoveryRoute.get("/ax-bd/discovery/status", async (c) => {
  const svc = new DiscoveryXIngestService(c.env.DB);
  const status = await svc.getStatus(c.get("orgId"));
  return c.json(status);
});

axBdDiscoveryRoute.post("/ax-bd/discovery/sync", async (c) => {
  const svc = new DiscoveryXIngestService(c.env.DB);
  await svc.triggerSync(c.get("orgId"));
  return c.json({ ok: true });
});
