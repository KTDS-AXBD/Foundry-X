// ─── F355b (Sprint 219): Internal Prototype Jobs — Decode-X handoff endpoint ───
// X-Internal-Secret 전용 미들웨어 적용, JWT authMiddleware 우회
// orgId는 body에서 명시적으로 받음 (JWT 컨텍스트 없음)

import { Hono } from "hono";
import { z } from "zod";
import { CreatePrototypeJobSchema } from "../schemas/prototype-job.js";
import { PrototypeJobService } from "../services/prototype-job-service.js";
import type { Env } from "../../../env.js";

export const internalPrototypeJobsRoute = new Hono<{ Bindings: Env }>();

const InternalCreateSchema = CreatePrototypeJobSchema.extend({
  orgId: z.string().min(1),
  callerService: z.string().optional(),
});

// POST /internal/prototype-jobs — Decode-X handoff 전용
internalPrototypeJobsRoute.post("/internal/prototype-jobs", async (c) => {
  const secret = c.req.header("X-Internal-Secret");
  const expected = c.env.DECODE_X_HANDOFF_SECRET;
  if (!secret || !expected || secret !== expected) {
    return c.json({ error: "Unauthorized", code: "INVALID_INTERNAL_SECRET" }, 401);
  }

  const raw = await c.req.json().catch(() => null);
  if (!raw) return c.json({ error: "Invalid JSON body" }, 400);

  const parsed = InternalCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { orgId, prdContent, prdTitle } = parsed.data;
  const svc = new PrototypeJobService(c.env.DB);
  const job = await svc.create(orgId, prdContent, prdTitle);
  return c.json(job, 201);
});
