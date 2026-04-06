import type { ServiceId } from "../types.js";

export type EventType =
  | "biz-item.created"
  | "biz-item.updated"
  | "biz-item.stage-changed"
  | "validation.completed"
  | "validation.rejected"
  | "offering.generated"
  | "prototype.created"
  | "pipeline.step-completed";

export interface DomainEvent<T = unknown> {
  id: string; // UUID
  type: EventType;
  source: ServiceId;
  timestamp: string; // ISO 8601
  payload: T;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    orgId?: string;
  };
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export interface EventSubscriber {
  subscribe(
    type: EventType,
    handler: (event: DomainEvent) => Promise<void>,
  ): void;
}
