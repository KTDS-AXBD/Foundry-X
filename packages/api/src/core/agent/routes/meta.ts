// ─── F530: Meta Layer 라우트 — Human Approval API (Sprint 283) ───

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../env.js";
import { MetaApprovalService, NotFoundError } from "../services/meta-approval.js";
import { DiagnosticCollector } from "../services/diagnostic-collector.js";
import { MetaAgent } from "../services/meta-agent.js";

export const metaRoute = new Hono<{ Bindings: Env }>();

// GET /api/meta/proposals
metaRoute.get("/meta/proposals", async (c) => {
  const status = c.req.query("status") as "pending" | "approved" | "rejected" | undefined;
  const sessionId = c.req.query("sessionId");
  const agentId = c.req.query("agentId");

  const svc = new MetaApprovalService(c.env.DB);
  const proposals = await svc.list({ status, sessionId, agentId });

  return c.json({ proposals });
});

const DiagnoseSchema = z.object({
  sessionId: z.string().min(1),
  agentId: z.string().min(1),
});

const RejectSchema = z.object({ reason: z.string().min(1) });

// POST /api/meta/diagnose
metaRoute.post("/meta/diagnose", async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = DiagnoseSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "Invalid request body" }, 400);
    const { sessionId, agentId } = parsed.data;

    const collector = new DiagnosticCollector(c.env.DB);
    const report = await collector.collect(sessionId, agentId);

    const apiKey = c.env.ANTHROPIC_API_KEY;
    let proposals: Awaited<ReturnType<MetaAgent["diagnose"]>> = [];

    if (apiKey) {
      const metaAgent = new MetaAgent({ apiKey });
      proposals = await metaAgent.diagnose(report);

      const svc = new MetaApprovalService(c.env.DB);
      for (const p of proposals) {
        await svc.save(p);
      }
    }

    return c.json({ report, proposals });
  },
);

// POST /api/meta/proposals/:id/approve
metaRoute.post("/meta/proposals/:id/approve", async (c) => {
  const { id } = c.req.param();
  const svc = new MetaApprovalService(c.env.DB);

  try {
    const proposal = await svc.approve(id);
    return c.json({ proposal });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

// POST /api/meta/proposals/:id/reject
metaRoute.post("/meta/proposals/:id/reject", async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json().catch(() => null);
    const parsed = RejectSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "reason is required" }, 400);
    const { reason } = parsed.data;
    const svc = new MetaApprovalService(c.env.DB);

    try {
      const proposal = await svc.reject(id, reason);
      return c.json({ proposal });
    } catch (err) {
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      throw err;
    }
  },
);
