import type { ChangeEntry, SyncResult, HealthScore } from '@foundry-x/shared';

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
  compute(syncResult: SyncResult, changes?: ChangeEntry[]): HealthScore {
    const { triangle } = syncResult;

    const specToCode = ratio(triangle.specToCode.matched, triangle.specToCode.total);
    const codeToTest = ratio(triangle.codeToTest.matched, triangle.codeToTest.total);
    const specToTest = ratio(triangle.specToTest.matched, triangle.specToTest.total);
    let overall = (specToCode + codeToTest + specToTest) / 3;

    // F222: Pending changes penalty (max 10%)
    if (changes && changes.length > 0) {
      const pendingCount = changes.filter(
        (c) => c.status === 'proposed' || c.status === 'approved',
      ).length;
      const pendingRatio = pendingCount / changes.length;
      overall *= 1 - pendingRatio * 0.1;
    }

    return {
      specToCode,
      codeToTest,
      specToTest,
      overall,
      grade: grade(overall),
    };
  }
}
