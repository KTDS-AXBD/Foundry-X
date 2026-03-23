/**
 * Sprint 51 F178: 멀티 페르소나 사업성 평가기 (BizPersonaEvaluator)
 * 8개 KT DS 역할 페르소나가 Promise.allSettled로 병렬 평가.
 * 최소 5/8 성공 시 판정 가능. G/K/R 비즈니스 규칙으로 최종 판정.
 */
import type { AgentRunner } from "./agent-runner.js";
import type { AgentExecutionResult } from "./execution-types.js";
import {
  type BizItem,
  type Classification,
  type BizPersona,
  BIZ_PERSONAS,
  buildEvaluationPrompt,
} from "./biz-persona-prompts.js";

export type { BizItem, Classification } from "./biz-persona-prompts.js";

export type Verdict = "green" | "keep" | "red";

const SCORE_KEYS = [
  "businessViability",
  "strategicFit",
  "customerValue",
  "techMarket",
  "execution",
  "financialFeasibility",
  "competitiveDiff",
  "scalability",
] as const;

export interface EvaluationScoreData {
  personaId: string;
  personaName: string;
  businessViability: number;
  strategicFit: number;
  customerValue: number;
  techMarket: number;
  execution: number;
  financialFeasibility: number;
  competitiveDiff: number;
  scalability: number;
  summary: string;
  concerns: string[];
}

export interface EvaluationResult {
  verdict: Verdict;
  avgScore: number;
  totalConcerns: number;
  scores: EvaluationScoreData[];
  warnings: string[];
}

export const MIN_SUCCESS_COUNT = 5;

export class BizPersonaEvaluator {
  constructor(
    private runner: AgentRunner,
    private db: D1Database,
  ) {}

  async evaluate(item: BizItem, classification: Classification): Promise<EvaluationResult> {
    const settled = await Promise.allSettled(
      BIZ_PERSONAS.map((persona) => this.evaluateWithPersona(persona, item, classification)),
    );

    const scores: EvaluationScoreData[] = [];
    const failures: string[] = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]!;
      const persona = BIZ_PERSONAS[i]!;
      if (result.status === "fulfilled") {
        scores.push(result.value);
      } else {
        failures.push(
          `${persona.name}(${persona.id}): ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    }

    if (scores.length < MIN_SUCCESS_COUNT) {
      throw new EvaluationError(
        `Insufficient successful evaluations: ${scores.length}/${BIZ_PERSONAS.length} (minimum ${MIN_SUCCESS_COUNT} required). Failures: ${failures.join("; ")}`,
        "INSUFFICIENT_EVALUATIONS",
      );
    }

    const { verdict, avgScore, totalConcerns, warnings } = this.aggregateAndVerdict(scores);

    return { verdict, avgScore, totalConcerns, scores, warnings };
  }

  private async evaluateWithPersona(
    persona: BizPersona,
    item: BizItem,
    classification: Classification,
  ): Promise<EvaluationScoreData> {
    const prompt = buildEvaluationPrompt(persona, item, classification);

    const result: AgentExecutionResult = await this.runner.execute({
      taskId: `eval-${persona.id}-${item.id}`,
      agentId: `biz-persona-${persona.id}`,
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: persona.systemPrompt,
      },
      constraints: [],
    });

    if (result.status === "failed") {
      throw new Error(`Persona ${persona.id} execution failed`);
    }

    const rawText = result.output.analysis ?? "";
    return this.parseScoreResponse(rawText, persona);
  }

  private parseScoreResponse(rawText: string, persona: BizPersona): EvaluationScoreData {
    let jsonStr = rawText.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!.trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error(`Failed to parse ${persona.id} response as JSON`);
    }

    const scoreData: EvaluationScoreData = {
      personaId: persona.id,
      personaName: persona.name,
      businessViability: this.clampScore(parsed.businessViability),
      strategicFit: this.clampScore(parsed.strategicFit),
      customerValue: this.clampScore(parsed.customerValue),
      techMarket: this.clampScore(parsed.techMarket),
      execution: this.clampScore(parsed.execution),
      financialFeasibility: this.clampScore(parsed.financialFeasibility),
      competitiveDiff: this.clampScore(parsed.competitiveDiff),
      scalability: this.clampScore(parsed.scalability),
      summary: String(parsed.summary ?? ""),
      concerns: Array.isArray(parsed.concerns)
        ? parsed.concerns.map(String)
        : [],
    };

    return scoreData;
  }

  private clampScore(value: unknown): number {
    const num = Number(value);
    if (isNaN(num)) return 5; // fallback to neutral
    return Math.max(1, Math.min(10, Math.round(num)));
  }

  private aggregateAndVerdict(scores: EvaluationScoreData[]): {
    verdict: Verdict;
    avgScore: number;
    totalConcerns: number;
    warnings: string[];
  } {
    // Calculate average across all personas and all 8 axes
    let totalScore = 0;
    let scoreCount = 0;
    let totalConcerns = 0;
    const warnings: string[] = [];

    // Track per-axis scores for warning detection
    const axisScores: Record<string, number[]> = {};
    for (const key of SCORE_KEYS) {
      axisScores[key] = [];
    }

    for (const score of scores) {
      for (const key of SCORE_KEYS) {
        const val = score[key];
        totalScore += val;
        scoreCount++;
        axisScores[key]!.push(val);
      }
      totalConcerns += score.concerns.length;
    }

    const avgScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : 0;

    // Warning: 3+ personas scored <= 3 on a specific axis
    for (const key of SCORE_KEYS) {
      const lowCount = axisScores[key]!.filter((v) => v <= 3).length;
      if (lowCount >= 3) {
        warnings.push(`${key}: ${lowCount}개 페르소나가 3점 이하 평가`);
      }
    }

    // G/K/R base verdict
    let verdict: Verdict;
    if (avgScore < 5.0 || totalConcerns >= 6) {
      verdict = "red";
    } else if (avgScore >= 7.0 && totalConcerns <= 2) {
      verdict = "green";
    } else {
      verdict = "keep";
    }

    // Override: if both strategy and finance scored < 5 avg, downgrade to keep
    if (verdict === "green") {
      const strategyScore = scores.find((s) => s.personaId === "strategy");
      const financeScore = scores.find((s) => s.personaId === "finance");
      if (strategyScore && financeScore) {
        const stratAvg = this.personaAvg(strategyScore);
        const finAvg = this.personaAvg(financeScore);
        if (stratAvg < 5 && finAvg < 5) {
          verdict = "keep";
          warnings.push("전략기획+경영기획 평균 5점 미만으로 Green→Keep 하향 조정");
        }
      }
    }

    return { verdict, avgScore, totalConcerns, warnings };
  }

  private personaAvg(score: EvaluationScoreData): number {
    let total = 0;
    for (const key of SCORE_KEYS) {
      total += score[key];
    }
    return total / SCORE_KEYS.length;
  }
}

export class EvaluationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "EvaluationError";
  }
}
