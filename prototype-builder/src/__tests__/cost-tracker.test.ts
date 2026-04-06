import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker } from '../cost-tracker.js';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker({ monthlyBudgetUsd: 20 });
  });

  describe('record', () => {
    it('Haiku 모델 비용을 정확히 계산해요', () => {
      const record = tracker.record('job-1', 0, 'haiku', 10_000, 5_000);
      // input: 10k/1M * $0.80 = $0.008
      // output: 5k/1M * $4.00 = $0.020
      // total: $0.028
      expect(record.cost).toBeCloseTo(0.028, 4);
    });

    it('Sonnet 모델 비용을 정확히 계산해요', () => {
      const record = tracker.record('job-1', 0, 'sonnet', 10_000, 5_000);
      // input: 10k/1M * $3.00 = $0.030
      // output: 5k/1M * $15.00 = $0.075
      // total: $0.105
      expect(record.cost).toBeCloseTo(0.105, 4);
    });

    it('알 수 없는 모델에 대해 에러를 던져요', () => {
      expect(() => tracker.record('job-1', 0, 'unknown', 100, 100)).toThrow('Unknown model');
    });

    it('정식 모델명도 지원해요', () => {
      const record = tracker.record('job-1', 0, 'claude-haiku-4-5-20251001', 10_000, 5_000);
      expect(record.cost).toBeCloseTo(0.028, 4);
    });
  });

  describe('getJobCost', () => {
    it('특정 Job의 누적 비용을 계산해요', () => {
      tracker.record('job-1', 0, 'haiku', 10_000, 5_000);
      tracker.record('job-1', 1, 'haiku', 10_000, 5_000);
      tracker.record('job-2', 0, 'haiku', 10_000, 5_000);

      expect(tracker.getJobCost('job-1')).toBeCloseTo(0.056, 4);
      expect(tracker.getJobCost('job-2')).toBeCloseTo(0.028, 4);
    });

    it('기록이 없는 Job은 0을 반환해요', () => {
      expect(tracker.getJobCost('nonexistent')).toBe(0);
    });
  });

  describe('getMonthlyTotal', () => {
    it('이번 달 총 비용을 계산해요', () => {
      tracker.record('job-1', 0, 'haiku', 100_000, 50_000);
      tracker.record('job-2', 0, 'sonnet', 100_000, 50_000);

      const total = tracker.getMonthlyTotal();
      // haiku: 100k/1M*0.8 + 50k/1M*4.0 = 0.08+0.20 = 0.28
      // sonnet: 100k/1M*3.0 + 50k/1M*15.0 = 0.30+0.75 = 1.05
      expect(total).toBeCloseTo(1.33, 2);
    });
  });

  describe('budget', () => {
    it('예산 사용률을 정확히 계산해요', () => {
      tracker.record('job-1', 0, 'sonnet', 1_000_000, 500_000);
      // sonnet: 1M/1M*3.0 + 500k/1M*15.0 = 3.0+7.5 = 10.5
      expect(tracker.getBudgetUsage()).toBeCloseTo(0.525, 2); // $10.5/$20
    });

    it('예산 초과를 감지해요', () => {
      // $20 예산을 초과하는 호출
      tracker.record('job-1', 0, 'opus', 1_000_000, 500_000);
      // opus: 1M/1M*15.0 + 500k/1M*75.0 = 15.0+37.5 = 52.5
      expect(tracker.isOverBudget()).toBe(true);
    });

    it('예산 80% 경고를 감지해요', () => {
      // $16+ (80% of $20)
      tracker.record('job-1', 0, 'sonnet', 1_000_000, 1_000_000);
      // sonnet: 3.0+15.0 = 18.0 → 90%
      expect(tracker.isNearBudget(0.8)).toBe(true);
    });

    it('예산 미달이면 경고하지 않아요', () => {
      tracker.record('job-1', 0, 'haiku', 10_000, 5_000);
      expect(tracker.isNearBudget()).toBe(false);
      expect(tracker.isOverBudget()).toBe(false);
    });
  });

  describe('getJobSummary', () => {
    it('Job별 요약을 생성해요', () => {
      tracker.record('job-1', 0, 'haiku', 10_000, 5_000);
      tracker.record('job-1', 1, 'haiku', 12_000, 6_000);
      tracker.record('job-1', 2, 'sonnet', 10_000, 5_000);

      const summary = tracker.getJobSummary('job-1');
      expect(summary.rounds).toBe(3);
      expect(summary.models).toEqual(expect.arrayContaining(['haiku', 'sonnet']));
      expect(summary.totalInputTokens).toBe(32_000);
      expect(summary.totalOutputTokens).toBe(16_000);
      expect(summary.totalCost).toBeGreaterThan(0);
    });
  });
});
