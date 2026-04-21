/**
 * 도메인 이벤트 카탈로그 v1.0 (cross-domain event contracts)
 *
 * 규칙: 타입과 인터페이스만 — 이벤트 처리 로직, D1EventBus 구현체 금지.
 * 구현체: packages/shared/src/events/d1-bus.ts (이동 대상 아님)
 *
 * @see packages/shared-contracts/DESIGN.md
 */

/** 서비스 경계 식별자 */
export type EventServiceId =
  | "discovery"
  | "gate"
  | "launch"
  | "portal"
  | "core";

/** 도메인 이벤트 타입 */
export type DomainEventType =
  | "biz-item.created"
  | "biz-item.updated"
  | "biz-item.stage-changed"
  | "validation.completed"
  | "validation.rejected"
  | "offering.generated"
  | "prototype.created"
  | "pipeline.step-completed";

/** 공통 도메인 이벤트 envelope */
export interface DomainEventEnvelope<T = unknown> {
  id: string;
  type: DomainEventType;
  source: EventServiceId;
  timestamp: string;
  payload: T;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    orgId?: string;
  };
}

// ── BizItem 도메인 (Discovery 서비스) ────────────────────────

export interface BizItemCreatedPayload {
  bizItemId: string;
  title: string;
  type: "I" | "M" | "P" | "T" | "S";
  orgId: string;
  createdBy: string;
}
export type BizItemCreatedEvent = DomainEventEnvelope<BizItemCreatedPayload>;

export interface BizItemUpdatedPayload {
  bizItemId: string;
  fields: string[];
  orgId: string;
  updatedBy: string;
}
export type BizItemUpdatedEvent = DomainEventEnvelope<BizItemUpdatedPayload>;

export interface BizItemStageChangedPayload {
  bizItemId: string;
  fromStage: string;
  toStage: string;
  orgId: string;
  changedBy: string;
}
export type BizItemStageChangedEvent = DomainEventEnvelope<BizItemStageChangedPayload>;

// ── Validation 도메인 (Gate 서비스) ──────────────────────────

export interface ValidationCompletedPayload {
  validationId: string;
  bizItemId: string;
  score: number;
  verdict: "PASS" | "CONDITIONAL" | "FAIL";
  orgId: string;
}
export type ValidationCompletedEvent = DomainEventEnvelope<ValidationCompletedPayload>;

export interface ValidationRejectedPayload {
  validationId: string;
  bizItemId: string;
  reason: string;
  orgId: string;
}
export type ValidationRejectedEvent = DomainEventEnvelope<ValidationRejectedPayload>;

// ── Offering 도메인 (Launch 서비스) ──────────────────────────

export interface OfferingGeneratedPayload {
  offeringId: string;
  bizItemId: string;
  format: "html" | "pptx" | "pdf";
  url: string;
  orgId: string;
}
export type OfferingGeneratedEvent = DomainEventEnvelope<OfferingGeneratedPayload>;

export interface PrototypeCreatedPayload {
  prototypeId: string;
  bizItemId: string;
  prototypeType: string;
  orgId: string;
  createdBy: string;
}
export type PrototypeCreatedEvent = DomainEventEnvelope<PrototypeCreatedPayload>;

// ── Pipeline 도메인 (Core 서비스) ────────────────────────────

export interface PipelineStepCompletedPayload {
  pipelineId: string;
  stepId: string;
  stepName: string;
  result: "success" | "failure" | "skipped";
  durationMs: number;
  orgId: string;
}
export type PipelineStepCompletedEvent = DomainEventEnvelope<PipelineStepCompletedPayload>;

// ── 유니언 타입 ───────────────────────────────────────────────

export type AnyDomainEvent =
  | BizItemCreatedEvent
  | BizItemUpdatedEvent
  | BizItemStageChangedEvent
  | ValidationCompletedEvent
  | ValidationRejectedEvent
  | OfferingGeneratedEvent
  | PrototypeCreatedEvent
  | PipelineStepCompletedEvent;
