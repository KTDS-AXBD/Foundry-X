import fs from 'node:fs/promises';
import path from 'node:path';
import type { PrototypeJob, OgdResult, OgdEvaluation } from './types.js';
import { runCliGenerator, runBuild } from './executor.js';
import { executeWithFallback } from './fallback.js';
import { CostTracker } from './cost-tracker.js';

/**
 * Discriminator 프롬프트 — 생성물 품질 평가
 */
function buildDiscriminatorPrompt(
  job: PrototypeJob,
  generatedCode: string,
): string {
  return [
    '# Prototype Discriminator',
    '',
    'PRD 대비 생성된 Prototype 코드의 품질을 평가하세요.',
    '',
    '## 평가 기준',
    '1. PRD 요구사항 충족도 (0~1)',
    '2. UI/UX 완성도 (0~1)',
    '3. 코드 빌드 가능성 (0~1)',
    '4. 인터랙션 구현 (0~1)',
    '',
    '## 출력 형식 (JSON)',
    '```json',
    '{',
    '  "qualityScore": 0.85,',
    '  "feedback": "개선 필요 사항...",',
    '  "details": { "requirements": 0.9, "ux": 0.8, "buildable": 1.0, "interaction": 0.7 }',
    '}',
    '```',
    '',
    '## PRD',
    job.prdContent,
    '',
    '## 생성된 코드',
    generatedCode,
  ].join('\n');
}

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

/**
 * Discriminator 결과 파싱
 */
function parseEvaluation(raw: string): OgdEvaluation {
  // JSON 블록 추출 시도
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1]! : raw;

  try {
    const parsed = JSON.parse(jsonStr.trim()) as {
      qualityScore?: number;
      feedback?: string;
    };
    return {
      qualityScore: parsed.qualityScore ?? 0,
      feedback: parsed.feedback ?? raw,
      tokensUsed: { input: 0, output: 0 }, // CLI 모드에서는 정확한 토큰 수 미확인
      pass: (parsed.qualityScore ?? 0) >= 0.85,
    };
  } catch {
    // JSON 파싱 실패 시 보수적 점수
    return {
      qualityScore: 0.3,
      feedback: raw,
      tokensUsed: { input: 0, output: 0 },
      pass: false,
    };
  }
}

export interface OgdOptions {
  maxRounds?: number;
  qualityThreshold?: number;
  costTracker?: CostTracker;
}

/**
 * O-G-D 품질 루프 실행
 * Generator → Discriminator → 수렴 판정 (max 3 rounds)
 */
export async function runOgdLoop(
  job: PrototypeJob,
  options: OgdOptions = {},
): Promise<OgdResult> {
  const maxRounds = options.maxRounds ?? 3;
  const qualityThreshold = options.qualityThreshold ?? 0.85;
  const costTracker = options.costTracker;

  let bestScore = 0;
  let bestOutput = '';
  let totalCost = 0;

  for (let round = 0; round < maxRounds; round++) {
    const updatedJob: PrototypeJob = { ...job, round };
    console.log(`[OGD] Round ${round + 1}/${maxRounds} — ${job.name}`);

    // 1. Generator: PRD + 이전 feedback → 코드 생성
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

    // 2. Discriminator: 빌드 성공 여부 + 파일 수로 판정 (간이 평가)
    const buildCheck = await runBuild(job.workDir);
    let evaluation: OgdEvaluation;

    if (buildCheck.success) {
      // 빌드 성공 → 0.9점 (qualityThreshold 이상)
      evaluation = {
        qualityScore: 0.9,
        feedback: 'Build succeeded',
        tokensUsed: { input: 0, output: 0 },
        pass: true,
      };
      console.log(`[OGD] Build check: PASS (0.9)`);
    } else {
      // 빌드 실패 → 0.4점, 에러를 피드백으로 전달
      evaluation = {
        qualityScore: 0.4,
        feedback: `Build failed:\n${buildCheck.output.slice(0, 1000)}`,
        tokensUsed: { input: 0, output: 0 },
        pass: false,
      };
      console.log(`[OGD] Build check: FAIL (0.4)`);
    }

    // 3. 비용 추적
    if (costTracker) {
      const model = round < 2 ? 'haiku' : 'sonnet';
      const record = costTracker.record(
        job.id,
        round,
        model,
        evaluation.tokensUsed.input,
        evaluation.tokensUsed.output,
      );
      totalCost += record.cost;
    }

    // 4. 수렴 판정
    if (evaluation.qualityScore >= qualityThreshold) {
      return {
        output: generated.output,
        score: evaluation.qualityScore,
        rounds: round + 1,
        totalCost,
      };
    }

    if (evaluation.qualityScore > bestScore) {
      bestScore = evaluation.qualityScore;
      bestOutput = generated.output;
    }

    // 5. 피드백을 다음 Round 입력으로 저장
    await saveFeedback(job.workDir, round, evaluation.feedback);
  }

  // max rounds 도달 → 최고 점수 산출물 채택
  return {
    output: bestOutput,
    score: bestScore,
    rounds: maxRounds,
    totalCost,
  };
}
