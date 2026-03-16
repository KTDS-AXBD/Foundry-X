import type { SyncResult, HealthScore } from '@foundry-x/shared';

function ratio(matched: number, total: number): number {
  if (total === 0) return 100;
  return (matched / total) * 100;
}

function grade(score: number): HealthScore['grade'] {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export class HealthScoreCalculator {
  compute(syncResult: SyncResult): HealthScore {
    const { triangle } = syncResult;

    const specToCode = ratio(triangle.specToCode.matched, triangle.specToCode.total);
    const codeToTest = ratio(triangle.codeToTest.matched, triangle.codeToTest.total);
    const specToTest = ratio(triangle.specToTest.matched, triangle.specToTest.total);
    const overall = (specToCode + codeToTest + specToTest) / 3;

    return {
      specToCode,
      codeToTest,
      specToTest,
      overall,
      grade: grade(overall),
    };
  }
}
