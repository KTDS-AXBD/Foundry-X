import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { DiscoveryXIngestService, discoveryIngestPayloadSchema } from "../../collection/types.js";

export const axBdDiscoveryRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/discovery/ingest — Discovery-X 수집 데이터 수신
axBdDiscoveryRoute.post("/ax-bd/discovery/ingest", async (c) => {
  const body = await c.req.json();
  const parsed = discoveryIngestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new DiscoveryXIngestService(c.env.DB);
  const result = await svc.ingest(parsed.data, c.get("orgId"));
  return c.json({ ok: true, received: result.received, message: "Discovery-X ingest endpoint (stub)" });
});

// GET /ax-bd/discovery/status — 연동 상태 확인
axBdDiscoveryRoute.get("/ax-bd/discovery/status", async (c) => {
  const svc = new DiscoveryXIngestService(c.env.DB);
  const status = await svc.getStatus(c.get("orgId"));
  return c.json(status);
});

// POST /ax-bd/discovery/sync — 수동 재동기화 트리거
axBdDiscoveryRoute.post("/ax-bd/discovery/sync", async (c) => {
  const svc = new DiscoveryXIngestService(c.env.DB);
  await svc.triggerSync(c.get("orgId"));
  return c.json({ ok: true, message: "Sync triggered (stub)" });
});
