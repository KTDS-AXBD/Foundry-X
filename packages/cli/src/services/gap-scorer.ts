// F525: Gap-E2E 통합 점수 — stub (TDD Red Phase)
// Green Phase에서 구현 예정

export interface E2EResult {
  specFile: string;
  total: number;
  pass: number;
  fail: number;
  skip: number;
}

export interface CompositeInput {
  gapRate: number;
  e2eResults?: E2EResult[];
}

export interface CompositeScore {
  gapRate: number;
  e2ePassRate: number | null;
  compositeRate: number;
  formula: string;
  status: 'PASS' | 'FAIL';
}

export function computeCompositeScore(_input: CompositeInput): CompositeScore {
  throw new Error('Not implemented');
}
