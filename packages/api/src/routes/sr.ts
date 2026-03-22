/**
 * SR (Service Request) Routes — F116 KT DS SR 시나리오 구체화
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { createSrRequest, updateSrRequest, listSrQuery, executeSrRequest, type SrResponse, type SrDetailResponse } from "../schemas/sr.js";
import { SrClassifier } from "../services/sr-classifier.js";
import { SrWorkflowMapper } from "../services/sr-workflow-mapper.js";

export const srRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();
const classifier = new SrClassifier();
const workflowMapper = new SrWorkflowMapper();

function toSrResponse(row: Record<string, unknown>): SrResponse {
  return {
    id: row.id as string, org_id: row.org_id as string, title: row.title as string,
    description: (row.description as string) ?? null, sr_type: row.sr_type as SrResponse["sr_type"],
    priority: row.priority as SrResponse["priority"], status: row.status as SrResponse["status"],
    confidence: (row.confidence as number) ?? 0,
    matched_keywords: row.matched_keywords ? JSON.parse(row.matched_keywords as string) : [],
    workflow_id: (row.workflow_id as string) ?? null,
    created_at: row.created_at as string, updated_at: row.updated_at as string,
    closed_at: (row.closed_at as string) ?? null,
  };
}

srRoute.post("/sr", async (c) => {
  const body = await c.req.json();
  const parsed = createSrRequest.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const { title, description, priority, requester_id } = parsed.data;
  const orgId = c.get("orgId");
  const result = classifier.classify(title, description ?? "");
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO sr_requests (id, org_id, title, description, sr_type, priority, status, confidence, matched_keywords, requester_id) VALUES (?, ?, ?, ?, ?, ?, 'classified', ?, ?, ?)`,
  ).bind(id, orgId, title, description ?? null, result.srType, priority, result.confidence, JSON.stringify(result.matchedKeywords), requester_id ?? null).run();
  return c.json({ id, sr_type: result.srType, confidence: result.confidence, matched_keywords: result.matchedKeywords, status: "classified", suggestedWorkflow: result.suggestedWorkflow }, 201);
});

srRoute.get("/sr", async (c) => {
  const orgId = c.get("orgId");
  const query = listSrQuery.safeParse(c.req.query());
  if (!query.success) return c.json({ error: "Invalid query" }, 400);
  const { status, sr_type, limit, offset } = query.data;
  let sql = "SELECT * FROM sr_requests WHERE org_id = ?";
  const params: unknown[] = [orgId];
  if (status) { sql += " AND status = ?"; params.push(status); }
  if (sr_type) { sql += " AND sr_type = ?"; params.push(sr_type); }
  const countResult = await c.env.DB.prepare(sql.replace("SELECT *", "SELECT COUNT(*) as total")).bind(...params).first<{ total: number }>();
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ items: (results ?? []).map((r) => toSrResponse(r as Record<string, unknown>)), total: countResult?.total ?? 0 });
});

srRoute.get("/sr/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM sr_requests WHERE id = ? AND org_id = ?").bind(c.req.param("id"), c.get("orgId")).first();
  if (!row) return c.json({ error: "SR not found" }, 404);
  const sr = toSrResponse(row as Record<string, unknown>);
  const wr = await c.env.DB.prepare("SELECT * FROM sr_workflow_runs WHERE sr_id = ? ORDER BY started_at DESC LIMIT 1").bind(c.req.param("id")).first();
  const detail: SrDetailResponse = { ...sr, workflow_run: wr ? { id: wr.id as string, workflow_template: wr.workflow_template as string, status: wr.status as string, steps_completed: (wr.steps_completed as number) ?? 0, steps_total: (wr.steps_total as number) ?? 0, result_summary: (wr.result_summary as string) ?? null, started_at: (wr.started_at as string) ?? null, completed_at: (wr.completed_at as string) ?? null } : null };
  return c.json(detail);
});

srRoute.post("/sr/:id/execute", async (c) => {
  const srId = c.req.param("id");
  const orgId = c.get("orgId");
  const body = await c.req.json().catch(() => ({}));
  executeSrRequest.safeParse(body);
  const row = await c.env.DB.prepare("SELECT * FROM sr_requests WHERE id = ? AND org_id = ?").bind(srId, orgId).first();
  if (!row) return c.json({ error: "SR not found" }, 404);
  if (row.status === "in_progress") return c.json({ error: "SR workflow already in progress" }, 409);
  const template = workflowMapper.getWorkflowForType(row.sr_type as SrResponse["sr_type"]);
  await c.env.DB.prepare("UPDATE sr_requests SET status = 'in_progress', workflow_id = ?, updated_at = datetime('now') WHERE id = ?").bind(template.id, srId).run();
  const runId = crypto.randomUUID();
  await c.env.DB.prepare(`INSERT INTO sr_workflow_runs (id, sr_id, workflow_template, status, steps_total, started_at) VALUES (?, ?, ?, 'running', ?, datetime('now'))`).bind(runId, srId, template.id, template.nodes.length).run();
  return c.json({ sr_id: srId, workflow_run_id: runId, template: template.id, steps_total: template.nodes.length, status: "running" }, 202);
});

srRoute.patch("/sr/:id", async (c) => {
  const srId = c.req.param("id");
  const orgId = c.get("orgId");
  const body = await c.req.json();
  const parsed = updateSrRequest.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const existing = await c.env.DB.prepare("SELECT * FROM sr_requests WHERE id = ? AND org_id = ?").bind(srId, orgId).first();
  if (!existing) return c.json({ error: "SR not found" }, 404);
  const updates: string[] = ["updated_at = datetime('now')"];
  const params: unknown[] = [];
  if (parsed.data.status) { updates.push("status = ?"); params.push(parsed.data.status); if (parsed.data.status === "done" || parsed.data.status === "rejected") updates.push("closed_at = datetime('now')"); }
  if (parsed.data.priority) { updates.push("priority = ?"); params.push(parsed.data.priority); }
  if (parsed.data.sr_type) { updates.push("sr_type = ?"); params.push(parsed.data.sr_type); }
  params.push(srId, orgId);
  await c.env.DB.prepare(`UPDATE sr_requests SET ${updates.join(", ")} WHERE id = ? AND org_id = ?`).bind(...params).run();
  const updated = await c.env.DB.prepare("SELECT * FROM sr_requests WHERE id = ? AND org_id = ?").bind(srId, orgId).first();
  return c.json(toSrResponse(updated as Record<string, unknown>));
});
