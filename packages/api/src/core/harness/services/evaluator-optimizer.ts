import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "../../../agent/services/execution-types.js";
import type { AgentRunner } from "../../../agent/services/agent-runner.js";
import type { EvaluationCriteria, EvaluationScore } from "../../../modules/gate/services/evaluation-criteria.js";

// ── Types ───────────────────────────────────────────────────

export interface EvaluatorOptimizerConfig {
  maxIterations: number;
  qualityThreshold: number; // 0-100
  criteria: EvaluationCriteria[];
  generatorRunner: AgentRunner;
  evaluatorRunner?: AgentRunner;
}

export interface IterationRecord {
  iteration: number;
  result: AgentExecutionResult;
  scores: EvaluationScore[];
  aggregateScore: number;
  feedback: string[];
}

export interface EvaluationLoopResult {
  finalResult: AgentExecutionResult;
  finalScore: number;
  iterations: number;
  history: IterationRecord[];
  converged: boolean;
  totalTokensUsed: number;
  totalDuration: number;
}

// ── EvaluatorOptimizer ──────────────────────────────────────

export class EvaluatorOptimizer {
  static readonly HARD_MAX_ITERATIONS = 5;

  private readonly maxIterations: number;
  private readonly qualityThreshold: number;
  private readonly criteria: EvaluationCriteria[];
  private readonly generatorRunner: AgentRunner;

  constructor(config: EvaluatorOptimizerConfig) {
    this.maxIterations = Math.min(
      config.maxIterations,
      EvaluatorOptimizer.HARD_MAX_ITERATIONS,
    );
    this.qualityThreshold = config.qualityThreshold;
    this.criteria = config.criteria;
    this.generatorRunner = config.generatorRunner;
  }

  async run(request: AgentExecutionRequest): Promise<EvaluationLoopResult> {
    const history: IterationRecord[] = [];
    let currentRequest = request;
    let converged = false;

    for (let i = 1; i <= this.maxIterations; i++) {
      let result: AgentExecutionResult;
      try {
        result = await this.generatorRunner.execute(currentRequest);
      } catch {
        // Runner failure — record a failed iteration and continue
        const failedRecord: IterationRecord = {
          iteration: i,
          result: {
            status: "failed",
            output: {},
            tokensUsed: 0,
            model: "unknown",
            duration: 0,
          },
          scores: [],
          aggregateScore: 0,
          feedback: ["Runner execution failed"],
        };
        history.push(failedRecord);
        continue;
      }

      const scores = this.criteria.map((c) => c.evaluate(result, currentRequest));
      const aggregateScore = this.weightedAverage(scores);
      const feedback = scores.flatMap((s) => s.feedback);

      history.push({ iteration: i, result, scores, aggregateScore, feedback });

      if (aggregateScore >= this.qualityThreshold) {
        converged = true;
        break;
      }

      // Build improved request for next iteration
      currentRequest = this.buildImprovedRequest(
        currentRequest,
        result,
        feedback,
      );
    }

    return this.buildResult(history, converged);
  }

  private weightedAverage(scores: EvaluationScore[]): number {
    if (scores.length === 0) return 0;

    const totalWeight = this.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) return 0;

    let weightedSum = 0;
    for (let i = 0; i < scores.length; i++) {
      const weight = this.criteria[i]?.weight ?? 0;
      weightedSum += (scores[i]?.score ?? 0) * weight;
    }

    return weightedSum / totalWeight;
  }

  private buildImprovedRequest(
    original: AgentExecutionRequest,
    lastResult: AgentExecutionResult,
    feedback: string[],
  ): AgentExecutionRequest {
    const feedbackBlock =
      "\n\n--- Improvement Feedback ---\n" +
      feedback.map((f) => `- ${f}`).join("\n");

    const existingInstructions = original.context.instructions ?? "";
    const newInstructions = existingInstructions + feedbackBlock;

    // Merge generated code into fileContents for context
    const mergedFileContents: Record<string, string> = {
      ...(original.context.fileContents ?? {}),
    };
    for (const file of lastResult.output.generatedCode ?? []) {
      mergedFileContents[file.path] = file.content;
    }

    return {
      ...original,
      context: {
        ...original.context,
        instructions: newInstructions,
        fileContents: mergedFileContents,
      },
    };
  }

  private buildResult(
    history: IterationRecord[],
    converged: boolean,
  ): EvaluationLoopResult {
    // Find the best result by aggregate score
    let bestRecord = history[0];
    for (const record of history) {
      if (record.aggregateScore > (bestRecord?.aggregateScore ?? -1)) {
        bestRecord = record;
      }
    }

    // If converged, use the last record (which passed threshold)
    const finalRecord = converged
      ? history[history.length - 1] ?? bestRecord
      : bestRecord;

    if (!finalRecord) {
      // Should never happen with non-empty history, but satisfy TS
      const empty: AgentExecutionResult = { status: "failed", output: {}, tokensUsed: 0, model: "unknown", duration: 0 };
      return { finalResult: empty, finalScore: 0, iterations: 0, history: [], converged: false, totalTokensUsed: 0, totalDuration: 0 };
    }

    const totalTokensUsed = history.reduce(
      (sum, r) => sum + r.result.tokensUsed,
      0,
    );
    const totalDuration = history.reduce(
      (sum, r) => sum + r.result.duration,
      0,
    );

    return {
      finalResult: finalRecord.result,
      finalScore: finalRecord.aggregateScore,
      iterations: history.length,
      history,
      converged,
      totalTokensUsed,
      totalDuration,
    };
  }
}
