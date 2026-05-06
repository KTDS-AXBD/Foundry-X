// F616: Launch-X Hono sub-app — POST /package, POST /deploy, GET /status/:release_id
import { Hono } from "hono";
import { AuditBus } from "../../infra/types.js";
import { LaunchEngine } from "../services/launch-engine.service.js";
import { PackageRequestSchema, DeployRequestSchema } from "../schemas/launch.js";
import type { Env } from "../../../env.js";

export const launchApp = new Hono<{ Bindings: Env }>();

function getEngine(env: Env): LaunchEngine {
  const bus = new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
  return new LaunchEngine(env.DB, bus);
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
