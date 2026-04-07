// ─── F399: createEvent 헬퍼 — 이벤트 팩토리 (Sprint 186) ───

import type { DomainEvent, EventType } from "./types.js";
import type { ServiceId } from "../types.js";

/**
 * DomainEvent 객체를 생성한다.
 * id(UUID)와 timestamp(ISO 8601)를 자동 주입한다.
 */
export function createEvent<T = unknown>(
  type: EventType,
  source: ServiceId,
  payload: T,
  metadata?: DomainEvent["metadata"],
): DomainEvent<T> {
  return {
    id: crypto.randomUUID(),
    type,
    source,
    timestamp: new Date().toISOString(),
    payload,
    ...(metadata ? { metadata } : {}),
  };
}
