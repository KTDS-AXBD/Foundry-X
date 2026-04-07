import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrototypeJob, AuditReport, ImpeccableViolation } from '../types.js';

// ─── Mock 설정 ───────────────────────────────────────────────────
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

vi.mock('../fallback.js', () => ({
  executeWithFallback: vi.fn().mockResolvedValue({ level: 'api', output: '', success: true }),
}));

vi.mock('../scorer.js', () => ({
  evaluateQuality: vi.fn().mockResolvedValue({
    total: 85,
    dimensions: [],
    evaluatedAt: new Date().toISOString(),
    round: 0,
    jobId: 'test-job',
  }),
}));

import Anthropic from '@anthropic-ai/sdk';
import { executeWithFallback } from '../fallback.js';
import { evaluateQuality } from '../scorer.js';
import { audit, normalize, polish, runDesignPipeline } from '../design-pipeline.js';

// ─── 테스트 픽스처 ───────────────────────────────────────────────
function makeJob(overrides: Partial<PrototypeJob> = {}): PrototypeJob {
  return {
    id: 'test-job-001',
    projectId: 'project-001',
    name: 'Test Prototype',
    prdContent: '## PRD\n\n사용자 인증 로그인 화면을 만들어주세요.',
    feedbackContent: null,
    workDir: '/tmp/test-workdir',
    round: 0,
    ...overrides,
  };
}

function makeViolation(overrides: Partial<ImpeccableViolation> = {}): ImpeccableViolation {
  return {
    domain: 'typography',
    severity: 'critical',
    rule: 'Body font-size < 16px',
    evidence: 'font-size: 14px found in .body',
    fix: 'Change .body font-size to 16px',
    ...overrides,
  };
}

function makeAuditReport(violations: ImpeccableViolation[] = []): AuditReport {
  return {
    jobId: 'test-job-001',
    violations,
    criticalCount: violations.filter(v => v.severity === 'critical').length,
    majorCount: violations.filter(v => v.severity === 'major').length,
    minorCount: violations.filter(v => v.severity === 'minor').length,
    auditedAt: new Date().toISOString(),
    rawAnalysis: JSON.stringify({ violations }),
  };
}

