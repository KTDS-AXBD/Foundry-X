import { Hono } from "hono";
import type { ShapingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { BmcHistoryService } from "../services/bmc-history.js";

export const axBdHistoryRoute = new Hono<{
  Bindings: ShapingEnv;
  Variables: TenantVariables;
}>();

// GET /ax-bd/bmc/:id/history — 버전 히스토리 목록
axBdHistoryRoute.get("/ax-bd/bmc/:id/history", async (c) => {
  const bmcId = c.req.param("id");
  const limit = Number(c.req.query("limit")) || 20;
  const svc = new BmcHistoryService(c.env.DB);
  const versions = await svc.getHistory(bmcId, limit);
  return c.json({ versions });
});

// GET /ax-bd/bmc/:id/history/:commitSha — 특정 버전 스냅샷
axBdHistoryRoute.get("/ax-bd/bmc/:id/history/:commitSha", async (c) => {
  const bmcId = c.req.param("id");
  const commitSha = c.req.param("commitSha");
  const svc = new BmcHistoryService(c.env.DB);
  const snapshot = await svc.getVersion(bmcId, commitSha);
  if (!snapshot) return c.json({ error: "Version not found" }, 404);
  return c.json(snapshot);
});

// POST /ax-bd/bmc/:id/history/:commitSha/restore — 버전 복원
axBdHistoryRoute.post("/ax-bd/bmc/:id/history/:commitSha/restore", async (c) => {
  const bmcId = c.req.param("id");
  const commitSha = c.req.param("commitSha");
  const svc = new BmcHistoryService(c.env.DB);
  const snapshot = await svc.restoreVersion(bmcId, commitSha);
  if (!snapshot) return c.json({ error: "Version not found" }, 404);
  return c.json({ restored: snapshot });
});
