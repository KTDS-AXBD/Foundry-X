/**
 * Sprint 81: IR Proposals Routes — IR Bottom-up 채널 (F240)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { IrProposalService } from "../services/ir-proposal-service.js";
import {
  CreateIrProposalSchema,
  ReviewIrProposalSchema,
  IrProposalFilterSchema,
} from "../schemas/ir-proposal.schema.js";

export const irProposalsRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /ir-proposals — 제안 제출
irProposalsRoute.post("/ir-proposals", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateIrProposalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new IrProposalService(c.env.DB);
  const proposal = await svc.submit({ ...parsed.data, orgId, submittedBy: userId });

  return c.json(proposal, 201);
});

// GET /ir-proposals — 목록
irProposalsRoute.get("/ir-proposals", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = IrProposalFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new IrProposalService(c.env.DB);
  const proposals = await svc.list(orgId, parsed.data);
  return c.json(proposals);
});

// GET /ir-proposals/:id — 상세
irProposalsRoute.get("/ir-proposals/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new IrProposalService(c.env.DB);
  const proposal = await svc.getById(id, orgId);
  if (!proposal) {
    return c.json({ error: "IR proposal not found" }, 404);
  }

  return c.json(proposal);
});

// POST /ir-proposals/:id/approve — 승인
irProposalsRoute.post("/ir-proposals/:id/approve", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const id = c.req.param("id");

  const body = await c.req.json().catch(() => ({}));
  const parsed = ReviewIrProposalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new IrProposalService(c.env.DB);
  try {
    const result = await svc.approve(id, orgId, { reviewedBy: userId, comment: parsed.data.comment });
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});

// POST /ir-proposals/:id/reject — 반려
irProposalsRoute.post("/ir-proposals/:id/reject", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const id = c.req.param("id");

  const body = await c.req.json().catch(() => ({}));
  const parsed = ReviewIrProposalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new IrProposalService(c.env.DB);
  try {
    const proposal = await svc.reject(id, orgId, { reviewedBy: userId, comment: parsed.data.comment });
    return c.json(proposal);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});
