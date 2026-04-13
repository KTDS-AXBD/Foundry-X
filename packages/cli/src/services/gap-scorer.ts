// F525: Gap-E2E 통합 점수 계산
// Gap Analysis에 E2E 결과를 통합하여 종합 Composite Score를 산출한다.

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

export function computeCompositeScore(input: CompositeInput): CompositeScore {
  const { gapRate, e2eResults } = input;

  // 하위 호환: E2E 결과가 없거나 빈 배열이면 Gap = Composite
  if (!e2eResults || e2eResults.length === 0) {
    return {
      gapRate,
      e2ePassRate: null,
      compositeRate: gapRate,
      formula: `Gap ${gapRate}% (E2E 미실행)`,
      status: gapRate >= 90 ? 'PASS' : 'FAIL',
    };
  }

  // pass + fail 합계 (SKIP은 총계에서 제외)
  const totalTests = e2eResults.reduce((s, r) => s + r.pass + r.fail, 0);
  const totalPass = e2eResults.reduce((s, r) => s + r.pass, 0);

  // 모든 테스트가 SKIP이면 e2ePassRate = 100 (보수적 처리)
  const e2ePassRate = totalTests === 0 ? 100 : (totalPass / totalTests) * 100;

  const compositeRate = gapRate * 0.6 + e2ePassRate * 0.4;

  return {
    gapRate,
    e2ePassRate,
    compositeRate,
    formula: `Gap ${gapRate}%×0.6 + E2E ${e2ePassRate.toFixed(1)}%×0.4`,
    status: compositeRate >= 90 ? 'PASS' : 'FAIL',
  };
}
