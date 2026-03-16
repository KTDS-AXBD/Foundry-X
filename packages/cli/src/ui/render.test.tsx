import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderOutput } from './render.js';
import { makeStatusData, makeInitData, makeSyncData } from './__tests__/test-data.js';

describe('renderOutput', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('--json 모드: status 데이터를 JSON으로 출력한다', async () => {
    const data = makeStatusData();
    await renderOutput('status', data, { json: true });

    expect(logSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.config.mode).toBe('brownfield');
    expect(parsed.healthScore.overall).toBe(85.5);
  });

  it('--json 모드: init 데이터를 JSON으로 출력한다', async () => {
    const data = makeInitData();
    await renderOutput('init', data, { json: true });

    expect(logSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.result.created).toContain('CLAUDE.md');
    expect(parsed.integrity.score).toBe(92);
  });

  it('--short 모드: status 한 줄 요약을 출력한다', async () => {
    const data = makeStatusData();
    await renderOutput('status', data, { json: false, short: true });

    expect(logSpy).toHaveBeenCalledOnce();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('brownfield');
    expect(output).toContain('health=');
    expect(output).toContain('integrity=');
  });

  it('--short 모드: init/sync 한 줄 요약을 출력한다', async () => {
    const initData = makeInitData();
    await renderOutput('init', initData, { json: false, short: true });
    expect(logSpy.mock.calls[0][0]).toContain('init:');

    logSpy.mockClear();

    const syncData = makeSyncData();
    await renderOutput('sync', syncData, { json: false, short: true });
    expect(logSpy.mock.calls[0][0]).toContain('sync:');
  });

  it('non-TTY 환경에서 plain text로 출력한다', async () => {
    const original = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      writable: true,
      configurable: true,
    });

    try {
      const data = makeStatusData();
      await renderOutput('status', data, { json: false });

      expect(logSpy).toHaveBeenCalledOnce();
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain('Foundry-X Status');
      expect(output).toContain('Mode:      brownfield');
    } finally {
      if (original === undefined) {
        delete (process.stdout as Record<string, unknown>)['isTTY'];
      } else {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: original,
          writable: true,
          configurable: true,
        });
      }
    }
  });
});
