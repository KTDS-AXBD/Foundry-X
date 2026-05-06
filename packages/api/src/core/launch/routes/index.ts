// F616+F618: Launch-X Hono sub-app — package/deploy/status + skill-registry/object-store/rollback
import { Hono } from "hono";
import { AuditBus } from "../../infra/types.js";
import { LaunchEngine } from "../services/launch-engine.service.js";
import { SkillRegistryService } from "../services/skill-registry.service.js";
import { ObjectStoreService } from "../services/object-store.service.js";
import { RollbackService } from "../services/rollback.service.js";
import { PackageRequestSchema, DeployRequestSchema, RegisterSkillSchema, RollbackRequestSchema } from "../schemas/launch.js";
import type { Env } from "../../../env.js";

export const launchApp = new Hono<{ Bindings: Env }>();

function getBus(env: Env) {
  return new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
}

function getEngine(env: Env): LaunchEngine {
  return new LaunchEngine(env.DB, getBus(env));
}

launchApp.post("/package", async (c) => {
  const body = await c.req.json();
  const parsed = PackageRequestSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const manifest = await getEngine(c.env).package(parsed.data);
  return c.json(manifest, 200);
});

launchApp.post("/deploy", async (c) => {
  const body = await c.req.json();
  const parsed = DeployRequestSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const manifestRaw = await c.env.DB
    .prepare("SELECT manifest_json FROM launch_decisions WHERE release_id = ? ORDER BY decided_at DESC LIMIT 1")
    .bind(parsed.data.releaseId)
    .first<{ manifest_json: string }>();

  if (!manifestRaw) return c.json({ error: "release not found" }, 404);

  const manifest = JSON.parse(manifestRaw.manifest_json);
  const engine = getEngine(c.env);

  if (parsed.data.launchType === 1) {
    const result = await engine.publishType1(manifest);
    return c.json(result, 200);
  } else {
    const result = await engine.deployType2(manifest);
    return c.json(result, 200);
  }
});

launchApp.get("/status/:release_id", async (c) => {
  const releaseId = c.req.param("release_id");
  const rows = await c.env.DB
    .prepare("SELECT * FROM launch_decisions WHERE release_id = ? ORDER BY decided_at DESC")
    .bind(releaseId)
    .all();
  return c.json({ decisions: rows.results ?? [] });
});

// F618: Skill Registry endpoints
launchApp.post("/skill-registry/register", async (c) => {
  const body = await c.req.json();
  const parsed = RegisterSkillSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const svc = new SkillRegistryService(c.env.DB, getBus(c.env));
  const result = await svc.register(parsed.data);
  return c.json(result, 200);
});

launchApp.get("/skill-registry/:skill_id", async (c) => {
  const svc = new SkillRegistryService(c.env.DB, getBus(c.env));
  const entry = await svc.lookup(c.req.param("skill_id"));
  if (!entry) return c.json({ error: "not found" }, 404);
  return c.json(entry, 200);
});

// F618: Object Store endpoints (stub)
launchApp.post("/object-store/upload", async (c) => {
  const body = await c.req.json<{ releaseId: string; content?: string }>();
  if (!body.releaseId) return c.json({ error: "releaseId required" }, 400);
  const svc = new ObjectStoreService(getBus(c.env));
  const result = await svc.uploadZip(body.releaseId, body.content ?? "");
  return c.json(result, 200);
});

launchApp.get("/object-store/download/:release_id", async (c) => {
  const svc = new ObjectStoreService(getBus(c.env));
  const url = await svc.getDownloadUrl(c.req.param("release_id"));
  return c.json({ downloadUrl: url }, 200);
});

// F618: Rollback endpoints
launchApp.post("/rollback", async (c) => {
  const body = await c.req.json();
  const parsed = RollbackRequestSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);
  const svc = new RollbackService(c.env.DB, getBus(c.env));
  const result = await svc.executeRollback(parsed.data);
  return c.json(result, 200);
});

launchApp.get("/rollback/history/:release_id", async (c) => {
  const svc = new RollbackService(c.env.DB, getBus(c.env));
  const history = await svc.getRollbackHistory(c.req.param("release_id"));
  return c.json({ history }, 200);
});
