import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { BmcService } from "../services/bmc-service.js";
import {
  CreateBmcSchema,
  UpdateBmcBlocksSchema,
} from "../schemas/bmc.schema.js";

export const axBdBmcRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/bmc — BMC 생성
axBdBmcRoute.post("/ax-bd/bmc", async (c) => {
  const body = await c.req.json();
  const parsed = CreateBmcSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new BmcService(c.env.DB);
  const bmc = await svc.create(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(bmc, 201);
});

// GET /ax-bd/bmc — BMC 목록
axBdBmcRoute.get("/ax-bd/bmc", async (c) => {
  const svc = new BmcService(c.env.DB);
  const { page, limit, sort } = c.req.query();
  const result = await svc.list(c.get("orgId"), {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    sort: sort || "updated_at_desc",
  });
  return c.json(result);
});

// GET /ax-bd/bmc/:id — BMC 상세 (블록 포함)
axBdBmcRoute.get("/ax-bd/bmc/:id", async (c) => {
  const svc = new BmcService(c.env.DB);
  const bmc = await svc.getById(c.get("orgId"), c.req.param("id"));
  if (!bmc) return c.json({ error: "BMC not found" }, 404);
  return c.json(bmc);
});

// PUT /ax-bd/bmc/:id — BMC 블록 업데이트
axBdBmcRoute.put("/ax-bd/bmc/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateBmcBlocksSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new BmcService(c.env.DB);
  const bmc = await svc.update(c.get("orgId"), c.req.param("id"), c.get("userId"), parsed.data);
  if (!bmc) return c.json({ error: "BMC not found" }, 404);
  return c.json(bmc);
});

// DELETE /ax-bd/bmc/:id — BMC 삭제 (soft delete)
axBdBmcRoute.delete("/ax-bd/bmc/:id", async (c) => {
  const svc = new BmcService(c.env.DB);
  const ok = await svc.softDelete(c.get("orgId"), c.req.param("id"));
  if (!ok) return c.json({ error: "BMC not found" }, 404);
  return c.json({ success: true });
});

// POST /ax-bd/bmc/:id/stage — Git staging 상태 전환
axBdBmcRoute.post("/ax-bd/bmc/:id/stage", async (c) => {
  const svc = new BmcService(c.env.DB);
  const result = await svc.stage(c.get("orgId"), c.req.param("id"), c.get("userId"));
  if (!result) return c.json({ error: "BMC not found" }, 404);
  return c.json(result);
});
