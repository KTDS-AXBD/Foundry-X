// ─── F530/F533: Meta Layer 라우트 — Human Approval API + Proposal Apply (Sprint 283/286) ───
// ─── F542: META_AGENT_MODEL 지원 + A/B 비교 저장 + rubric 자동 채점 (Sprint 290) ───

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../env.js";
import { MetaApprovalService, NotFoundError } from "../services/meta-approval.js";
import { DiagnosticCollector } from "../services/diagnostic-collector.js";
import { MetaAgent } from "../services/meta-agent.js";
import { ProposalApplyService, AlreadyAppliedError, NotApprovedError, ProposalNotFoundError } from "../services/proposal-apply.js";
import { ModelComparisonService } from "../services/model-comparisons.js";
import { ProposalRubric } from "../services/proposal-rubric.js";
import { MODEL_SONNET, MODEL_HAIKU } from "@foundry-x/shared";

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
// F542: META_AGENT_MODEL env var로 모델 선택, A/B 비교 저장, rubric 자동 채점
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
      // F542 M2: META_AGENT_MODEL env var 지원 ("both" → A/B 비교 실행)
      const modelFlag = c.env.META_AGENT_MODEL ?? MODEL_SONNET;
      const runAbTest = modelFlag === "both" || modelFlag === "ab";

      const primaryModel = runAbTest ? MODEL_SONNET : modelFlag;
      const metaAgent = new MetaAgent({ apiKey, model: primaryModel });
      proposals = await metaAgent.diagnose(report);

      // F542 M4: rubric 자동 채점 후 DB 저장
      const rubric = new ProposalRubric();
      const approveSvc = new MetaApprovalService(c.env.DB);
      for (const p of proposals) {
        const rubricScore = rubric.score(p);
        await approveSvc.save({ ...p, rubricScore });
      }

      // F542 M3: A/B 비교 — 주 모델 결과 저장
      const reportId = `${report.sessionId}:${report.collectedAt}`;
      const compSvc = new ModelComparisonService(c.env.DB);
      const rawProposals = await metaAgent.diagnoseRaw(report);
      await compSvc.save({
        sessionId: report.sessionId,
        reportId,
        model: primaryModel,
        promptVersion: metaAgent.promptVersion,
        proposalsJson: JSON.stringify(rawProposals),
        proposalCount: rawProposals.length,
      });

      // F542 M3: A/B 비교 — Haiku 실행 (both 모드만)
      if (runAbTest) {
        const haikuAgent = new MetaAgent({ apiKey, model: MODEL_HAIKU });
        const haikuRaw = await haikuAgent.diagnoseRaw(report).catch(() => []);
        await compSvc.save({
          sessionId: report.sessionId,
          reportId,
          model: MODEL_HAIKU,
          promptVersion: haikuAgent.promptVersion,
          proposalsJson: JSON.stringify(haikuRaw),
          proposalCount: haikuRaw.length,
        });
      }
    }

    return c.json({ report, proposals });
  },
);

// GET /api/meta/comparisons/:reportId — F542 M3
metaRoute.get("/meta/comparisons/:reportId", async (c) => {
  const { reportId } = c.req.param();
  const svc = new ModelComparisonService(c.env.DB);
  const comparisons = await svc.findByReportId(reportId);
  return c.json({ comparisons });
});

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

// POST /api/meta/proposals/:id/apply
metaRoute.post("/meta/proposals/:id/apply", async (c) => {
  const { id } = c.req.param();
  const svc = new ProposalApplyService(c.env.DB);

  try {
    const proposal = await svc.apply(id);
    return c.json({ proposal });
  } catch (err) {
    if (err instanceof ProposalNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    if (err instanceof NotApprovedError) {
      return c.json({ error: err.message }, 422);
    }
    if (err instanceof AlreadyAppliedError) {
      return c.json({ error: err.message }, 409);
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
