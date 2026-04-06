import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrototypeJob, QualityScore, DimensionScore } from '../types.js';

// Mock dependencies
vi.mock('../executor.js', () => ({
  runCliGenerator: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 1 }),
}));

vi.mock('../fallback.js', () => ({
  executeWithFallback: vi.fn(),
}));

vi.mock('../scorer.js', () => ({
  evaluateQuality: vi.fn(),
  generateTargetFeedback: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

import { runOgdLoop } from '../orchestrator.js';
import { executeWithFallback } from '../fallback.js';
import { evaluateQuality, generateTargetFeedback } from '../scorer.js';
import { CostTracker } from '../cost-tracker.js';

const mockExecute = vi.mocked(executeWithFallback);
const mockEvaluate = vi.mocked(evaluateQuality);
const mockFeedback = vi.mocked(generateTargetFeedback);

function makeJob(overrides: Partial<PrototypeJob> = {}): PrototypeJob {
  return {
    id: 'test-job-1',
    projectId: 'proj-1',
    name: 'Test Prototype',
    prdContent: '# Test PRD',
    feedbackContent: null,
    workDir: '/tmp/test-work',
    round: 0,
    ...overrides,
  };
}

function makeScore(total: number, overrides: Partial<QualityScore> = {}): QualityScore {
  const dims: DimensionScore[] = [
    { dimension: 'build', score: 1.0, weight: 0.2, weighted: 0.2, details: 'OK' },
    { dimension: 'ui', score: total / 100 * 0.8, weight: 0.25, weighted: 0, details: 'UI' },
    { dimension: 'functional', score: total / 100 * 0.7, weight: 0.2, weighted: 0, details: 'Func' },
    { dimension: 'prd', score: total / 100 * 0.6, weight: 0.25, weighted: 0, details: 'PRD' },
    { dimension: 'code', score: 0.8, weight: 0.1, weighted: 0.08, details: 'Code' },
  ];
  return {
    total,
    dimensions: dims,
    evaluatedAt: new Date().toISOString(),
    round: 0,
    jobId: 'test-job-1',
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockFeedback.mockReturnValue({
    weakestDimension: 'ui',
    score: 0.3,
    prompt: 'Improve UI layout',
  });
});

describe('orchestrator — Enhanced O-G-D', () => {
  it('1라운드에서 80점+ 수렴하면 converged=true를 반환해요', async () => {
    mockExecute.mockResolvedValue({
      level: 'max-cli',
      output: 'generated code',
      success: true,
    });
    mockEvaluate.mockResolvedValue(makeScore(85));

    const result = await runOgdLoop(makeJob());

    expect(result.converged).toBe(true);
    expect(result.score).toBe(85);
    expect(result.rounds).toBe(1);
    expect(result.qualityScore).toBeDefined();
    expect(result.qualityScore!.total).toBe(85);
  });

  it('여러 라운드 후 수렴하면 정확한 rounds를 반환해요', async () => {
    mockExecute.mockResolvedValue({
      level: 'api',
      output: 'code',
      success: true,
    });

    // Round 1: 45점, Round 2: 65점, Round 3: 82점
    mockEvaluate
      .mockResolvedValueOnce(makeScore(45))
      .mockResolvedValueOnce(makeScore(65))
      .mockResolvedValueOnce(makeScore(82));

    const result = await runOgdLoop(makeJob());

    expect(result.converged).toBe(true);
    expect(result.score).toBe(82);
    expect(result.rounds).toBe(3);
  });

  it('5라운드 미수렴 시 converged=false + best score를 반환해요', async () => {
    mockExecute.mockResolvedValue({
      level: 'api',
      output: 'code',
      success: true,
    });

    // 계속 80 미만
    mockEvaluate
      .mockResolvedValueOnce(makeScore(40))
      .mockResolvedValueOnce(makeScore(55))
      .mockResolvedValueOnce(makeScore(70))
      .mockResolvedValueOnce(makeScore(75))
      .mockResolvedValueOnce(makeScore(78));

    const result = await runOgdLoop(makeJob());

    expect(result.converged).toBe(false);
    expect(result.score).toBe(78); // best score
    expect(result.rounds).toBe(5);
  });

  it('maxRounds 옵션을 존중해요', async () => {
    mockExecute.mockResolvedValue({
      level: 'api',
      output: 'code',
      success: true,
    });
    mockEvaluate.mockResolvedValue(makeScore(50));

    const result = await runOgdLoop(makeJob(), { maxRounds: 2 });

    expect(result.rounds).toBe(2);
    expect(result.converged).toBe(false);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it('qualityThreshold 옵션을 존중해요', async () => {
    mockExecute.mockResolvedValue({
      level: 'max-cli',
      output: 'code',
      success: true,
    });
    mockEvaluate.mockResolvedValue(makeScore(60));

    // threshold 50이면 60점에서 수렴
    const result = await runOgdLoop(makeJob(), { qualityThreshold: 50 });

    expect(result.converged).toBe(true);
    expect(result.score).toBe(60);
    expect(result.rounds).toBe(1);
  });

  it('Generator 실패 시 다음 라운드를 시도해요', async () => {
    // Round 1: 실패, Round 2: 성공 85점
    mockExecute
      .mockResolvedValueOnce({ level: 'ensemble', output: '', success: false, error: 'fail' })
      .mockResolvedValueOnce({ level: 'api', output: 'code', success: true });

    mockEvaluate.mockResolvedValue(makeScore(85));

    const result = await runOgdLoop(makeJob(), { maxRounds: 3 });

    expect(result.converged).toBe(true);
    expect(result.rounds).toBe(2);
  });

  it('타겟 피드백을 saveFeedback으로 저장해요', async () => {
    const fs = await import('node:fs/promises');
    const mockWriteFile = vi.mocked(fs.default.writeFile);

    mockExecute.mockResolvedValue({
      level: 'api',
      output: 'code',
      success: true,
    });

    mockEvaluate
      .mockResolvedValueOnce(makeScore(50))
      .mockResolvedValueOnce(makeScore(85));

    mockFeedback.mockReturnValue({
      weakestDimension: 'functional',
      score: 0.2,
      prompt: 'Add onClick handlers',
    });

    await runOgdLoop(makeJob());

    // Round 1에서 피드백 저장됨
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('feedback_0.md'),
      'Add onClick handlers',
      'utf-8',
    );
  });

  it('CostTracker로 CLI 모드 비용을 추적해요', async () => {
    const tracker = new CostTracker({ monthlyBudgetUsd: 20 });

    mockExecute.mockResolvedValue({
      level: 'max-cli',
      output: 'code',
      success: true,
    });
    mockEvaluate.mockResolvedValue(makeScore(90));

    await runOgdLoop(makeJob(), { costTracker: tracker });

    const records = tracker.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0]!.model).toBe('cli-subscription');
    expect(records[0]!.cost).toBe(0);
  });

  it('CostTracker로 API 모드 비용을 추적해요', async () => {
    const tracker = new CostTracker({ monthlyBudgetUsd: 20 });

    mockExecute.mockResolvedValue({
      level: 'api',
      output: 'code',
      success: true,
    });
    mockEvaluate.mockResolvedValue(makeScore(90));

    await runOgdLoop(makeJob(), { costTracker: tracker });

    const records = tracker.getRecords();
    expect(records).toHaveLength(1);
    expect(records[0]!.model).toBe('haiku'); // round 0 < 2 → haiku
  });

  it('미수렴 시 .ogd/unconverged-report.md를 생성해요', async () => {
    const fs = await import('node:fs/promises');
    const mockWriteFile = vi.mocked(fs.default.writeFile);

    mockExecute.mockResolvedValue({
      level: 'api',
      output: 'code',
      success: true,
    });
    mockEvaluate.mockResolvedValue(makeScore(50));

    await runOgdLoop(makeJob(), { maxRounds: 2 });

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('unconverged-report.md'),
      expect.stringContaining('미달 리포트'),
      'utf-8',
    );
  });
});
