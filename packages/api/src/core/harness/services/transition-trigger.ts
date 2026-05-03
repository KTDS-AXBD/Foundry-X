// ─── F334: TransitionTrigger — EventBus→FEEDBACK_LOOP 자동 전이 (Sprint 149) ───

import {
  TaskState,
  FEEDBACK_LOOP_TRIGGERS,
  type TaskEvent,
  type EventSource,
} from "@foundry-x/shared";
import type { TaskStateService } from "../../../agent/services/task-state-service.js";
import type { EventBus } from "../../../services/event-bus.js";

/**
 * EventBus 구독자 — error/critical 이벤트 기반으로 FEEDBACK_LOOP 자동 전이 트리거
 * PRD §3.3: FEEDBACK_LOOP_TRIGGERS 매핑 참조
 */
export class TransitionTrigger {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private taskStateService: TaskStateService,
    private eventBus: EventBus,
  ) {}

  /** EventBus에 등록 — error/critical 이벤트만 처리 */
  start(): void {
    this.unsubscribe = this.eventBus.subscribe("*", async (event) => {
      if (event.severity !== "error" && event.severity !== "critical") return;
      await this.handleEvent(event);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private async handleEvent(event: TaskEvent): Promise<void> {
    const current = await this.taskStateService.getState(
      event.taskId,
      event.tenantId,
    );
    if (!current) return;

    const triggers = FEEDBACK_LOOP_TRIGGERS[current.currentState];
    if (!triggers || !triggers.includes(event.source as EventSource)) return;

    await this.taskStateService.transition(
      {
        taskId: event.taskId,
        toState: TaskState.FEEDBACK_LOOP,
        triggerSource: event.source as EventSource,
        triggerEvent: event.id,
        metadata: { autoTriggered: true, eventSeverity: event.severity },
      },
      event.tenantId,
      "system:transition-trigger",
    );
  }
}
