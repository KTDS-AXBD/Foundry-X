// ─── F334: HookResultProcessor — Shell exit code → TaskEvent 변환 (Sprint 149) ───

import {
  createTaskEvent,
  type TaskEvent,
  type EventSeverity,
  type HookEventPayload,
} from "@foundry-x/shared";

export interface HookResult {
  exitCode: number;
  stderr: string;
  hookType: "PreToolUse" | "PostToolUse";
  filePath?: string;
  toolName?: string;
}

export class HookResultProcessor {
  /**
   * Shell exit code를 TaskEvent로 변환
   * - exit 0: info (정상)
   * - exit 1: error (실패)
   * - exit 2: warning (경고, 비차단)
   * - 기타: error
   */
  process(result: HookResult, taskId: string, tenantId: string): TaskEvent {
    const severity = this.mapSeverity(result.exitCode);
    const payload: HookEventPayload = {
      type: "hook",
      hookType: result.hookType,
      exitCode: result.exitCode,
      stderr: result.stderr,
      filePath: result.filePath,
      toolName: result.toolName,
    };

    return createTaskEvent("hook", severity, taskId, tenantId, payload);
  }

  private mapSeverity(exitCode: number): EventSeverity {
    switch (exitCode) {
      case 0:
        return "info";
      case 2:
        return "warning";
      default:
        return "error";
    }
  }
}
