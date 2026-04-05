// ─── F334: EventBus — 이벤트 정규화 + 발행/구독 (Sprint 149) ───

import type { TaskEvent } from "@foundry-x/shared";

export type EventHandler = (event: TaskEvent) => Promise<void> | void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /** 이벤트 구독 — 소스별 또는 전체('*'). unsubscribe 함수 반환 */
  subscribe(source: string, handler: EventHandler): () => void {
    if (!this.handlers.has(source)) {
      this.handlers.set(source, new Set());
    }
    this.handlers.get(source)!.add(handler);

    return () => {
      this.handlers.get(source)?.delete(handler);
    };
  }

  /** 이벤트 발행 — 소스별 + 와일드카드('*') 핸들러 모두 호출 */
  async emit(event: TaskEvent): Promise<void> {
    const sourceHandlers = this.handlers.get(event.source) ?? new Set();
    const wildcardHandlers = this.handlers.get("*") ?? new Set();

    const allHandlers = [...sourceHandlers, ...wildcardHandlers];
    await Promise.all(allHandlers.map((h) => h(event)));
  }

  /** 전체 구독 해제 (테스트/cleanup용) */
  clear(): void {
    this.handlers.clear();
  }
}
