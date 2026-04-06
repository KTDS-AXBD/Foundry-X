/**
 * Sprint 120: PoC Management Routes — PoC 프로젝트 관리 + KPI (F298)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { PocService } from "../services/poc-service.js";
import {
  CreatePocSchema,
  UpdatePocSchema,
  PocFilterSchema,
  CreatePocKpiSchema,
} from "../schemas/poc.schema.js";

export const pocRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /poc — PoC 생성
pocRoute.post("/poc", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreatePocSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PocService(c.env.DB);
  const poc = await svc.create({ ...parsed.data, orgId, createdBy: userId });

  return c.json(poc, 201);
});

// GET /poc — PoC 목록
pocRoute.get("/poc", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = PocFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new PocService(c.env.DB);
  const pocs = await svc.list(orgId, parsed.data);
  return c.json(pocs);
});

// GET /poc/:id — PoC 상세
pocRoute.get("/poc/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new PocService(c.env.DB);
  const poc = await svc.getById(id, orgId);
  if (!poc) {
    return c.json({ error: "PoC not found" }, 404);
  }

  return c.json(poc);
});

// PATCH /poc/:id — PoC 수정
pocRoute.patch("/poc/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = UpdatePocSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PocService(c.env.DB);
  try {
    const poc = await svc.update(id, orgId, parsed.data);
    return c.json(poc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});

// GET /poc/:id/kpi — KPI 조회
pocRoute.get("/poc/:id/kpi", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new PocService(c.env.DB);
  try {
    const kpis = await svc.getKpis(id, orgId);
    return c.json(kpis);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});

// POST /poc/:id/kpi — KPI 추가
pocRoute.post("/poc/:id/kpi", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = CreatePocKpiSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PocService(c.env.DB);
  // Verify PoC exists
  const poc = await svc.getById(id, orgId);
  if (!poc) {
    return c.json({ error: "PoC not found" }, 404);
  }

  const kpi = await svc.addKpi(id, { ...parsed.data, orgId });
  return c.json(kpi, 201);
});
