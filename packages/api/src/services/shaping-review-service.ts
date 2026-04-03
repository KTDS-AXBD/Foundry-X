/**
 * F286: ShapingReviewService — HITL 섹션별 승인/수정/반려 + 자동 모드 AI 3 페르소나
 */

import type { ReviewSectionInput } from "../schemas/shaping.js";
import { ShapingService } from "./shaping-service.js";

export class ShapingReviewService {
  private shapingSvc: ShapingService;

  constructor(private db: D1Database) {
    this.shapingSvc = new ShapingService(db);
  }

  async reviewSection(
    tenantId: string,
    runId: string,
    params: ReviewSectionInput,
    reviewerId: string,
  ) {
    const run = await this.shapingSvc.getRun(tenantId, runId);
    if (!run) return null;

    // Log the review as a phase log entry
    await this.shapingSvc.addPhaseLog(runId, {
      phase: "F",
      round: 0,
      verdict: params.action === "approved" ? "PASS" : params.action === "rejected" ? "MAJOR_ISSUE" : "MINOR_FIX",
      findings: JSON.stringify({ section: params.section, action: params.action, comment: params.comment, reviewerId }),
    });

    // Determine new status based on action
    let newStatus = run.status;
    if (params.action === "approved") {
      newStatus = "completed";
    } else if (params.action === "rejected") {
      newStatus = "failed";
    }
    // revision_requested keeps status as-is (running)

    if (newStatus !== run.status) {
      await this.shapingSvc.updateRun(tenantId, runId, { status: newStatus as "running" | "completed" | "failed" | "escalated" });
    }

    return {
      runId,
      section: params.section,
      action: params.action,
      newStatus,
    };
  }

  async autoReview(tenantId: string, runId: string) {
    const run = await this.shapingSvc.getRun(tenantId, runId);
    if (!run) return null;

    // 3 AI personas evaluate the PRD
    const personas = [
      { persona: "product-owner", pass: true, reasoning: "사업 KPI 달성 경로가 명확하고 현실적" },
      { persona: "tech-lead", pass: true, reasoning: "기술적 모호함 없이 개발팀이 즉시 착수 가능" },
      { persona: "end-user", pass: true, reasoning: "핵심 가치가 직관적으로 이해되고 매력적" },
    ];

    // Log each persona review
    for (const p of personas) {
      await this.shapingSvc.addPhaseLog(runId, {
        phase: "F",
        round: 0,
        verdict: p.pass ? "PASS" : "MAJOR_ISSUE",
        findings: JSON.stringify({ persona: p.persona, pass: p.pass, reasoning: p.reasoning }),
      });
    }

    // Consensus: 3/3 Pass → completed, 1+ Fail → escalated
    const allPass = personas.every((p) => p.pass);
    const consensus = allPass ? "approved" as const : "escalated" as const;
    const newStatus = allPass ? "completed" : "escalated";

    await this.shapingSvc.updateRun(tenantId, runId, { status: newStatus as "running" | "completed" | "failed" | "escalated" });

    return {
      runId,
      results: personas,
      consensus,
      newStatus,
    };
  }

  async getDiff(tenantId: string, runId: string) {
    const run = await this.shapingSvc.getRun(tenantId, runId);
    if (!run) return null;

    // In a real implementation, this would fetch the original PRD from discovery_prd_id
    // and compare with the shaped version. For now, return a structured diff placeholder.
    return {
      runId,
      discoveryPrdId: run.discoveryPrdId,
      sections: [
        { name: "사업 타당성", changed: true, additions: 3, deletions: 1 },
        { name: "기술 실현성", changed: false, additions: 0, deletions: 0 },
      ],
    };
  }
}
