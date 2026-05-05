// F608 lint-baseline check logic unit tests (TDD Red phase)
// Tests the fingerprint set-diff algorithm used by scripts/lint-baseline-check.sh
import { describe, it, expect } from 'vitest';

// Core algorithm: given current violations and baseline, return new (regression) violations
function findNewViolations(current: string[], baseline: string[]): string[] {
  const baselineSet = new Set(baseline);
  return current.filter(fp => !baselineSet.has(fp));
}

describe('F608 lint-baseline fingerprint diff', () => {
  it('Case 1: all current violations are in baseline → no regressions', () => {
    const baseline = [
      'src/app.ts:129:foundry-x-api/no-direct-route-register',
      'src/core/discovery/routes/biz-items.ts:10:foundry-x-api/no-cross-domain-import',
    ];
    const current = [...baseline];
    const newViolations = findNewViolations(current, baseline);
    expect(newViolations).toHaveLength(0);
  });

  it('Case 2: current has a fingerprint not in baseline → regression detected', () => {
    const baseline = [
      'src/app.ts:129:foundry-x-api/no-direct-route-register',
    ];
    const current = [
      'src/app.ts:129:foundry-x-api/no-direct-route-register',
      'src/core/newfile.ts:5:foundry-x-api/no-cross-domain-import', // new violation
    ];
    const newViolations = findNewViolations(current, baseline);
    expect(newViolations).toHaveLength(1);
    expect(newViolations[0]).toBe('src/core/newfile.ts:5:foundry-x-api/no-cross-domain-import');
  });

  it('Case 3: current is a subset of baseline (violations fixed) → no regressions', () => {
    const baseline = [
      'src/app.ts:129:foundry-x-api/no-direct-route-register',
      'src/core/old.ts:20:foundry-x-api/no-cross-domain-import',
    ];
    const current = [
      'src/app.ts:129:foundry-x-api/no-direct-route-register',
      // old.ts violation was fixed — not in current
    ];
    const newViolations = findNewViolations(current, baseline);
    expect(newViolations).toHaveLength(0);
  });

  it('Case 4: empty current and non-empty baseline → no regressions', () => {
    const baseline = ['src/app.ts:129:foundry-x-api/no-direct-route-register'];
    const current: string[] = [];
    const newViolations = findNewViolations(current, baseline);
    expect(newViolations).toHaveLength(0);
  });
});
