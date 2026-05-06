import { Hono } from "hono";
import { SystemKnowledgeService } from "../services/system-knowledge.service.js";
import { DomainInitService } from "../services/domain-init.service.js";
import { RegisterSystemKnowledgeSchema, DomainInitSchema } from "../schemas/asset.js";
import { EntityRegistry } from "../../entity/services/entity-registry.js";
import { PolicyEngine } from "../../policy/services/policy-engine.service.js";
import { AuditBus } from "../../infra/audit-bus.js";
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

// F623: POST /asset/domain-init — 5-Asset 스캐폴드 (domainName + orgId + ownerId)
assetApp.post("/domain-init", async (c) => {
  const body = await c.req.json();
  const parsed = DomainInitSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }
  const auditBus = new AuditBus(c.env.DB, c.env.AUDIT_HMAC_KEY ?? "dev-key");
  const svc = new DomainInitService(
    new EntityRegistry(c.env.DB),
    new PolicyEngine(c.env.DB, auditBus),
    new SystemKnowledgeService(c.env.DB),
    auditBus,
  );
  const result = await svc.scaffold(parsed.data);
  return c.json(result, 200);
});
