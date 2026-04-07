import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BuildQueue, BuildQueueTimeoutError, type BuildQueueStatus } from '../build-queue.js';

// Singleton 초기화를 위해 각 테스트 전 clear
let queue: BuildQueue;

beforeEach(() => {
  queue = BuildQueue.getInstance();
  queue.clear();
});

afterEach(() => {
  queue.clear();
});

describe('BuildQueue', () => {
  describe('Singleton', () => {
    it('getInstance()는 항상 동일한 인스턴스를 반환해요', () => {
      const a = BuildQueue.getInstance();
      const b = BuildQueue.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('enqueue — 단건 실행', () => {
    it('fn의 반환값을 Promise로 반환해요', async () => {
      const result = await queue.enqueue(() => Promise.resolve(42));
      expect(result).toBe(42);
    });

    it('fn이 throw하면 reject해요', async () => {
      await expect(
        queue.enqueue(() => Promise.reject(new Error('test error'))),
      ).rejects.toThrow('test error');
    });
  });

  describe('enqueue — 동시 2건 순차 실행', () => {
    it('큐에 쌓인 fn들은 순서대로 실행돼요', async () => {
      const order: number[] = [];

      const p1 = queue.enqueue(async () => {
        order.push(1);
        await new Promise(r => setTimeout(r, 20));
        order.push(2);
        return 'first';
      });

      const p2 = queue.enqueue(async () => {
        order.push(3);
        return 'second';
      });

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe('first');
      expect(r2).toBe('second');
      // 순서: 1 → 2 → 3 (p2는 p1이 완전히 끝난 후 시작)
      expect(order).toEqual([1, 2, 3]);
    });

    it('첫 번째 실행 중 두 번째는 queueSize=1 상태여야 해요', async () => {
      let statusDuringRun: BuildQueueStatus | null = null;

      const p1 = queue.enqueue(async () => {
        await new Promise(r => setTimeout(r, 20));
        statusDuringRun = queue.getStatus();
        return 'done';
      });

      // p1이 실행 중일 때 p2 enqueue
      await new Promise(r => setTimeout(r, 5));
      const p2 = queue.enqueue(() => Promise.resolve('second'));

      await p1;
      await p2;

      expect(statusDuringRun!.isRunning).toBe(true);
      expect(statusDuringRun!.queueSize).toBe(1);
    });
  });

  describe('타임아웃', () => {
    it('타임아웃 초과 시 BuildQueueTimeoutError를 throw해요', async () => {
      await expect(
        queue.enqueue(
          () => new Promise(r => setTimeout(r, 200)),
          { timeoutMs: 50, label: 'slow-task' },
        ),
      ).rejects.toThrow(BuildQueueTimeoutError);
    });

    it('BuildQueueTimeoutError는 label과 timeoutMs를 포함해요', async () => {
      let caughtError: unknown;

      try {
        await queue.enqueue(
          () => new Promise(r => setTimeout(r, 200)),
          { timeoutMs: 50, label: 'my-task' },
        );
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(BuildQueueTimeoutError);
      const e = caughtError as BuildQueueTimeoutError;
      expect(e.label).toBe('my-task');
      expect(e.timeoutMs).toBe(50);
    });

    it('타임아웃 내 성공이면 정상 결과를 반환해요', async () => {
      const result = await queue.enqueue(
        () => new Promise<string>(r => setTimeout(() => r('ok'), 10)),
        { timeoutMs: 1000 },
      );
      expect(result).toBe('ok');
    });
  });

  describe('getStatus()', () => {
    it('초기 상태는 queueSize=0, isRunning=false여야 해요', () => {
      const status = queue.getStatus();
      expect(status.queueSize).toBe(0);
      expect(status.isRunning).toBe(false);
    });

    it('실행 중일 때 isRunning=true여야 해요', async () => {
      let runningStatus: BuildQueueStatus | null = null;

      const p = queue.enqueue(async () => {
        await new Promise(r => setTimeout(r, 10));
        runningStatus = queue.getStatus();
      });

      await p;
      expect(runningStatus!.isRunning).toBe(true);
    });

    it('완료 후 queueSize=0, isRunning=false여야 해요', async () => {
      await queue.enqueue(() => Promise.resolve('done'));
      const status = queue.getStatus();
      expect(status.queueSize).toBe(0);
      expect(status.isRunning).toBe(false);
    });
  });
});
