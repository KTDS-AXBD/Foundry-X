// ─── F333: TaskState Machine — Phase 14 Foundation v1 (Sprint 148) ───

/** 에이전트 태스크 상태 (10-state) */
export enum TaskState {
  INTAKE          = 'INTAKE',
  SPEC_DRAFTING   = 'SPEC_DRAFTING',
  CODE_GENERATING = 'CODE_GENERATING',
  TEST_RUNNING    = 'TEST_RUNNING',
  SYNC_VERIFYING  = 'SYNC_VERIFYING',
  PR_OPENED       = 'PR_OPENED',
  FEEDBACK_LOOP   = 'FEEDBACK_LOOP',
  REVIEW_PENDING  = 'REVIEW_PENDING',
  COMPLETED       = 'COMPLETED',
  FAILED          = 'FAILED',
}

export const TASK_STATES = Object.values(TaskState);

/** 허용 전이 규칙 — PRD §3.3 기반 */
export const TRANSITIONS: Record<TaskState, TaskState[]> = {
  [TaskState.INTAKE]:          [TaskState.SPEC_DRAFTING],
  [TaskState.SPEC_DRAFTING]:   [TaskState.CODE_GENERATING, TaskState.FEEDBACK_LOOP],
  [TaskState.CODE_GENERATING]: [TaskState.TEST_RUNNING, TaskState.FEEDBACK_LOOP],
  [TaskState.TEST_RUNNING]:    [TaskState.SYNC_VERIFYING, TaskState.FEEDBACK_LOOP],
  [TaskState.SYNC_VERIFYING]:  [TaskState.PR_OPENED, TaskState.FEEDBACK_LOOP],
  [TaskState.PR_OPENED]:       [TaskState.FEEDBACK_LOOP, TaskState.REVIEW_PENDING],
  [TaskState.FEEDBACK_LOOP]:   [TaskState.SPEC_DRAFTING, TaskState.CODE_GENERATING, TaskState.TEST_RUNNING, TaskState.FAILED],
  [TaskState.REVIEW_PENDING]:  [TaskState.COMPLETED, TaskState.FEEDBACK_LOOP],
  [TaskState.COMPLETED]:       [],
  [TaskState.FAILED]:          [TaskState.INTAKE],
};

/** 이벤트 소스 타입 — F334에서 Event Bus가 실제 활용 */
export type EventSource = 'hook' | 'ci' | 'review' | 'discriminator' | 'sync' | 'manual';

/** FEEDBACK_LOOP 진입 트리거 매핑 — PRD §3.3 */
export const FEEDBACK_LOOP_TRIGGERS: Partial<Record<TaskState, EventSource[]>> = {
  [TaskState.SPEC_DRAFTING]:   ['discriminator'],
  [TaskState.CODE_GENERATING]: ['hook', 'discriminator'],
  [TaskState.TEST_RUNNING]:    ['ci'],
  [TaskState.SYNC_VERIFYING]:  ['sync'],
  [TaskState.PR_OPENED]:       ['ci', 'review'],
  [TaskState.REVIEW_PENDING]:  ['review'],
};

/** 전이 가능 여부 판별 */
export function isValidTransition(from: TaskState, to: TaskState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** 현재 상태에서 가능한 전이 목록 */
export function getAvailableTransitions(state: TaskState): TaskState[] {
  return TRANSITIONS[state] ?? [];
}

// ─── 타입 정의 ───

export interface TransitionRequest {
  taskId: string;
  toState: TaskState;
  triggerSource?: EventSource;
  triggerEvent?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  taskId: string;
  fromState: TaskState;
  toState: TaskState;
  timestamp: string;
  guardMessage?: string;
}

export interface TaskStateRecord {
  id: string;
  taskId: string;
  tenantId: string;
  currentState: TaskState;
  agentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStateHistoryRecord {
  id: string;
  taskId: string;
  tenantId: string;
  fromState: TaskState;
  toState: TaskState;
  triggerSource: EventSource | null;
  triggerEvent: string | null;
  guardResult: string | null;
  transitionedBy: string | null;
  createdAt: string;
}
