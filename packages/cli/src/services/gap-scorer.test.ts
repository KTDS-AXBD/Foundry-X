// F525: Gap-E2E 통합 점수 — TDD Red Phase
import { describe, it, expect } from 'vitest';
import { computeCompositeScore } from './gap-scorer.js';

describe('F525: computeCompositeScore()', () => {
  it('E2E 결과가 없으면 compositeRate = gapRate (하위 호환)', () => {
    const score = computeCompositeScore({ gapRate: 95 });
    expect(score.compositeRate).toBe(95);
    expect(score.e2ePassRate).toBeNull();
    expect(score.formula).toContain('E2E 미실행');
  });

  it('E2E 결과가 빈 배열이면 compositeRate = gapRate (하위 호환)', () => {
    const score = computeCompositeScore({ gapRate: 95, e2eResults: [] });
    expect(score.compositeRate).toBe(95);
    expect(score.e2ePassRate).toBeNull();
  });

  it('E2E 100% 통과 시 Gap×0.6 + 100×0.4로 계산한다', () => {
    const score = computeCompositeScore({
      gapRate: 80,
      e2eResults: [{ specFile: 'sprint-278.spec.ts', total: 5, pass: 5, fail: 0, skip: 0 }],
    });
    // 80*0.6 + 100*0.4 = 48 + 40 = 88
    expect(score.compositeRate).toBeCloseTo(88, 1);
    expect(score.e2ePassRate).toBeCloseTo(100, 1);
  });

  it('E2E 50% 통과 시 가중 평균을 정확히 계산한다', () => {
    const score = computeCompositeScore({
      gapRate: 100,
      e2eResults: [{ specFile: 'sprint-278.spec.ts', total: 4, pass: 2, fail: 2, skip: 0 }],
    });
    // 100*0.6 + 50*0.4 = 60 + 20 = 80
    expect(score.compositeRate).toBeCloseTo(80, 1);
    expect(score.e2ePassRate).toBeCloseTo(50, 1);
  });

  it('compositeRate ≥ 90이면 status=PASS', () => {
    const score = computeCompositeScore({
      gapRate: 95,
      e2eResults: [{ specFile: 'test.spec.ts', total: 5, pass: 5, fail: 0, skip: 0 }],
    });
    expect(score.status).toBe('PASS');
  });

  it('compositeRate < 90이면 status=FAIL', () => {
    const score = computeCompositeScore({
      gapRate: 70,
      e2eResults: [{ specFile: 'test.spec.ts', total: 5, pass: 2, fail: 3, skip: 0 }],
    });
    expect(score.status).toBe('FAIL');
  });

  it('모든 E2E가 SKIP이면 e2ePassRate=100 (보수적 처리)', () => {
    const score = computeCompositeScore({
      gapRate: 90,
      e2eResults: [{ specFile: 'test.spec.ts', total: 5, pass: 0, fail: 0, skip: 5 }],
    });
    expect(score.e2ePassRate).toBe(100);
  });

  it('복수 spec 파일의 결과를 합산하여 계산한다', () => {
    const score = computeCompositeScore({
      gapRate: 90,
      e2eResults: [
        { specFile: 'a.spec.ts', total: 4, pass: 4, fail: 0, skip: 0 },
        { specFile: 'b.spec.ts', total: 6, pass: 3, fail: 3, skip: 0 },
      ],
    });
    // total: 10, pass: 7 → e2e = 70%
    // 90*0.6 + 70*0.4 = 54 + 28 = 82
    expect(score.e2ePassRate).toBeCloseTo(70, 1);
    expect(score.compositeRate).toBeCloseTo(82, 1);
  });

  it('formula 문자열에 계산 수식이 포함된다', () => {
    const score = computeCompositeScore({
      gapRate: 90,
      e2eResults: [{ specFile: 'test.spec.ts', total: 5, pass: 5, fail: 0, skip: 0 }],
    });
    expect(score.formula).toMatch(/Gap.*×0\.6/);
    expect(score.formula).toMatch(/E2E.*×0\.4/);
  });
});
