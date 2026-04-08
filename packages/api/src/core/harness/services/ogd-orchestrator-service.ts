// ─── F355: O-G-D Orchestrator Service (Sprint 160) ───
// F431: FeedbackConverter 주입 + structured instructions 전달 (Sprint 207)
// F467: PrototypeQualityService 주입 + runLoop 완료 후 prototype_quality INSERT (Sprint 228)
// Generator → Discriminator → Feedback 루프 관리

import { OGD_MAX_ROUNDS } from "@foundry-x/shared";
import type { OgdRound, OgdSummary, StructuredInstruction } from "@foundry-x/shared";
import { OgdGeneratorService } from "./ogd-generator-service.js";
import { OgdDiscriminatorService } from "./ogd-discriminator-service.js";
import { OgdFeedbackConverterService } from "./ogd-feedback-converter.js";
import { PrototypeQualityService } from "./prototype-quality-service.js";

interface OgdRoundRow {
  id: string;
  job_id: string;
  org_id: string;
  round_number: number;
  quality_score: number | null;
  feedback: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  model_used: string;
  passed: number;
  created_at: number;
}

function toRound(row: OgdRoundRow): OgdRound {
  return {
    id: row.id,
    jobId: row.job_id,
    roundNumber: row.round_number,
    qualityScore: row.quality_score,
    feedback: row.feedback,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    costUsd: row.cost_usd,
    modelUsed: row.model_used,
    passed: row.passed === 1,
    createdAt: row.created_at,
  };
}

// Token → USD cost estimation (Haiku-class model)
const COST_PER_1M_INPUT = 0.25;
const COST_PER_1M_OUTPUT = 1.25;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * COST_PER_1M_INPUT + outputTokens * COST_PER_1M_OUTPUT) / 1_000_000;
}

export class OgdOrchestratorService {
  constructor(
    private db: D1Database,
    private generator: OgdGeneratorService,
    private discriminator: OgdDiscriminatorService,
    private feedbackConverter?: OgdFeedbackConverterService,
    private qualityService?: PrototypeQualityService,  // F467
  ) {}

  async runLoop(
    orgId: string,
    jobId: string,
    prdContent: string,
    initialFeedback?: string,  // F466: 재생성 시 첫 라운드에 외부 피드백 주입
  ): Promise<OgdSummary> {
    const checklist = this.discriminator.extractChecklist(prdContent);
    const rounds: OgdRound[] = [];
    let bestScore = 0;
    let bestRound = 1;
    let passed = false;
    let totalCostUsd = 0;
    let previousFeedback: string | undefined = initialFeedback;
    let previousInstructions: StructuredInstruction[] | undefined;

    for (let round = 1; round <= OGD_MAX_ROUNDS; round++) {
      // Generator: PRD + 이전 피드백(or structured instructions) → HTML
      const genResult = await this.generator.generate(prdContent, previousFeedback, previousInstructions);

      // Discriminator: HTML + 체크리스트 → 스코어 + failedItems
      const evalResult = await this.discriminator.evaluate(genResult.html, checklist);

      // F431: Feedback → Structured Instructions 변환
      let convertCost = 0;
      let structuredInstructions: StructuredInstruction[] | undefined;
      if (!evalResult.passed && this.feedbackConverter) {
        const convertResult = await this.feedbackConverter.convert(
          evalResult.feedback,
          evalResult.failedItems,
        );
        structuredInstructions = convertResult.instructions.length > 0
          ? convertResult.instructions
          : undefined;
        convertCost = estimateCost(convertResult.inputTokens, convertResult.outputTokens);
      }

      const totalInput = genResult.inputTokens + evalResult.inputTokens;
      const totalOutput = genResult.outputTokens + evalResult.outputTokens;
      const roundCost = estimateCost(totalInput, totalOutput) + convertCost;
      totalCostUsd += roundCost;

      // DB에 라운드 기록
      const roundId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await this.db
        .prepare(
          `INSERT INTO ogd_rounds (id, job_id, org_id, round_number, quality_score, feedback,
           input_tokens, output_tokens, cost_usd, model_used, passed, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          roundId, jobId, orgId, round, evalResult.qualityScore, evalResult.feedback,
          totalInput, totalOutput, roundCost, genResult.modelUsed,
          evalResult.passed ? 1 : 0, now,
        )
        .run();

      const ogdRound: OgdRound = {
        id: roundId,
        jobId,
        roundNumber: round,
        qualityScore: evalResult.qualityScore,
        feedback: evalResult.feedback,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        costUsd: roundCost,
        modelUsed: genResult.modelUsed,
        passed: evalResult.passed,
        createdAt: now,
        structuredInstructions,  // F431
      };
      rounds.push(ogdRound);

      if (evalResult.qualityScore > bestScore) {
        bestScore = evalResult.qualityScore;
        bestRound = round;
      }

      // 조기 탈출: 스코어 ≥ threshold
      if (evalResult.passed) {
        passed = true;
        break;
      }

      // F431: 다음 라운드에 structured instructions 우선 전달, 없으면 raw feedback
      previousInstructions = structuredInstructions;
      previousFeedback = structuredInstructions ? undefined : evalResult.feedback;
    }

    // prototype_jobs 갱신
    await this.db
      .prepare(
        `UPDATE prototype_jobs
         SET quality_score = ?, ogd_rounds = ?, updated_at = ?
         WHERE id = ? AND org_id = ?`,
      )
      .bind(bestScore, rounds.length, Math.floor(Date.now() / 1000), jobId, orgId)
      .run();

    // F467: OGD 결과를 prototype_quality에 자동 적재
    // totalScore: 0~100 스케일, 차원별 점수: 0~1 스케일 (스키마 기준)
    if (this.qualityService) {
      const bestRoundData = rounds[bestRound - 1];
      await this.qualityService.insert({
        jobId,
        round: rounds.length,
        totalScore: Math.round(bestScore * 100),
        buildScore: bestScore,
        uiScore: bestScore,
        functionalScore: bestScore,
        prdScore: bestScore,
        codeScore: bestScore,
        generationMode: "ogd",
        costUsd: totalCostUsd,
        feedback: bestRoundData?.feedback ?? null,
        details: JSON.stringify({ ogdRounds: rounds.length, passed }),
      });
    }

    return {
      jobId,
      totalRounds: rounds.length,
      bestScore,
      bestRound,
      passed,
      totalCostUsd,
      rounds,
    };
  }

  async getRounds(jobId: string, orgId: string): Promise<OgdRound[]> {
    const rows = await this.db
      .prepare(
        "SELECT * FROM ogd_rounds WHERE job_id = ? AND org_id = ? ORDER BY round_number ASC",
      )
      .bind(jobId, orgId)
      .all<OgdRoundRow>();
    return (rows.results ?? []).map(toRound);
  }

  async getSummary(jobId: string, orgId: string): Promise<OgdSummary | null> {
    const rounds = await this.getRounds(jobId, orgId);
    if (rounds.length === 0) return null;

    let bestScore = 0;
    let bestRound = 1;
    let totalCostUsd = 0;
    let passed = false;

    for (const r of rounds) {
      totalCostUsd += r.costUsd;
      if (r.qualityScore !== null && r.qualityScore > bestScore) {
        bestScore = r.qualityScore;
        bestRound = r.roundNumber;
      }
      if (r.passed) passed = true;
    }

    return {
      jobId,
      totalRounds: rounds.length,
      bestScore,
      bestRound,
      passed,
      totalCostUsd,
      rounds,
    };
  }
}
