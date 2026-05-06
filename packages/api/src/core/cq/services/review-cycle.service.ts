import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import { type ReviewCycleResult, type ReviewCycleStage } from "../types.js";

interface LLMProvider {
  generate(system: string, user: string): Promise<{ content: string; model: string; tokensUsed: number }>;
}

const STAGE_PROMPTS = {
  initial: "Generate an initial 80% draft response for the given content.",
  self_evaluate: "Review the following draft and identify potential issues or gaps.",
  refine: "Refine the content based on the human review feedback provided.",
};

export class ReviewCycle {
  constructor(
    private readonly db: D1Database,
    private readonly llm: LLMProvider,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async startCycle(input: {
    orgId: string;
    cqEvaluationId?: string;
    initialContent: string;
  }): Promise<ReviewCycleResult> {
    const cycleId = crypto.randomUUID();
    const stages: ReviewCycleResult["stages"] = [];

    const ai80Response = await this.llm.generate(STAGE_PROMPTS.initial, input.initialContent);
    const ai80Content = ai80Response.content;
    await this.recordStage(cycleId, input.orgId, input.cqEvaluationId, "ai_initial_80", ai80Content, "completed");
    stages.push({ stage: "ai_initial_80", content: ai80Content, status: "completed", durationMs: 0 });

    const selfEvalResponse = await this.llm.generate(STAGE_PROMPTS.self_evaluate, ai80Content);
    const selfEvalContent = selfEvalResponse.content;
    await this.recordStage(cycleId, input.orgId, input.cqEvaluationId, "self_eval", selfEvalContent, "completed");
    stages.push({ stage: "self_eval", content: selfEvalContent, status: "completed", durationMs: 0 });

    await this.recordStage(cycleId, input.orgId, input.cqEvaluationId, "human_intensive_20", selfEvalContent, "pending");
    stages.push({ stage: "human_intensive_20", content: selfEvalContent, status: "pending", durationMs: null });

    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit(
      "review_cycle.stage_completed",
      { cycleId, stage: "self_eval", awaitingHuman: true },
      ctx,
    );

    return { cycleId, orgId: input.orgId, stages, finalContent: selfEvalContent };
  }

  async submitHumanReview(cycleId: string, reviewerId: string, reviewedContent: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE cq_review_cycles SET status = 'completed', reviewer = ?, content = ?, completed_at = ?
         WHERE id = ? AND stage = 'human_intensive_20'`,
      )
      .bind(reviewerId, reviewedContent, Date.now(), cycleId)
      .run();

    const cycleRow = await this.db
      .prepare("SELECT org_id, cq_evaluation_id FROM cq_review_cycles WHERE id = ? AND stage = 'ai_initial_80'")
      .bind(cycleId)
      .first<{ org_id: string; cq_evaluation_id: string | null }>();

    const orgId = cycleRow?.org_id ?? "";
    const cqEvaluationId = cycleRow?.cq_evaluation_id ?? undefined;

    const refineResponse = await this.llm.generate(STAGE_PROMPTS.refine, reviewedContent);
    const refineContent = refineResponse.content;
    await this.recordStage(cycleId, orgId, cqEvaluationId, "ai_refinement_80", refineContent, "completed");

    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit("review_cycle.stage_completed", { cycleId, stage: "ai_refinement_80", awaitingHuman: false }, ctx);
  }

  private async recordStage(
    cycleId: string,
    orgId: string,
    cqEvaluationId: string | undefined,
    stage: ReviewCycleStage,
    content: string,
    status: string,
  ): Promise<void> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO cq_review_cycles (id, cq_evaluation_id, org_id, stage, content, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, cqEvaluationId ?? null, orgId, stage, content, status, Date.now())
      .run();
  }
}
