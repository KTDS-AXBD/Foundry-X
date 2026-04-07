import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { IdeaService } from "../services/idea-service.js";
import { CreateIdeaSchema, UpdateIdeaSchema } from "../schemas/idea.schema.js";

export const axBdIdeasRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /ax-bd/ideas — 아이디어 등록
axBdIdeasRoute.post("/ax-bd/ideas", async (c) => {
  const body = await c.req.json();
  const parsed = CreateIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new IdeaService(c.env.DB);
  const idea = await svc.create(c.get("orgId"), c.get("userId"), parsed.data);
  return c.json(idea, 201);
});

// GET /ax-bd/ideas — 아이디어 목록 (태그 필터)
axBdIdeasRoute.get("/ax-bd/ideas", async (c) => {
  const svc = new IdeaService(c.env.DB);
  const { page, limit, tag } = c.req.query();
  const result = await svc.list(c.get("orgId"), {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    tag: tag || undefined,
  });
  return c.json(result);
});

// GET /ax-bd/ideas/:id — 아이디어 상세
axBdIdeasRoute.get("/ax-bd/ideas/:id", async (c) => {
  const svc = new IdeaService(c.env.DB);
  const idea = await svc.getById(c.get("orgId"), c.req.param("id"));
  if (!idea) return c.json({ error: "Idea not found" }, 404);
  return c.json(idea);
});

// PUT /ax-bd/ideas/:id — 아이디어 수정
axBdIdeasRoute.put("/ax-bd/ideas/:id", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }
  const svc = new IdeaService(c.env.DB);
  const idea = await svc.update(c.get("orgId"), c.req.param("id"), parsed.data);
  if (!idea) return c.json({ error: "Idea not found" }, 404);
  return c.json(idea);
});

// DELETE /ax-bd/ideas/:id — 아이디어 삭제 (soft delete)
axBdIdeasRoute.delete("/ax-bd/ideas/:id", async (c) => {
  const svc = new IdeaService(c.env.DB);
  const ok = await svc.softDelete(c.get("orgId"), c.req.param("id"));
  if (!ok) return c.json({ error: "Idea not found" }, 404);
  return c.json({ success: true });
});
