import {
  type AgentExecutionResult,
  type AgentRunner,
  insertAgentMessage,
  updateAgentTaskHookStatus,
} from "../../agent/types.js";
import type { SSEManager } from "../../../services/sse-manager.js";

// ─── F101: Agent Hook AutoFix Service ───

const MAX_FIX_DIFF_LINES = 50;
const MAX_ATTEMPTS = 2;

export interface FixAttempt {
  attempt: number;
  prompt: string;
  result: AgentExecutionResult | null;
  diffLines: number;
  success: boolean;
  error?: string;
}

export class AutoFixService {
  constructor(
    private db: D1Database,
    private fixRunner: AgentRunner,
    private sse?: SSEManager,
  ) {}

  async retryWithFix(
    taskId: string,
    hookType: string,
    hookError: string,
    fileContext: string,
    relatedFiles?: string[],
  ): Promise<{ fixed: boolean; attempts: FixAttempt[]; escalated: boolean }> {
    const attempts: FixAttempt[] = [];
    let fixed = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const prompt = this.buildFixPrompt(hookType, attempt, hookError, fileContext, relatedFiles);

      try {
        const result = await this.fixRunner.execute({
          taskId: `${taskId}-fix-${attempt}`,
          agentId: "auto-fix",
          taskType: "code-generation",
          context: {
            repoUrl: "",
            branch: "master",
            instructions: prompt,
          },
          constraints: [],
        });

        const diffLines = result.output.generatedCode?.reduce(
          (sum, file) => sum + file.content.split("\n").length,
          0,
        ) ?? 0;

        if (diffLines > MAX_FIX_DIFF_LINES) {
          attempts.push({
            attempt,
            prompt,
            result,
            diffLines,
            success: false,
            error: `Diff too large: ${diffLines} lines (max ${MAX_FIX_DIFF_LINES})`,
          });
          continue;
        }

        if (result.status === "success" && result.output.generatedCode?.length) {
          attempts.push({ attempt, prompt, result, diffLines, success: true });
          fixed = true;
          break;
        }

        attempts.push({
          attempt,
          prompt,
          result,
          diffLines,
          success: false,
          error: result.output.analysis ?? "Fix generation failed",
        });
      } catch (err) {
        attempts.push({
          attempt,
          prompt,
          result: null,
          diffLines: 0,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    let escalated = false;
    if (!fixed) {
      await this.escalateToHuman(taskId, hookType, hookError, attempts);
      escalated = true;
    }

    await this.recordAttempts(taskId, attempts, escalated);
    return { fixed, attempts, escalated };
  }

  buildFixPrompt(
    hookType: string,
    attempt: number,
    hookError: string,
    fileContext: string,
    relatedFiles?: string[],
  ): string {
    const base = `Fix the following ${hookType} hook failure.\n\nError:\n${hookError}\n\nFile context:\n${fileContext}`;
    const related = relatedFiles?.length
      ? `\n\nRelated files: ${relatedFiles.join(", ")}`
      : "";
    const attemptHint =
      attempt > 1
        ? "\n\nPrevious fix attempt failed. Try a different, more minimal approach."
        : "\n\nGenerate the minimal diff to fix this issue. Keep changes under 50 lines.";

    return base + related + attemptHint;
  }

  async escalateToHuman(
    taskId: string,
    hookType: string,
    error: string,
    attempts: FixAttempt[],
  ): Promise<void> {
    const now = new Date().toISOString();

    await insertAgentMessage(this.db, {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      taskId,
      role: "system",
      content: JSON.stringify({
        hookType,
        error,
        attemptCount: attempts.length,
        lastAttemptError: attempts[attempts.length - 1]?.error,
      }),
      messageType: "hook_escalation",
      createdAt: now,
    });

    this.sse?.pushEvent({
      event: "agent.hook.escalated",
      data: {
        taskId,
        hookType,
        error,
        attempts: attempts.length,
        escalatedAt: now,
      },
    });
  }

  async recordAttempts(
    taskId: string,
    attempts: FixAttempt[],
    escalated: boolean,
  ): Promise<void> {
    const hookStatus = escalated
      ? "escalated"
      : attempts.some((a) => a.success)
        ? "auto_fixed"
        : "failed";

    await updateAgentTaskHookStatus(this.db, {
      taskId,
      hookStatus,
      attempts: attempts.length,
      log: JSON.stringify(
        attempts.map((a) => ({
          attempt: a.attempt,
          success: a.success,
          diffLines: a.diffLines,
          error: a.error,
        })),
      ),
    });
  }
}
