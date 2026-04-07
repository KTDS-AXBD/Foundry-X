/**
 * F429: BuildQueue — max-cli 단일 머신 순차 실행 보장
 *
 * 문제: Claude Code CLI는 단일 세션만 지원.
 * 다수 Job이 동시에 runMaxCli에 진입하면 두 번째 subprocess 즉시 실패.
 *
 * 해결: Singleton FIFO 큐 + Semaphore(max=1)
 * - enqueue(fn) → Promise<T> 반환
 * - 큐에 누적된 fn은 하나씩 순차 실행
 * - 타임아웃 초과 시 BuildQueueTimeoutError throw
 */

export interface BuildQueueOptions {
  /** 작업 타임아웃 (기본값: 300_000ms = 5분) */
  timeoutMs?: number;
  /** 로깅용 레이블 */
  label?: string;
}

export interface BuildQueueStatus {
  /** 대기 중인 항목 수 (현재 실행 중인 작업 미포함) */
  queueSize: number;
  /** 현재 실행 중 여부 */
  isRunning: boolean;
}

export class BuildQueueTimeoutError extends Error {
  readonly label: string;
  readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`BuildQueue timeout: "${label}" exceeded ${timeoutMs}ms`);
    this.name = 'BuildQueueTimeoutError';
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

interface QueueItem<T = unknown> {
  fn: () => Promise<T>;
  timeoutMs: number;
  label: string;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

const DEFAULT_TIMEOUT_MS = 300_000; // 5분

/**
 * BuildQueue — Singleton FIFO 큐 (Semaphore max=1)
 *
 * 사용 예:
 *   const result = await BuildQueue.getInstance().enqueue(
 *     () => execFileAsync('claude', args, opts),
 *     { label: 'job-123-round0', timeoutMs: 310_000 },
 *   );
 */
export class BuildQueue {
  private static instance: BuildQueue;

  private queue: QueueItem[] = [];
  private running = false;

  private constructor() {}

  static getInstance(): BuildQueue {
    if (!BuildQueue.instance) {
      BuildQueue.instance = new BuildQueue();
    }
    return BuildQueue.instance;
  }

  /**
   * 큐에 작업 등록
   * @returns 작업 완료 시 결과를 resolve하는 Promise
   */
  enqueue<T>(
    fn: () => Promise<T>,
    opts: BuildQueueOptions = {},
  ): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const label = opts.label ?? 'unnamed';

    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = {
        fn,
        timeoutMs,
        label,
        resolve: resolve as (value: unknown) => void,
        reject,
      };
      this.queue.push(item as QueueItem);
      console.log(`[BuildQueue] Enqueued "${label}" (queue size: ${this.queue.length})`);
      this.processNext();
    });
  }

  /** 현재 큐 상태 반환 */
  getStatus(): BuildQueueStatus {
    return {
      queueSize: this.queue.length,
      isRunning: this.running,
    };
  }

  /**
   * 큐 초기화 (테스트용)
   * 대기 중인 모든 항목을 거부하고 큐를 비워요.
   */
  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error('BuildQueue cleared'));
    }
    this.queue = [];
    this.running = false;
  }

  /** 내부: 다음 항목 처리 */
  private processNext(): void {
    if (this.running || this.queue.length === 0) return;

    const item = this.queue.shift()!;
    this.running = true;

    console.log(`[BuildQueue] Starting "${item.label}" (remaining: ${this.queue.length})`);

    withTimeout(item.fn, item.timeoutMs, item.label)
      .then(result => {
        // running=false를 resolve 전에 설정해야 사용자 코드에서 getStatus()가 정확해요
        this.running = false;
        this.processNext();
        console.log(`[BuildQueue] Completed "${item.label}"`);
        item.resolve(result);
      })
      .catch(err => {
        this.running = false;
        this.processNext();
        if (err instanceof BuildQueueTimeoutError) {
          console.warn(`[BuildQueue] Timeout "${item.label}" after ${item.timeoutMs}ms`);
        } else {
          console.error(`[BuildQueue] Error "${item.label}":`, err);
        }
        item.reject(err);
      });
  }
}

/**
 * Promise.race 기반 타임아웃 래퍼
 */
function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    // Node.js가 이 timer 때문에 프로세스를 유지하지 않도록 unref 호출
    // setTimeout은 Node.js에서 Timeout 객체를 반환하므로 캐스팅
    const timer = setTimeout(
      () => reject(new BuildQueueTimeoutError(label, timeoutMs)),
      timeoutMs,
    ) as unknown as { unref?: () => void };
    timer.unref?.();
  });

  return Promise.race([fn(), timeoutPromise]);
}
