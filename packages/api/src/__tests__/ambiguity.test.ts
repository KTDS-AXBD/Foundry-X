import { describe, it, expect } from 'vitest';
import {
  calculateAmbiguity,
  GREENFIELD_WEIGHTS,
  BROWNFIELD_WEIGHTS,
  type AmbiguityDimension,
} from '@foundry-x/shared';

describe('Ambiguity Score (F59)', () => {
  it('greenfield 가중치 합 = 1.0', () => {
    const sum = Object.values(GREENFIELD_WEIGHTS).reduce((a: number, b: number) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('brownfield 가중치 합 = 1.0', () => {
    const sum = Object.values(BROWNFIELD_WEIGHTS).reduce((a: number, b: number) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('clarity 0.9 + greenfield → ambiguity < 0.2 (ready)', () => {
    const dims: AmbiguityDimension[] = [
      { name: 'goal', clarity: 0.9, weight: GREENFIELD_WEIGHTS.goal! },
      { name: 'constraint', clarity: 0.9, weight: GREENFIELD_WEIGHTS.constraint! },
      { name: 'success', clarity: 0.9, weight: GREENFIELD_WEIGHTS.success! },
    ];
    const ambiguity = calculateAmbiguity(dims);
    expect(ambiguity).toBeLessThanOrEqual(0.2);
    expect(ambiguity).toBeCloseTo(0.1, 1);
  });

  it('clarity 0.5 → ambiguity > 0.2 (not ready)', () => {
    const dims: AmbiguityDimension[] = [
      { name: 'goal', clarity: 0.5, weight: GREENFIELD_WEIGHTS.goal! },
      { name: 'constraint', clarity: 0.5, weight: GREENFIELD_WEIGHTS.constraint! },
      { name: 'success', clarity: 0.5, weight: GREENFIELD_WEIGHTS.success! },
    ];
    const ambiguity = calculateAmbiguity(dims);
    expect(ambiguity).toBeGreaterThan(0.2);
    expect(ambiguity).toBeCloseTo(0.5, 1);
  });
});
