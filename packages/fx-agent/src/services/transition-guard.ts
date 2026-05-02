// ─── F333: TransitionGuard — 상태 전이 허용 검증 (Sprint 148) ───

import { type TaskState, type EventSource, isValidTransition } from "@foundry-x/shared";

export interface GuardContext {
  taskId: string;
  fromState: TaskState;
  toState: TaskState;
  tenantId: string;
  triggerSource?: EventSource;
  metadata?: Record<string, unknown>;
}

export interface GuardResult {
  allowed: boolean;
  message?: string;
}

export type GuardFn = (ctx: GuardContext) => Promise<GuardResult> | GuardResult;

export class TransitionGuard {
  private guards: GuardFn[] = [];

  /** 커스텀 가드 등록 — F334+에서 Hook/Event 기반 가드 추가 */
  register(guard: GuardFn): void {
    this.guards.push(guard);
  }

  /** 전이 허용 여부 검증: 기본 규칙 + 커스텀 가드 순회 */
  async check(ctx: GuardContext): Promise<GuardResult> {
    if (!isValidTransition(ctx.fromState, ctx.toState)) {
      return {
        allowed: false,
        message: `Transition ${ctx.fromState} → ${ctx.toState} is not allowed`,
      };
    }

    for (const guard of this.guards) {
      const result = await guard(ctx);
      if (!result.allowed) return result;
    }

    return { allowed: true };
  }
}

/** 기본 가드 인스턴스 — F333에서는 전이 규칙만 검증 */
export function createDefaultGuard(): TransitionGuard {
  return new TransitionGuard();
}
