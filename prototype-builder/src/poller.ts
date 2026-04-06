import type { Prototype, BuilderConfig } from './types.js';

/**
 * Foundry-X API에서 대기 중인 Prototype Job을 폴링
 */
export async function pollForJobs(
  config: Pick<BuilderConfig, 'apiBaseUrl' | 'apiToken'>,
): Promise<Prototype[]> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/prototypes?status=queued`,
    {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`API polling failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { items: Prototype[] };
  return data.items;
}

/**
 * feedback_pending 상태의 Job을 폴링 (피드백 재생성 대상)
 */
export async function pollForFeedbackJobs(
  config: Pick<BuilderConfig, 'apiBaseUrl' | 'apiToken'>,
): Promise<Prototype[]> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/prototypes?status=feedback_pending`,
    {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Feedback polling failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { items: Prototype[] };
  return data.items;
}

/**
 * Prototype 상태를 API에 갱신
 */
export async function updatePrototypeStatus(
  id: string,
  update: Record<string, unknown>,
  config: Pick<BuilderConfig, 'apiBaseUrl' | 'apiToken'>,
): Promise<void> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/prototypes/${id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    },
  );

  if (!response.ok) {
    throw new Error(`Status update failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * 폴링 루프 시작 — 주어진 간격으로 반복 실행
 */
export function startPollingLoop(
  handler: () => Promise<void>,
  intervalMs: number,
): { stop: () => void } {
  let running = true;
  let timeoutId: ReturnType<typeof setTimeout>;

  const loop = async () => {
    if (!running) return;
    try {
      await handler();
    } catch (err) {
      console.error('[Poller] Error:', err);
    }
    if (running) {
      timeoutId = setTimeout(loop, intervalMs);
    }
  };

  void loop();

  return {
    stop() {
      running = false;
      clearTimeout(timeoutId);
    },
  };
}
