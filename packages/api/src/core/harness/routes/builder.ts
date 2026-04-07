// ─── Builder Server API (Webhook Secret 인증) ───
// Prototype Builder Server가 Job을 폴링/갱신하는 전용 엔드포인트.
// JWT 대신 WEBHOOK_SECRET 헤더로 인증.

import { Hono } from "hono";
import { PrototypeJobService } from "../services/prototype-job-service.js";
import { PrototypeQualityService } from "../services/prototype-quality-service.js";
import { UpdatePrototypeJobSchema } from "../schemas/prototype-job.js";
import { InsertQualitySchema } from "../schemas/prototype-quality-schema.js";
import type { Env } from "../../../env.js";

export const builderRoute = new Hono<{ Bindings: Env }>();

// Webhook Secret 검증 미들웨어 — /builder/* 경로에만 적용 (Sprint 162 버그 수정)
builderRoute.use("/builder/*", async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const builderSecret = (c.env as unknown as Record<string, string>)?.BUILDER_SECRET;
  const webhookSecret = c.env?.WEBHOOK_SECRET;
  const secret = builderSecret || webhookSecret;
  if (!secret || token !== secret) {
    return c.json({ error: "Invalid builder token" }, 401);
  }
  return next();
});

// POST /builder/jobs — Job 등록 (E2E 테스트용)
builderRoute.post("/builder/jobs", async (c) => {
  const raw = await c.req.json() as { prdContent: string; prdTitle: string; orgId?: string };
  if (!raw.prdContent || raw.prdContent.length < 10) {
    return c.json({ error: "prdContent required (min 10 chars)" }, 400);
  }
  const orgId = raw.orgId || "org_builder_test";
  const svc = new PrototypeJobService(c.env.DB);
  const job = await svc.create(orgId, raw.prdContent, raw.prdTitle || "Untitled");
  return c.json(job, 201);
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

// ─── Quality Score Endpoints (Sprint 176: F387) ───

// POST /builder/quality — 품질 점수 저장 (Builder Server → API)
builderRoute.post("/builder/quality", async (c) => {
  const raw = await c.req.json();
  const parsed = InsertQualitySchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const svc = new PrototypeQualityService(c.env.DB);
  const record = await svc.insert(parsed.data);
  return c.json(record, 201);
});

// GET /builder/:jobId/quality — Job의 라운드별 품질 점수 조회
builderRoute.get("/builder/:jobId/quality", async (c) => {
  const jobId = c.req.param("jobId");
  const svc = new PrototypeQualityService(c.env.DB);
  const scores = await svc.listByJob(jobId);
  return c.json({ scores });
});

// GET /builder/quality/stats — 전체 품질 통계
builderRoute.get("/builder/quality/stats", async (c) => {
  const svc = new PrototypeQualityService(c.env.DB);
  const stats = await svc.getStats();
  return c.json(stats);
});