// ─── 테스트 ─────────────────────────────────────────────────────
describe('DesignPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본 scorer mock: 85점 (threshold 80 초과)
    vi.mocked(evaluateQuality).mockResolvedValue({
      total: 85,
      dimensions: [],
      evaluatedAt: new Date().toISOString(),
      round: 0,
      jobId: 'test-job-001',
    });
  });

  describe('/audit', () => {
    it('API 키 없을 때 빈 violations fallback을 반환해요', async () => {
      const job = makeJob();
      const originalKey = process.env['ANTHROPIC_API_KEY'];
      delete process.env['ANTHROPIC_API_KEY'];

      try {
        const report = await audit(job, '/tmp/empty', undefined);
        expect(report.violations).toEqual([]);
        expect(report.criticalCount).toBe(0);
        expect(report.jobId).toBe(job.id);
      } finally {
        if (originalKey) process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    });

    it('LLM 응답에서 violations를 파싱해요', async () => {
      const mockViolations = [
        {
          domain: 'typography',
          severity: 'critical',
          rule: 'Body font-size < 16px',
          evidence: 'font-size: 14px in .body',
          fix: 'Change to 16px',
        },
      ];

      const mockClient = new (Anthropic as unknown as { new(): { messages: { create: ReturnType<typeof vi.fn> } } })();
      vi.mocked(mockClient.messages.create).mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n' + JSON.stringify({ violations: mockViolations }) + '\n```',
          },
        ],
      } as Parameters<typeof mockClient.messages.create>[0] extends unknown ? ReturnType<typeof mockClient.messages.create> extends Promise<infer R> ? R : never : never);

      vi.mocked(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);

      const job = makeJob();
      const report = await audit(job, '/tmp/empty', 'test-api-key');

      expect(report.violations).toHaveLength(1);
      expect(report.violations[0]?.domain).toBe('typography');
      expect(report.criticalCount).toBe(1);
      expect(report.majorCount).toBe(0);
    });

    it('LLM 호출 실패 시 빈 violations를 반환해요', async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('API error')),
        },
      };
      vi.mocked(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);

      const job = makeJob();
      const report = await audit(job, '/tmp/empty', 'test-api-key');

      expect(report.violations).toEqual([]);
      expect(report.criticalCount).toBe(0);
    });
  });

  describe('/normalize', () => {
    it('critical/major 위반이 없으면 Generator를 호출하지 않아요', async () => {
      const job = makeJob();
      const report = makeAuditReport([makeViolation({ severity: 'minor' })]);

      await normalize(job, '/tmp/workdir', report);

      expect(executeWithFallback).not.toHaveBeenCalled();
    });

    it('critical 위반이 있으면 Generator를 호출해요', async () => {
      const job = makeJob();
      const report = makeAuditReport([
        makeViolation({ severity: 'critical' }),
        makeViolation({ severity: 'major', domain: 'colorContrast', fix: 'Fix contrast ratio' }),
      ]);

      await normalize(job, '/tmp/workdir', report);

      expect(executeWithFallback).toHaveBeenCalledOnce();
    });

    it('위반 목록을 feedbackContent에 포함해요', async () => {
      const job = makeJob();
      const report = makeAuditReport([
        makeViolation({ severity: 'critical', fix: 'Fix font size' }),
      ]);

      await normalize(job, '/tmp/workdir', report);

      const calledJob = vi.mocked(executeWithFallback).mock.calls[0]?.[0];
      expect(calledJob?.feedbackContent).toContain('Fix font size');
    });
  });

  describe('/polish', () => {
    it('점수 >= 80이면 converged=true로 반환해요', async () => {
      vi.mocked(evaluateQuality).mockResolvedValueOnce({
        total: 85,
        dimensions: [],
        evaluatedAt: new Date().toISOString(),
        round: 0,
        jobId: 'test-job-001',
      });

      const job = makeJob();
      const report = makeAuditReport([]);
      const result = await polish(job, '/tmp/workdir', report, { qualityThreshold: 80 });

      expect(result.converged).toBe(true);
      expect(result.score).toBe(85);
      expect(executeWithFallback).not.toHaveBeenCalled();
    });

    it('점수 < 80이면 Generator를 추가 실행해요', async () => {
      vi.mocked(evaluateQuality)
        .mockResolvedValueOnce({ total: 70, dimensions: [], evaluatedAt: new Date().toISOString(), round: 0, jobId: 'test-job-001' })
        .mockResolvedValueOnce({ total: 82, dimensions: [], evaluatedAt: new Date().toISOString(), round: 1, jobId: 'test-job-001' });

      const job = makeJob();
      const report = makeAuditReport([makeViolation({ severity: 'minor', fix: 'Minor fix' })]);
      const result = await polish(job, '/tmp/workdir', report, { qualityThreshold: 80 });

      expect(executeWithFallback).toHaveBeenCalledOnce();
      expect(result.score).toBe(82);
      expect(result.converged).toBe(true);
    });
  });

  describe('runDesignPipeline', () => {
    it('3단계 순차 실행 후 PipelineResult를 반환해요', async () => {
      const originalKey = process.env['ANTHROPIC_API_KEY'];
      delete process.env['ANTHROPIC_API_KEY'];

      try {
        const job = makeJob();
        const result = await runDesignPipeline(job, { qualityThreshold: 80 });

        expect(result.jobId).toBe(job.id);
        expect(result.steps).toHaveLength(3);
        expect(result.steps[0]?.step).toBe('audit');
        expect(result.steps[1]?.step).toBe('normalize');
        expect(result.steps[2]?.step).toBe('polish');
        expect(result.auditReport).toBeDefined();
        expect(typeof result.score).toBe('number');
        expect(typeof result.converged).toBe('boolean');
      } finally {
        if (originalKey) process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    });

    it('각 step에 success와 durationMs가 포함돼요', async () => {
      const originalKey = process.env['ANTHROPIC_API_KEY'];
      delete process.env['ANTHROPIC_API_KEY'];

      try {
        const job = makeJob();
        const result = await runDesignPipeline(job);

        for (const step of result.steps) {
          expect(typeof step.success).toBe('boolean');
          expect(typeof step.durationMs).toBe('number');
          expect(step.durationMs).toBeGreaterThanOrEqual(0);
        }
      } finally {
        if (originalKey) process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    });
  });
});
