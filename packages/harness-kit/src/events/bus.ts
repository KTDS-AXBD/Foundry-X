import type {
  DomainEvent,
  EventType,
  EventPublisher,
  EventSubscriber,
} from "./types.js";

export interface EventBus extends EventPublisher, EventSubscriber {
  publishBatch(events: DomainEvent[]): Promise<void>;
}

/** Stub 구현 — Sprint 185에서 D1 Event Table 기반으로 교체 */
export class NoopEventBus implements EventBus {
  async publish(_event: DomainEvent): Promise<void> {
    // noop
  }

  async publishBatch(_events: DomainEvent[]): Promise<void> {
    // noop
  }

  subscribe(
    _type: EventType,
    _handler: (event: DomainEvent) => Promise<void>,
  ): void {
    // noop
  }
}
