// ─── Builder Server API (Webhook Secret 인증) ───
// Prototype Builder Server가 Job을 폴링/갱신하는 전용 엔드포인트.
// JWT 대신 WEBHOOK_SECRET 헤더로 인증.

import { Hono } from "hono";
import { PrototypeJobService } from "../services/prototype-job-service.js";
import { UpdatePrototypeJobSchema } from "../schemas/prototype-job.js";
import type { Env } from "../env.js";

export const builderRoute = new Hono<{ Bindings: Env }>();

// Webhook Secret 검증 미들웨어
builderRoute.use("/*", async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const secret = c.env?.WEBHOOK_SECRET;
  if (!secret || token !== secret) {
    return c.json({ error: "Invalid builder token" }, 401);
  }
  return next();
});

// GET /builder/jobs?status=queued — 대기 Job 목록 (모든 org)
builderRoute.get("/builder/jobs", async (c) => {
  const status = c.req.query("status");
  const limit = Number(c.req.query("limit") ?? 10);

  const db = c.env.DB;
  const params: unknown[] = [];
  let where = "1=1";
  if (status) {
    where += " AND status = ?";
    params.push(status);
  }

  const rows = await db
    .prepare(
      `SELECT * FROM prototype_jobs WHERE ${where} ORDER BY created_at ASC LIMIT ?`,
    )
    .bind(...params, limit)
    .all();

  const items = (rows.results ?? []).map((row: Record<string, unknown>) => ({
    id: row["id"],
    orgId: row["org_id"],
    prdTitle: row["prd_title"],
    status: row["status"],
  }));

  return c.json({ items });
});

// GET /builder/jobs/:id — Job 상세 (prdContent 포함)
builderRoute.get("/builder/jobs/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;

  const row = await db
    .prepare("SELECT * FROM prototype_jobs WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  if (!row) return c.json({ error: "Job not found" }, 404);

  return c.json({
    id: row["id"],
    orgId: row["org_id"],
    prdTitle: row["prd_title"],
    prdContent: row["prd_content"],
    status: row["status"],
    buildLog: row["build_log"] ?? "",
    errorMessage: row["error_message"],
  });
});

// PATCH /builder/jobs/:id — Job 상태/결과 갱신
builderRoute.patch("/builder/jobs/:id", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json();
  const parsed = UpdatePrototypeJobSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const db = c.env.DB;
  const row = await db
    .prepare("SELECT * FROM prototype_jobs WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!row) return c.json({ error: "Job not found" }, 404);

  // org_id를 알아야 서비스 호출 가능
  const orgId = row["org_id"] as string;
  const svc = new PrototypeJobService(db);
  const { status, ...updates } = parsed.data;

  try {
    if (status) {
      const result = await svc.transition(id, orgId, status, updates);
      return c.json(result);
    }
    const currentStatus = row["status"] as string;
    const result = await svc.transition(id, orgId, currentStatus, updates);
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 409);
  }
});
