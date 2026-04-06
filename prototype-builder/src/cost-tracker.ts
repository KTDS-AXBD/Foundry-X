import type { CostRecord, BuilderConfig } from './types.js';

// Anthropic 가격표 (2026-04 기준, USD per 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-6':        { input: 3.00, output: 15.00 },
  'claude-opus-4-6':          { input: 15.00, output: 75.00 },
  // 별칭
  haiku:  { input: 0.80, output: 4.00 },
  sonnet: { input: 3.00, output: 15.00 },
  opus:   { input: 15.00, output: 75.00 },
};

export class CostTracker {
  private records: CostRecord[] = [];
  private monthlyBudgetUsd: number;

  constructor(config: Pick<BuilderConfig, 'monthlyBudgetUsd'>) {
    this.monthlyBudgetUsd = config.monthlyBudgetUsd;
  }

  /**
   * API 호출 비용 기록
   */
  record(
    jobId: string,
    round: number,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): CostRecord {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      throw new Error(`Unknown model: ${model}. Known: ${Object.keys(MODEL_PRICING).join(', ')}`);
    }

    const cost =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    const entry: CostRecord = {
      jobId,
      round,
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now(),
    };

    this.records.push(entry);
    return entry;
  }

  /**
   * 특정 Job의 총 비용
   */
  getJobCost(jobId: string): number {
    return this.records
      .filter(r => r.jobId === jobId)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * 이번 달 총 비용
   */
  getMonthlyTotal(): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return this.records
      .filter(r => r.timestamp >= monthStart)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * 월 예산 대비 사용률 (0~1+)
   */
  getBudgetUsage(): number {
    if (this.monthlyBudgetUsd <= 0) return 0;
    return this.getMonthlyTotal() / this.monthlyBudgetUsd;
  }

  /**
   * 예산 초과 여부
   */
  isOverBudget(): boolean {
    return this.getBudgetUsage() >= 1.0;
  }

  /**
   * 예산 경고 임계값 (80%) 초과 여부
   */
  isNearBudget(threshold = 0.8): boolean {
    return this.getBudgetUsage() >= threshold;
  }

  /**
   * 모든 기록 반환
   */
  getRecords(): readonly CostRecord[] {
    return this.records;
  }

  /**
   * Job별 비용 요약
   */
  getJobSummary(jobId: string): {
    totalCost: number;
    rounds: number;
    models: string[];
    totalInputTokens: number;
    totalOutputTokens: number;
  } {
    const jobRecords = this.records.filter(r => r.jobId === jobId);
    return {
      totalCost: jobRecords.reduce((s, r) => s + r.cost, 0),
      rounds: jobRecords.length,
      models: [...new Set(jobRecords.map(r => r.model))],
      totalInputTokens: jobRecords.reduce((s, r) => s + r.inputTokens, 0),
      totalOutputTokens: jobRecords.reduce((s, r) => s + r.outputTokens, 0),
    };
  }
}
