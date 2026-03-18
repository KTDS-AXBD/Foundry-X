import type { Page } from "@playwright/test";

/**
 * F63: SSE 이벤트를 안정적으로 대기하는 헬퍼.
 * 페이지 내 window.__sseEvents 배열을 폴링하여 이벤트 도착 확인.
 */
export async function waitForSSEEvent(
  page: Page,
  eventType: string,
  options?: { timeout?: number; pollInterval?: number },
): Promise<unknown> {
  const { timeout = 10000, pollInterval = 200 } = options ?? {};
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = await page.evaluate((type) => {
      // @ts-expect-error — injected by injectSSECollector
      const events = window.__sseEvents;
      if (!Array.isArray(events)) return null;
      return events.find((e: any) => e.type === type) ?? null;
    }, eventType);

    if (event) return event;
    await page.waitForTimeout(pollInterval);
  }

  throw new Error(`SSE event "${eventType}" not received within ${timeout}ms`);
}

/**
 * SSE 이벤트 수집을 시작하는 스크립트를 페이지에 주입.
 * test.beforeEach에서 호출.
 */
export async function injectSSECollector(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // @ts-expect-error — custom property for SSE event collection
    window.__sseEvents = [];
    const OriginalES = window.EventSource;
    if (!OriginalES) return;

    window.EventSource = class extends OriginalES {
      constructor(url: string | URL, init?: EventSourceInit) {
        super(url, init);
        this.addEventListener("message", (e: MessageEvent) => {
          try {
            // @ts-expect-error — injected property
            window.__sseEvents.push(JSON.parse(e.data));
          } catch { /* ignore non-JSON */ }
        });
      }
    };
  });
}

/**
 * 수집된 SSE 이벤트 배열 초기화.
 */
export async function clearSSEEvents(page: Page): Promise<void> {
  // @ts-expect-error — injected property
  await page.evaluate(() => { window.__sseEvents = []; });
}

/**
 * 현재까지 수집된 SSE 이벤트 수 반환.
 */
export async function getSSEEventCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    // @ts-expect-error — injected property
    const events = window.__sseEvents;
    return Array.isArray(events) ? events.length : 0;
  });
}
