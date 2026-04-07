import { Hono } from "hono";
import { z } from "zod";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { AsyncOgdService } from "../services/async-ogd-service.js";

const SubmitSchema = z.object({
  evaluationId: z.string().min(1),
  maxPhases: z.number().int().min(1).max(10).optional().default(3),
});

export const ogdPocRoute = new Hono<{
  Bindings: GateEnv;
  Variables: TenantVariables;
}>();

/** POST /api/ogd/jobs — O-G-D 파이프라인 job 제출 */
ogdPocRoute.post("/jobs", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", issues: parsed.error.issues }, 400);
  }

  const { evaluationId, maxPhases } = parsed.data;
  const orgId = c.get("orgId");

  try {
    const svc = new AsyncOgdService(c.env);
    const job = await svc.submitJob(evaluationId, orgId, maxPhases);
    return c.json(job, 202);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return c.json({ error: message }, 500);
  }
});

/** GET /api/ogd/jobs/:id — job 상태 조회 */
ogdPocRoute.get("/jobs/:id", async (c) => {
  const jobId = c.req.param("id");

  try {
    const svc = new AsyncOgdService(c.env);
    const job = await svc.getJob(jobId);
    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }
    return c.json(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return c.json({ error: message }, 500);
  }
});

/** GET /api/ogd/jobs/:id/result — 완료된 job 결과 조회 */
ogdPocRoute.get("/jobs/:id/result", async (c) => {
  const jobId = c.req.param("id");

  try {
    const svc = new AsyncOgdService(c.env);
    const job = await svc.getJob(jobId);
    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }

    if (job.status === "PENDING" || job.status === "RUNNING") {
      return c.json({ status: job.status, message: "Job is still in progress" }, 202);
    }

    if (job.status === "FAILED") {
      return c.json({ status: "FAILED", error: job.error }, 422);
    }

    return c.json({ status: "DONE", result: job.result ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return c.json({ error: message }, 500);
  }
});
