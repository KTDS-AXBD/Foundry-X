import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { PlumbBridge } from './bridge.js';
import {
  PlumbNotInstalledError,
  PlumbTimeoutError,
  PlumbExecutionError,
  PlumbOutputError,
} from './errors.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

const mockSpawn = vi.mocked(spawn);

interface MockProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
}

function createMockProcess(): MockProcess {
  const proc = new EventEmitter() as MockProcess;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  return proc;
}

beforeEach(() => {
  mockSpawn.mockReset();
});

describe('PlumbBridge', () => {
  describe('isAvailable', () => {
    it('returns true when plumb responds with exit 0', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const bridge = new PlumbBridge();
      const promise = bridge.isAvailable();

      process.nextTick(() => {
        proc.stdout.emit('data', Buffer.from('{"version":"1.0.0"}'));
        proc.emit('close', 0);
      });

      expect(await promise).toBe(true);
    });

    it('returns false when spawn emits ENOENT', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const bridge = new PlumbBridge();
      const promise = bridge.isAvailable();

      process.nextTick(() => {
        const err = new Error('spawn ENOENT') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        proc.emit('error', err);
      });

      expect(await promise).toBe(false);
    });
  });

  describe('execute', () => {
    it('returns PlumbResult on exit 0 with valid JSON', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const bridge = new PlumbBridge();
      const promise = bridge.execute('review');

      process.nextTick(() => {
        proc.stdout.emit('data', Buffer.from('{"items":[1,2,3]}'));
        proc.emit('close', 0);
      });

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.data).toEqual({ items: [1, 2, 3] });
      expect(result.stderr).toBe('');
    });

    it('throws PlumbExecutionError on exit code 1', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const bridge = new PlumbBridge();
      const promise = bridge.execute('review');

      process.nextTick(() => {
        proc.stderr.emit('data', Buffer.from('review failed'));
        proc.emit('close', 1);
      });

      await expect(promise).rejects.toThrow(PlumbExecutionError);
    });

    it('throws PlumbNotInstalledError on exit code 127', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const bridge = new PlumbBridge();
      const promise = bridge.execute('review');

      process.nextTick(() => {
        proc.emit('close', 127);
      });

      await expect(promise).rejects.toThrow(PlumbNotInstalledError);
    });

    it('throws PlumbTimeoutError when timeout is exceeded', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const bridge = new PlumbBridge({ timeout: 10 });
      const promise = bridge.execute('review');

      // Do not emit 'close' — let the real 10ms timer fire
      await expect(promise).rejects.toThrow(PlumbTimeoutError);
      expect(proc.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('throws PlumbOutputError on invalid JSON stdout', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const bridge = new PlumbBridge();
      const promise = bridge.execute('review');

      process.nextTick(() => {
        proc.stdout.emit('data', Buffer.from('not valid json'));
        proc.emit('close', 0);
      });

      await expect(promise).rejects.toThrow(PlumbOutputError);
    });
  });
});
