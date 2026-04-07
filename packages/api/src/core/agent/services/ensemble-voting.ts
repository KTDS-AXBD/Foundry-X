/**
 * F147: 멀티모델 앙상블 투표 (EnsembleVoting)
 * 여러 LLM 모델에게 동일한 태스크를 병렬 실행시키고,
 * 투표 전략(majority/quality-score/weighted)으로 최적 결과를 선택한다.
 */
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import { OpenRouterRunner } from "./openrouter-runner.js";

// ─── Types ───

export type VotingStrategy = "majority" | "quality-score" | "weighted";

export interface EnsembleConfig {
  models: string[];
  strategy: VotingStrategy;
  weights?: Record<string, number>;
  evaluationModel?: string;
  timeoutMs?: number;
}

export interface ModelResult {
  model: string;
  result: AgentExecutionResult | null;
  score: number;
  latencyMs: number;
  error?: string;
}

export interface EnsembleResult {
  winner: AgentExecutionResult;
  winnerModel: string;
  winnerScore: number;
  allResults: ModelResult[];
  votingDetails: {
    strategy: VotingStrategy;
    totalModels: number;
    successfulModels: number;
    averageLatencyMs: number;
  };
}

export interface StrategyInfo {
  name: VotingStrategy;
  description: string;
  costMultiplier: number;
  bestFor: string;
}

// ─── Constants ───

export const VOTING_STRATEGIES: StrategyInfo[] = [
  {
    name: "majority",
    description: "결과 간 유사도를 비교하여 다수결로 최적 결과 선택",
    costMultiplier: 1.0,
    bestFor: "빠른 합의가 필요한 코드 리뷰, 분석 태스크",
  },
  {
    name: "quality-score",
    description: "별도 평가 모델이 각 결과를 0-100 점수로 채점",
    costMultiplier: 1.5,
    bestFor: "높은 품질이 중요한 코드 생성, 설계 태스크",
  },
  {
    name: "weighted",
    description: "모델별 가중치와 토큰 효율성으로 점수 산출",
    costMultiplier: 1.0,
    bestFor: "비용 대비 효율 최적화가 필요한 반복 태스크",
  },
];

export const ENSEMBLE_EVALUATION_PROMPT = `You are an expert evaluator for AI-generated code analysis results.
Score the following result on a scale of 0-100 based on:
- Accuracy and correctness (40%)
- Completeness of analysis (30%)
- Actionability of suggestions (20%)
- Clarity and formatting (10%)

Respond with ONLY a JSON object: { "score": <number>, "reasoning": "<brief explanation>" }

Result to evaluate:
`;

// ─── Service ───

export class EnsembleVoting {
  static readonly MIN_MODELS = 2;
  static readonly MAX_MODELS = 5;
  static readonly DEFAULT_TIMEOUT_MS = 30_000;

  private apiKey: string;

  constructor(
    private env: {
      OPENROUTER_API_KEY?: string;
      OPENROUTER_DEFAULT_MODEL?: string;
      ANTHROPIC_API_KEY?: string;
    },
  ) {
    this.apiKey = env.OPENROUTER_API_KEY ?? "";
  }

  async executeEnsemble(
    request: AgentExecutionRequest,
    config: EnsembleConfig,
  ): Promise<EnsembleResult> {
    this.validateConfig(config);

    const runners = config.models.map(
      (model) => new OpenRouterRunner(this.apiKey, model),
    );

    const startTimes = config.models.map(() => Date.now());
    const settled = await Promise.allSettled(
      runners.map((runner, i) => {
        startTimes[i] = Date.now();
        return runner.execute(request);
      }),
    );

    const allResults: ModelResult[] = settled.map((s, i): ModelResult => {
      const latencyMs = Date.now() - (startTimes[i] ?? Date.now());
      const model = config.models[i] ?? "unknown";
      if (s.status === "fulfilled") {
        return {
          model,
          result: s.value,
          score: 0,
          latencyMs,
        };
      }
      return {
        model,
        result: null,
        score: 0,
        latencyMs,
        error: s.reason instanceof Error ? s.reason.message : String(s.reason),
      };
    });

    const succeeded = allResults.filter((r) => r.result !== null);
    if (succeeded.length === 0) {
      throw new Error("All models failed in ensemble execution");
    }

    const scored = await this.selectBest(succeeded, config);

    const winner = scored.reduce((best, cur) =>
      cur.score > best.score ? cur : best,
    );

    // Reflect scores back into allResults
    for (const s of scored) {
      const target = allResults.find((r) => r.model === s.model);
      if (target) target.score = s.score;
    }

    const avgLatency =
      allResults.reduce((sum, r) => sum + r.latencyMs, 0) / allResults.length;

    return {
      winner: winner.result!,
      winnerModel: winner.model,
      winnerScore: winner.score,
      allResults,
      votingDetails: {
        strategy: config.strategy,
        totalModels: allResults.length,
        successfulModels: succeeded.length,
        averageLatencyMs: Math.round(avgLatency),
      },
    };
  }

