import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import {
  CQ_AXES,
  CQ_AXIS_WEIGHTS,
  type CQAxis,
  type AxisScore,
  type CQEvaluationResult,
  type CQHandoffDecision,
} from "../types.js";

const CQ_EVAL_SYSTEM_PROMPT = `You are a quality evaluation agent. Evaluate the given LLM response on 5 axes.
Return ONLY valid JSON with this structure:
{
  "ontology_usage": { "rawScore": <0-100>, "reasoning": "<brief>" },
  "tool_selection": { "rawScore": <0-100>, "reasoning": "<brief>" },
  "code_quality": { "rawScore": <0-100>, "reasoning": "<brief>" },
  "result_match": { "rawScore": <0-100>, "reasoning": "<brief>" },
  "governance": { "rawScore": <0-100>, "reasoning": "<brief>" }
}`;

function buildCQEvalPrompt(
  question: { question_text: string; answer_text: string },
  llmCallContext: { sessionId: string; response: string; toolCalls?: unknown[] },
): string {
  return `Reference question: ${question.question_text}
Reference answer: ${question.answer_text}
LLM response to evaluate: ${llmCallContext.response}
Tool calls made: ${JSON.stringify(llmCallContext.toolCalls ?? [])}`;
}

function parseAxisScores(content: string): Record<CQAxis, AxisScore> | null {
  try {
    const raw = JSON.parse(content) as Record<string, { rawScore: number; reasoning: string }>;
    const result: Partial<Record<CQAxis, AxisScore>> = {};
    for (const axis of CQ_AXES) {
      const entry = raw[axis];
      if (!entry) return null;
      result[axis] = {
        axis,
        rawScore: entry.rawScore,
        weighted: 0,
        reasoning: entry.reasoning,
      };
    }
    return result as Record<CQAxis, AxisScore>;
  } catch {
    return null;
  }
}

function defaultAxisScores(): Record<CQAxis, AxisScore> {
  const result: Partial<Record<CQAxis, AxisScore>> = {};
  for (const axis of CQ_AXES) {
    result[axis] = { axis, rawScore: 50, weighted: 0, reasoning: "fallback" };
  }
  return result as Record<CQAxis, AxisScore>;
}

interface LLMProvider {
  generate(system: string, user: string): Promise<{ content: string; model: string; tokensUsed: number }>;
}

export class CQEvaluator {
  constructor(
    private readonly db: D1Database,
    private readonly llm: LLMProvider,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async evaluate(input: {
    orgId: string;
    questionId: string;
    llmCallContext: { sessionId: string; response: string; toolCalls?: unknown[] };
  }): Promise<CQEvaluationResult> {
    const question = await this.db
      .prepare("SELECT id, question_text, answer_text FROM cq_questions WHERE id = ?")
      .bind(input.questionId)
      .first<{ id: string; question_text: string; answer_text: string }>();

    const questionData = question ?? {
      id: input.questionId,
      question_text: "",
      answer_text: "",
    };

    const userPrompt = buildCQEvalPrompt(questionData, input.llmCallContext);
    const llmResponse = await this.llm.generate(CQ_EVAL_SYSTEM_PROMPT, userPrompt);

    let axisScores = parseAxisScores(llmResponse.content) ?? defaultAxisScores();

    let total = 0;
    for (const axis of CQ_AXES) {
      const weighted = axisScores[axis].rawScore * (CQ_AXIS_WEIGHTS[axis] / 100);
      axisScores[axis] = { ...axisScores[axis], weighted };
      total += weighted;
    }
    const totalScore = Math.round(total);

    const handoffDecision: CQHandoffDecision = totalScore >= 90 ? "handoff" : "human_review";
    const id = crypto.randomUUID();
    const evaluatedAt = Date.now();

    await this.db
      .prepare(
        `INSERT INTO cq_evaluations (id, org_id, question_id, axis_scores, total_score, handoff_decision, evaluated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.orgId, input.questionId, JSON.stringify(axisScores), totalScore, handoffDecision, evaluatedAt)
      .run();

    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit("cq.evaluated", { id, orgId: input.orgId, totalScore, handoffDecision }, ctx);

    if (handoffDecision === "handoff") {
      await this.auditBus.emit("cq.handoff", { evaluationId: id, orgId: input.orgId, totalScore }, ctx);
    }

    return { id, orgId: input.orgId, questionId: input.questionId, axisScores, totalScore, handoffDecision, evaluatedAt };
  }
}
