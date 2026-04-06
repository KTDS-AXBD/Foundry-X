import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';
import {
  checkCliAvailability,
  runCliCall,
  formatPocReport,
} from '../cli-poc.js';
import type { CliPocReport } from '../cli-poc.js';

const mockExecFile = vi.mocked(execFile);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('cli-poc', () => {
  describe('checkCliAvailability', () => {
    it('CLI가 존재하면 버전을 반환해요', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        const callback = typeof _args === 'function' ? _args : typeof _opts === 'function' ? _opts : cb;
        if (callback) callback(null, '1.0.34\n', '');
        return {} as ReturnType<typeof execFile>;
      });

      const result = await checkCliAvailability('claude');
      expect(result.available).toBe(true);
      expect(result.version).toBe('1.0.34');
    });

    it('CLI가 없으면 available=false를 반환해요', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        const callback = typeof _args === 'function' ? _args : typeof _opts === 'function' ? _opts : cb;
        if (callback) callback(new Error('ENOENT'), '', '');
        return {} as ReturnType<typeof execFile>;
      });

      const result = await checkCliAvailability('claude-nonexistent');
      expect(result.available).toBe(false);
      expect(result.version).toBeNull();
    });
  });

  describe('runCliCall', () => {
    it('성공 시 결과와 소요시간을 반환해요', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        const callback = typeof _opts === 'function' ? _opts : cb;
        if (callback) callback(null, '{"result": "hello"}', '');
        return {} as ReturnType<typeof execFile>;
      });

      const result = await runCliCall('claude', 'Say hello');
      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.output).toContain('hello');
    });

    it('실패 시 error를 포함해요', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
        const callback = typeof _opts === 'function' ? _opts : cb;
        if (callback) callback(new Error('timeout'), '', '');
        return {} as ReturnType<typeof execFile>;
      });

      const result = await runCliCall('claude', 'test', { timeoutMs: 100 });
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('formatPocReport', () => {
    it('마크다운 리포트를 생성해요', () => {
      const report: CliPocReport = {
        cliPath: 'claude',
        cliVersion: '1.0.34',
        tests: [
          { testName: 'basic-hello', success: true, durationMs: 1500, output: 'hello' },
          { testName: 'code-generation', success: true, durationMs: 45000, output: 'code...' },
        ],
        rateLimit: {
          totalCalls: 10,
          successCount: 10,
          failCount: 0,
          avgDurationMs: 2000,
          minIntervalMs: 1500,
          maxDurationMs: 3500,
          rateLimitHit: false,
          rateLimitAfterN: null,
        },
        summary: {
          cliAvailable: true,
          codeGenWorks: true,
          rateLimitPerHour: 1200,
          avgResponseMs: 2000,
          recommendation: 'go',
          reason: 'CLI works, ~1200/hr capacity',
        },
        timestamp: '2026-04-06T22:30:00Z',
      };

      const md = formatPocReport(report);
      expect(md).toContain('# CLI `--bare` PoC 결과 (F384)');
      expect(md).toContain('GO');
      expect(md).toContain('1.0.34');
      expect(md).toContain('basic-hello');
      expect(md).toContain('Rate Limit 측정');
    });

    it('CLI 미발견 시 no-go 리포트를 생성해요', () => {
      const report: CliPocReport = {
        cliPath: 'claude',
        cliVersion: null,
        tests: [],
        rateLimit: null,
        summary: {
          cliAvailable: false,
          codeGenWorks: false,
          rateLimitPerHour: null,
          avgResponseMs: null,
          recommendation: 'no-go',
          reason: "CLI not found at 'claude'",
        },
        timestamp: '2026-04-06T22:30:00Z',
      };

      const md = formatPocReport(report);
      expect(md).toContain('NO-GO');
      expect(md).toContain('CLI not found');
    });
  });
});