  async selectBest(
    results: ModelResult[],
    config: EnsembleConfig,
  ): Promise<ModelResult[]> {
    switch (config.strategy) {
      case "majority":
        return this.majorityVote(results);
      case "quality-score":
        return await this.qualityScoreVote(results, config);
      case "weighted":
        return this.weightedVote(results, config);
      default:
        return this.majorityVote(results);
    }
  }

  validateConfig(config: EnsembleConfig): void {
    if (config.models.length < EnsembleVoting.MIN_MODELS) {
      throw new Error("At least 2 models required");
    }
    if (config.models.length > EnsembleVoting.MAX_MODELS) {
      throw new Error("Maximum 5 models allowed");
    }
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY required");
    }
  }

  // ─── Majority Vote ───

  private majorityVote(results: ModelResult[]): ModelResult[] {
    for (const r of results) {
      let totalSim = 0;
      let comparisons = 0;
      for (const other of results) {
        if (other.model === r.model) continue;
        totalSim += this.calculateSimilarity(r.result!, other.result!);
        comparisons++;
      }
      r.score = comparisons > 0 ? (totalSim / comparisons) * 100 : 0;
    }
    return results;
  }

  private calculateSimilarity(
    a: AgentExecutionResult,
    b: AgentExecutionResult,
  ): number {
    // reviewComments: 파일 Jaccard 유사도
    if (a.output.reviewComments && b.output.reviewComments) {
      const filesA = new Set(a.output.reviewComments.map((c) => c.file));
      const filesB = new Set(b.output.reviewComments.map((c) => c.file));
      return this.jaccardSimilarity(filesA, filesB);
    }

    // generatedCode: 경로 Jaccard 유사도
    if (a.output.generatedCode && b.output.generatedCode) {
      const pathsA = new Set(a.output.generatedCode.map((c) => c.path));
      const pathsB = new Set(b.output.generatedCode.map((c) => c.path));
      return this.jaccardSimilarity(pathsA, pathsB);
    }

    // analysis: 텍스트 단어 Jaccard 유사도
    if (a.output.analysis && b.output.analysis) {
      const wordsA = new Set(a.output.analysis.toLowerCase().split(/\s+/));
      const wordsB = new Set(b.output.analysis.toLowerCase().split(/\s+/));
      return this.jaccardSimilarity(wordsA, wordsB);
    }

    return 0;
  }

  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  // ─── Quality Score Vote ───

  private async qualityScoreVote(
    results: ModelResult[],
    config: EnsembleConfig,
  ): Promise<ModelResult[]> {
    const evalModel = config.evaluationModel ?? "anthropic/claude-haiku-4-5";
    const evalRunner = new OpenRouterRunner(this.apiKey, evalModel);

    const evalSettled = await Promise.allSettled(
      results.map((r) => {
        const evalRequest: AgentExecutionRequest = {
          taskId: `eval_${r.model.replace(/\//g, "_")}`,
          agentId: "ensemble-evaluator",
          taskType: "policy-evaluation",
          context: {
            repoUrl: "",
            branch: "",
            instructions:
              ENSEMBLE_EVALUATION_PROMPT + JSON.stringify(r.result?.output),
          },
          constraints: [],
        };
        return evalRunner.execute(evalRequest);
      }),
    );

    for (let i = 0; i < results.length; i++) {
      const s = evalSettled[i];
      const target = results[i];
      if (!s || !target) continue;
      if (s.status === "fulfilled") {
        target.score = this.parseEvalScore(s.value);
      } else {
        target.score = 50; // fallback
      }
    }

    return results;
  }

  private parseEvalScore(evalResult: AgentExecutionResult): number {
    try {
      const text = evalResult.output.analysis ?? "";
      const parsed = JSON.parse(text);
      const score = Number(parsed.score);
      if (!isNaN(score) && score >= 0 && score <= 100) {
        return score;
      }
      return 50;
    } catch {
      return 50;
    }
  }

  // ─── Weighted Vote ───

  private weightedVote(
    results: ModelResult[],
    config: EnsembleConfig,
  ): ModelResult[] {
    const weights = config.weights ?? {};
    const defaultWeight = 100 / results.length;

    for (const r of results) {
      const weight = weights[r.model] ?? defaultWeight;
      const tokensUsed = r.result?.tokensUsed ?? 0;
      const efficiency = Math.max(0, 100 - tokensUsed / 100);
      r.score = efficiency * (weight / 100);
    }
    return results;
  }
}
