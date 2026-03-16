import { describe, it, expect } from 'vitest';
import { HealthScoreCalculator } from './health-score.js';
import type { SyncResult } from '@foundry-x/shared';

function makeSyncResult(
  specToCode: { matched: number; total: number },
  codeToTest: { matched: number; total: number },
  specToTest: { matched: number; total: number },
): SyncResult {
  return {
    success: true,
    timestamp: '2026-01-01T00:00:00Z',
    duration: 100,
    triangle: {
      specToCode: { ...specToCode, gaps: [] },
      codeToTest: { ...codeToTest, gaps: [] },
      specToTest: { ...specToTest, gaps: [] },
    },
    decisions: [],
    errors: [],
  };
}

describe('HealthScoreCalculator', () => {
  const calc = new HealthScoreCalculator();

  it('returns 100 / grade A when all items matched', () => {
    const result = calc.compute(
      makeSyncResult(
        { matched: 10, total: 10 },
        { matched: 5, total: 5 },
        { matched: 8, total: 8 },
      ),
    );

    expect(result.overall).toBe(100);
    expect(result.specToCode).toBe(100);
    expect(result.codeToTest).toBe(100);
    expect(result.specToTest).toBe(100);
    expect(result.grade).toBe('A');
  });

  it('returns 50 / grade D when half items matched', () => {
    const result = calc.compute(
      makeSyncResult(
        { matched: 5, total: 10 },
        { matched: 5, total: 10 },
        { matched: 5, total: 10 },
      ),
    );

    expect(result.overall).toBe(50);
    expect(result.grade).toBe('D');
  });

  it('handles 0/0 without division by zero — returns 100', () => {
    const result = calc.compute(
      makeSyncResult(
        { matched: 0, total: 0 },
        { matched: 0, total: 0 },
        { matched: 0, total: 0 },
      ),
    );

    expect(result.overall).toBe(100);
    expect(result.grade).toBe('A');
  });

  it('computes correct average for asymmetric scores', () => {
    // specToCode=90%, codeToTest=60%, specToTest=80%
    const result = calc.compute(
      makeSyncResult(
        { matched: 9, total: 10 },
        { matched: 6, total: 10 },
        { matched: 8, total: 10 },
      ),
    );

    expect(result.specToCode).toBe(90);
    expect(result.codeToTest).toBe(60);
    expect(result.specToTest).toBe(80);
    // average = (90+60+80)/3 ≈ 76.67
    expect(result.overall).toBeCloseTo(76.67, 1);
    expect(result.grade).toBe('C');
  });
});
