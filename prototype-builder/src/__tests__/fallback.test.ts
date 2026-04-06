import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PrototypeJob } from '../types.js';
import { CostTracker } from '../cost-tracker.js';

// Mock the entire fallback module, then selectively unmock for unit tests
vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockRejectedValue(new Error('Not found')),
    readdir: vi.fn().mockResolvedValue([]),
    access: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

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

describe('fallback', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    delete process.env['SKIP_CLI'];
    delete process.env['CLAUDE_CLI_PATH'];
    delete process.env['ANTHROPIC_API_KEY'];

    // Re-apply fs mocks after restoreAllMocks
    const fs = (await import('node:fs/promises')).default;
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as never);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('Not found'));
    vi.mocked(fs.readdir).mockResolvedValue([] as never);
    vi.mocked(fs.access).mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env['SKIP_CLI'];
    delete process.env['CLAUDE_CLI_PATH'];
    delete process.env['ANTHROPIC_API_KEY'];
  });

  describe('executeWithFallback', () => {
    it('SKIP_CLI=true이면 CLI를 건너뛰고 API로 가요', async () => {
      process.env['SKIP_CLI'] = 'true';
      const { executeWithFallback } = await import('../fallback.js');

      const result = await executeWithFallback(makeJob(), 0);
      // API 키 없으므로 ensemble fallback
      expect(result.level).toBe('ensemble');
      expect(result.success).toBe(false);
    });

    it('SKIP_CLI=true + API 실패 시 ensemble 에러를 반환해요', async () => {
      process.env['SKIP_CLI'] = 'true';
      const { executeWithFallback } = await import('../fallback.js');

      const result = await executeWithFallback(makeJob(), 0);
      expect(result.level).toBe('ensemble');
      expect(result.error).toContain('CLI skipped');
    });
  });

  describe('writeGeneratedFiles', () => {
    it('코드 블록에서 파일을 추출해요', async () => {
      const { writeGeneratedFiles } = await import('../fallback.js');
      const text = '```tsx\n// src/App.tsx\nexport default function App() { return <div>Hello</div>; }\n```';
      const count = await writeGeneratedFiles(text, '/tmp/test-work');
      expect(count).toBe(1);
    });

    it('코드 블록이 없으면 0을 반환해요', async () => {
      const { writeGeneratedFiles } = await import('../fallback.js');
      const count = await writeGeneratedFiles('no code blocks here', '/tmp/test-work');
      expect(count).toBe(0);
    });

    it('여러 파일 블록을 추출해요', async () => {
      const { writeGeneratedFiles } = await import('../fallback.js');
      const text = [
        '```tsx\n// src/App.tsx\nfunction App() {}\n```',
        '```tsx\n// src/components/Header.tsx\nfunction Header() {}\n```',
      ].join('\n\n');
      const count = await writeGeneratedFiles(text, '/tmp/test-work');
      expect(count).toBe(2);
    });
  });

  describe('CostTracker.recordCli', () => {
    it('CLI 모드는 비용 $0으로 기록해요', () => {
      const tracker = new CostTracker({ monthlyBudgetUsd: 20 });
      const record = tracker.recordCli('job-1', 0);

      expect(record.cost).toBe(0);
      expect(record.model).toBe('cli-subscription');
      expect(record.inputTokens).toBe(0);
      expect(record.outputTokens).toBe(0);
    });

    it('CLI 기록이 getRecords에 포함돼요', () => {
      const tracker = new CostTracker({ monthlyBudgetUsd: 20 });
      tracker.recordCli('job-1', 0);
      tracker.recordCli('job-1', 1);

      expect(tracker.getRecords()).toHaveLength(2);
      expect(tracker.getJobCost('job-1')).toBe(0);
    });

    it('CLI 기록이 예산에 영향을 주지 않아요', () => {
      const tracker = new CostTracker({ monthlyBudgetUsd: 20 });
      tracker.recordCli('job-1', 0);
      tracker.recordCli('job-1', 1);
      tracker.recordCli('job-1', 2);

      expect(tracker.getBudgetUsage()).toBe(0);
      expect(tracker.isOverBudget()).toBe(false);
    });

    it('API + CLI 혼합 시 API 비용만 누적돼요', () => {
      const tracker = new CostTracker({ monthlyBudgetUsd: 20 });
      tracker.recordCli('job-1', 0);  // $0
      tracker.record('job-1', 1, 'haiku', 10_000, 5_000);  // $0.028
      tracker.recordCli('job-1', 2);  // $0

      expect(tracker.getJobCost('job-1')).toBeCloseTo(0.028, 4);
      expect(tracker.getRecords()).toHaveLength(3);
    });
  });
});
