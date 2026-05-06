// F602: core/diagnostic sub-app — POST /diagnostic/run + GET /diagnostic/findings
import { Hono } from "hono";
import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import { DiagnosticEngine } from "../services/diagnostic-engine.service.js";
import { RunDiagnosticSchema } from "../schemas/diagnostic.js";
import type { Env } from "../../../env.js";

export const diagnosticApp = new Hono<{ Bindings: Env }>();

function getEngine(env: Env): DiagnosticEngine {
  const bus = new AuditBus(env.DB, env.AUDIT_HMAC_KEY ?? "default-hmac-key-32chars-pad");
  return new DiagnosticEngine(env.DB, bus);
}

diagnosticApp.post("/run", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "invalid JSON" }, 400);

  const parsed = RunDiagnosticSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const engine = getEngine(c.env);
  const report = await engine.runAll(parsed.data.orgId, parsed.data.diagnosticTypes);
  return c.json(report, 200);
});

diagnosticApp.get("/findings", async (c) => {
  const runId = c.req.query("run_id");
  const type = c.req.query("type");

  if (!runId) return c.json({ error: "run_id is required" }, 400);

  const engine = getEngine(c.env);
  let findings = await engine.getFindings(runId);

  if (type) {
    findings = findings.filter((f) => f.diagnosticType === type);
  }

  return c.json({ items: findings, total: findings.length }, 200);
});
