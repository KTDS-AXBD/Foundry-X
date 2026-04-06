// ─── F353: Prototype Jobs REST API (Sprint 159) ───

import { Hono } from "hono";
import { CreatePrototypeJobSchema, UpdatePrototypeJobSchema } from "../schemas/prototype-job.js";
import { PrototypeJobService } from "../services/prototype-job-service.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const prototypeJobsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /prototype-jobs — Job 생성
prototypeJobsRoute.post("/prototype-jobs", async (c) => {
  const orgId = c.get("orgId");
  const raw = await c.req.json();
  const parsed = CreatePrototypeJobSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const svc = new PrototypeJobService(c.env.DB);
  const job = await svc.create(orgId, parsed.data.prdContent, parsed.data.prdTitle);
  return c.json(job, 201);
});

// GET /prototype-jobs — 목록
prototypeJobsRoute.get("/prototype-jobs", async (c) => {
  const orgId = c.get("orgId");
  const { status, limit, offset } = c.req.query();
  const svc = new PrototypeJobService(c.env.DB);
  const result = await svc.list(orgId, {
    status: status || undefined,
    limit: Number(limit) || 20,
    offset: Number(offset) || 0,
  });
  return c.json(result);
});

// GET /prototype-jobs/:id — 상세
prototypeJobsRoute.get("/prototype-jobs/:id", async (c) => {
  const orgId = c.get("orgId");
  const svc = new PrototypeJobService(c.env.DB);
  const job = await svc.getById(c.req.param("id"), orgId);
  if (!job) return c.json({ error: "Job not found" }, 404);
  return c.json(job);
});

// PATCH /prototype-jobs/:id — 상태/로그 업데이트
prototypeJobsRoute.patch("/prototype-jobs/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const raw = await c.req.json();
  const parsed = UpdatePrototypeJobSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const svc = new PrototypeJobService(c.env.DB);
  const { status, ...updates } = parsed.data;

  try {
    if (status) {
      const result = await svc.transition(id, orgId, status, updates);
      return c.json(result);
    }
    const existing = await svc.getById(id, orgId);
    if (!existing) return c.json({ error: "Job not found" }, 404);
    const result = await svc.transition(id, orgId, existing.status, updates);
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 409);
  }
});
