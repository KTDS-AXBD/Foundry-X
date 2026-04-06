import {
  type PrototypeStatus,
  PROTOTYPE_TRANSITIONS,
  PROTOTYPE_TIMEOUTS,
  isValidPrototypeTransition,
} from '@foundry-x/shared';

export interface StateTransitionResult {
  success: boolean;
  from: PrototypeStatus;
  to: PrototypeStatus;
  error?: string;
}

export interface TimeoutCheck {
  status: PrototypeStatus;
  startedAt: number;
  isTimedOut: boolean;
  elapsedMs: number;
  timeoutMs: number;
}

/**
 * Prototype 상태 전환 실행 — 유효하지 않은 전환은 거부
 */
export function transition(
  from: PrototypeStatus,
  to: PrototypeStatus,
): StateTransitionResult {
  if (!isValidPrototypeTransition(from, to)) {
    return {
      success: false,
      from,
      to,
      error: `Invalid transition: ${from} → ${to}. Allowed: [${PROTOTYPE_TRANSITIONS[from].join(', ')}]`,
    };
  }
  return { success: true, from, to };
}

/**
 * 상태별 timeout 초과 여부 확인
 * building → 15분, deploying → 5분 초과 시 dead_letter 전환 대상
 */
export function checkTimeout(
  status: PrototypeStatus,
  startedAt: number,
  now: number = Date.now(),
): TimeoutCheck {
  const timeoutMs = PROTOTYPE_TIMEOUTS[status] ?? Infinity;
  const elapsedMs = now - startedAt;

  return {
    status,
    startedAt,
    isTimedOut: elapsedMs > timeoutMs,
    elapsedMs,
    timeoutMs,
  };
}

/**
 * dead-letter 전환이 가능한 상태인지 확인
 */
export function canDeadLetter(status: PrototypeStatus): boolean {
  return isValidPrototypeTransition(status, 'dead_letter');
}

/**
 * 재시도(retry) 가능한 상태인지 확인
 * failed → queued, deploy_failed → deploying
 */
export function canRetry(status: PrototypeStatus): boolean {
  if (status === 'failed') return isValidPrototypeTransition('failed', 'queued');
  if (status === 'deploy_failed') return isValidPrototypeTransition('deploy_failed', 'deploying');
  return false;
}

/**
 * 피드백 재생성이 가능한 상태인지 확인
 * live → feedback_pending → building
 */
export function canAcceptFeedback(status: PrototypeStatus): boolean {
  return status === 'live';
}

/**
 * 터미널(최종) 상태인지 확인
 */
export function isTerminal(status: PrototypeStatus): boolean {
  return PROTOTYPE_TRANSITIONS[status].length === 0;
}
