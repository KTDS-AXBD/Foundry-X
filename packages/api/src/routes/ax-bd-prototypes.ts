/**
 * Sprint 67: F209 — Prototype + PoC 환경 + 기술 검증 라우트
 * 8 endpoints: list, getById, delete, pocEnv (provision/get/teardown), techReview (analyze/get)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { PrototypeService } from "../services/prototype-service.js";
import { PocEnvService } from "../services/poc-env-service.js";
import { TechReviewService } from "../services/tech-review-service.js";
import { PocEnvProvisionSchema } from "../schemas/prototype-ext.js";

export const axBdPrototypesRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /ax-bd/prototypes — 목록
axBdPrototypesRoute.get("/ax-bd/prototypes", async (c) => {
  const svc = new PrototypeService(c.env.DB);
  const { bizItemId, limit, offset } = c.req.query();
  const result = await svc.list(c.get("orgId"), {
    bizItemId: bizItemId || undefined,
    limit: Number(limit) || 20,
    offset: Number(offset) || 0,
  });
  return c.json(result);
});

// GET /ax-bd/prototypes/:id — 상세 (PoC + TechReview 포함)
axBdPrototypesRoute.get("/ax-bd/prototypes/:id", async (c) => {
  const svc = new PrototypeService(c.env.DB);
  const proto = await svc.getById(c.req.param("id"), c.get("orgId"));
  if (!proto) return c.json({ error: "Prototype not found" }, 404);
  return c.json(proto);
});

// DELETE /ax-bd/prototypes/:id — 삭제 (CASCADE)
axBdPrototypesRoute.delete("/ax-bd/prototypes/:id", async (c) => {
  const svc = new PrototypeService(c.env.DB);
  const ok = await svc.delete(c.req.param("id"), c.get("orgId"));
  if (!ok) return c.json({ error: "Prototype not found" }, 404);
  return c.json({ success: true });
});

// POST /ax-bd/prototypes/:id/poc-env — PoC 환경 프로비저닝
axBdPrototypesRoute.post("/ax-bd/prototypes/:id/poc-env", async (c) => {
  const body = await c.req.json();
  const parsed = PocEnvProvisionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new PocEnvService(c.env.DB);
  try {
    const env = await svc.provision(c.req.param("id"), c.get("orgId"), parsed.data.config);
    return c.json(env, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Prototype not found") return c.json({ error: msg }, 404);
    if (msg === "Active PoC environment already exists") return c.json({ error: msg }, 409);
    throw e;
  }
});

// GET /ax-bd/prototypes/:id/poc-env — PoC 환경 조회
axBdPrototypesRoute.get("/ax-bd/prototypes/:id/poc-env", async (c) => {
  const svc = new PocEnvService(c.env.DB);
  const env = await svc.getByPrototype(c.req.param("id"), c.get("orgId"));
  if (!env) return c.json({ error: "PoC environment not found" }, 404);
  return c.json(env);
});

// DELETE /ax-bd/prototypes/:id/poc-env — PoC 환경 teardown
axBdPrototypesRoute.delete("/ax-bd/prototypes/:id/poc-env", async (c) => {
  const svc = new PocEnvService(c.env.DB);
  try {
    await svc.teardown(c.req.param("id"), c.get("orgId"));
    return c.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "PoC environment not found") return c.json({ error: msg }, 404);
    if (msg === "Environment already terminated") return c.json({ error: msg }, 409);
    throw e;
  }
});

// POST /ax-bd/prototypes/:id/tech-review — 기술 검증 분석 요청
axBdPrototypesRoute.post("/ax-bd/prototypes/:id/tech-review", async (c) => {
  const svc = new TechReviewService(c.env.DB);
  try {
    const review = await svc.analyze(c.req.param("id"), c.get("orgId"));
    return c.json(review, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Prototype not found") return c.json({ error: msg }, 404);
    throw e;
  }
});

// GET /ax-bd/prototypes/:id/tech-review — 기술 검증 결과 조회
axBdPrototypesRoute.get("/ax-bd/prototypes/:id/tech-review", async (c) => {
  const svc = new TechReviewService(c.env.DB);
  const review = await svc.getByPrototype(c.req.param("id"), c.get("orgId"));
  if (!review) return c.json({ error: "Tech review not found" }, 404);
  return c.json(review);
});
