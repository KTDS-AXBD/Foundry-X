// ─── F334: TaskEvent Types — Phase 14 Foundation v2 (Sprint 149) ───

export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

export type TaskEventSource = 'hook' | 'ci' | 'review' | 'discriminator' | 'sync' | 'manual' | 'pipeline';

/** 통합 이벤트 shape — 모든 이벤트 소스가 이 형식을 따름 */
export interface TaskEvent {
  id: string;
  source: TaskEventSource;
  severity: EventSeverity;
  taskId: string;
  tenantId: string;
  timestamp: string;
  payload: TaskEventPayload;
}

/** 이벤트 소스별 payload — discriminated union on 'type' */
export type TaskEventPayload =
  | HookEventPayload
  | CIEventPayload
  | ReviewEventPayload
  | DiscriminatorEventPayload
  | SyncEventPayload
  | ManualEventPayload
  | PipelineEventPayload;

export interface HookEventPayload {
  type: 'hook';
  hookType: 'PreToolUse' | 'PostToolUse';
  exitCode: number;
  stderr: string;
  filePath?: string;
  toolName?: string;
}

export interface CIEventPayload {
  type: 'ci';
  provider: string;
  runId: string;
  status: 'success' | 'failure';
  details?: string;
}

export interface ReviewEventPayload {
  type: 'review';
  reviewer: string;
  action: 'approved' | 'changes_requested' | 'commented';
  body?: string;
}

export interface DiscriminatorEventPayload {
  type: 'discriminator';
  verdict: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  score: number;
  feedback: string[];
}

export interface SyncEventPayload {
  type: 'sync';
  syncType: 'spec-code' | 'code-test' | 'spec-test';
  driftScore: number;
  details?: string;
}

export interface ManualEventPayload {
  type: 'manual';
  action: string;
  reason?: string;
}

// ─── F379: Pipeline Event (Sprint 171) ───
export interface PipelineEventPayload {
  type: 'pipeline';
  action: 'discovery.completed' | 'offering.created' | 'offering.prefilled';
  itemId: string;
  offeringId?: string;
  details?: string;
}

/** TaskEvent 생성 헬퍼 */
export function createTaskEvent(
  source: TaskEventSource,
  severity: EventSeverity,
  taskId: string,
  tenantId: string,
  payload: TaskEventPayload,
): TaskEvent {
  return {
    id: crypto.randomUUID(),
    source,
    severity,
    taskId,
    tenantId,
    timestamp: new Date().toISOString(),
    payload,
  };
}
