import { Hono } from "hono";
import { SystemKnowledgeService } from "../services/system-knowledge.service.js";
import { RegisterSystemKnowledgeSchema } from "../schemas/asset.js";
import type { Env } from "../../../env.js";

export const assetApp = new Hono<{ Bindings: Env }>();

assetApp.post("/system-knowledge", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterSystemKnowledgeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }
  const svc = new SystemKnowledgeService(c.env.DB);
  const result = await svc.registerKnowledge(parsed.data);
  return c.json(result, 201);
});

assetApp.get("/system-knowledge/:id", async (c) => {
  const id = c.req.param("id");
  const svc = new SystemKnowledgeService(c.env.DB);
  const result = await svc.getKnowledge(id);
  if (!result) return c.json({ error: "not found" }, 404);
  return c.json(result);
});
