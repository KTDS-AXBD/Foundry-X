import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrototypeJob, OgdResult, QualityScore } from './types.js';
import { runCliGenerator } from './executor.js';
import { executeWithFallback } from './fallback.js';
import { evaluateQuality, generateTargetFeedback } from './scorer.js';
import { CostTracker } from './cost-tracker.js';

/**
 * 피드백을 작업 디렉토리에 저장 (다음 Round 입력)
 */
async function saveFeedback(
  workDir: string,
  round: number,
  feedback: string,
): Promise<void> {
  const feedbackDir = path.join(workDir, '.ogd');
  await fs.mkdir(feedbackDir, { recursive: true });
  await fs.writeFile(
    path.join(feedbackDir, `feedback_${round}.md`),
    feedback,
    'utf-8',
  );
}

export interface OgdOptions {
  maxRounds?: number;
  qualityThreshold?: number;
  costTracker?: CostTracker;
  useLlm?: boolean;
}

/**
 * Enhanced O-G-D 품질 루프 실행
 * Generator → 5-Dim Scorer → 수렴 판정 (max 5 rounds, threshold 80)
 *
 * 변경 (Sprint 177):
 * - 이진 판정 (0.9/0.4) → 5차원 스코어 (0~100)
 * - qualityThreshold: 0.85 → 80
 * - maxRounds: 3 → 5
 * - 타겟 피드백: 가장 낮은 차원에 특화된 개선 프롬프트
 * - 미수렴: best score 채택 + 미달 리포트
 */
export async function runOgdLoop(
  job: PrototypeJob,
  options: OgdOptions = {},
): Promise<OgdResult> {
  const maxRounds = options.maxRounds ?? 5;
  const qualityThreshold = options.qualityThreshold ?? 80;
  const costTracker = options.costTracker;
  const useLlm = options.useLlm ?? false;

  let bestScore = 0;
  let bestOutput = '';
  let bestQualityScore: QualityScore | undefined;
  let totalCost = 0;

  for (let round = 0; round < maxRounds; round++) {
    const updatedJob: PrototypeJob = { ...job, round };
    console.log(`[OGD] Round ${round + 1}/${maxRounds} — ${job.name}`);

    // 1. Generator: 4-Level Fallback (Max CLI → API → ensemble)
    const generated = await executeWithFallback(
      updatedJob,
      round,
      (j, r) => runCliGenerator(j, r),
    );

    if (!generated.success) {
      console.log(`[OGD] Generator failed: ${generated.error}`);
      continue; // 생성 실패 → 다음 Round 시도
    }

    console.log(`[OGD] Generator succeeded (level: ${generated.level})`);

    // 2. Scorer: 5차원 품질 평가
    const score = await evaluateQuality(job, job.workDir, { useLlm });
    console.log(`[OGD] Score: ${score.total}/100 (dimensions: ${score.dimensions.map(d => `${d.dimension}=${(d.score * 100).toFixed(0)}`).join(', ')})`);

    // 3. 비용 추적
    if (costTracker) {
      if (generated.level === 'max-cli') {
        costTracker.recordCli(job.id, round);
      } else {
        const model = round < 2 ? 'haiku' : 'sonnet';
        const record = costTracker.record(job.id, round, model, 0, 0);
        totalCost += record.cost;
      }
    }

    // 4. 수렴 판정 (80점+)
    if (score.total >= qualityThreshold) {
      console.log(`[OGD] Converged at round ${round + 1} with score ${score.total}`);
      return {
        output: generated.output,
        score: score.total,
        rounds: round + 1,
        totalCost,
        qualityScore: score,
        converged: true,
      };
    }

    // Best score 추적
    if (score.total > bestScore) {
      bestScore = score.total;
      bestOutput = generated.output;
      bestQualityScore = score;
    }

    // 5. 타겟 피드백 생성 → 다음 라운드 입력
    const feedback = generateTargetFeedback(score);
    console.log(`[OGD] Weakest dimension: ${feedback.weakestDimension} (${(feedback.score * 100).toFixed(0)})`);
    await saveFeedback(job.workDir, round, feedback.prompt);

    // 다음 라운드에 피드백 주입
    job = { ...job, feedbackContent: feedback.prompt };
  }

  // 미수렴: best score 산출물 채택
  console.log(`[OGD] Did not converge after ${maxRounds} rounds. Best score: ${bestScore}`);

  // 미달 리포트 생성
  if (bestQualityScore) {
    const reportLines = [
      `# O-G-D 미달 리포트 — ${job.name}`,
      '',
      `**최종 점수**: ${bestScore}/100 (목표: ${qualityThreshold})`,
      `**라운드 수**: ${maxRounds}`,
      '',
      '## 차원별 점수',
      '',
      '| 차원 | 점수 | 가중치 | 상세 |',
      '|------|:----:|:------:|------|',
    ];
    for (const d of bestQualityScore.dimensions) {
      reportLines.push(`| ${d.dimension} | ${(d.score * 100).toFixed(0)} | ${(d.weight * 100).toFixed(0)}% | ${d.details} |`);
    }
    const feedbackDir = path.join(job.workDir, '.ogd');
    await fs.mkdir(feedbackDir, { recursive: true });
    await fs.writeFile(
      path.join(feedbackDir, 'unconverged-report.md'),
      reportLines.join('\n'),
      'utf-8',
    );
  }

  return {
    output: bestOutput,
    score: bestScore,
    rounds: maxRounds,
    totalCost,
    qualityScore: bestQualityScore,
    converged: false,
  };
}
