import type { WorktreeManager } from "../../../services/worktree-manager.js";
import type { AgentRunner } from "../../../services/agent/agent-runner.js";
import type { AgentInbox } from "../../../services/agent-inbox.js";
import type { SSEManager } from "../../../services/sse-manager.js";

// ─── F102: Agent Auto-Rebase Service ───

const MAX_REBASE_ATTEMPTS = 3;
const REBASE_TIMEOUT_MS = 60_000;
const MAX_CONFLICT_FILES = 10;

export { MAX_REBASE_ATTEMPTS, REBASE_TIMEOUT_MS, MAX_CONFLICT_FILES };

export interface RebaseAttempt {
  attempt: number;
  strategy: "simple" | "llm-resolve" | "llm-extended";
  conflictFiles: string[];
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface RebaseResult {
  success: boolean;
  attempts: RebaseAttempt[];
  escalated: boolean;
  restoredToOriginal: boolean;
}

export interface RebaseEscalation {
  type: "rebase_escalation";
  agentId: string;
  taskId: string;
  baseBranch: string;
  conflictFiles: string[];
  attempts: RebaseAttempt[];
  suggestedAction: "manual_rebase" | "force_push" | "abandon";
}

export class AutoRebaseService {
  constructor(
    private worktreeManager: WorktreeManager,
    private fixRunner: AgentRunner,
    private inbox: AgentInbox,
    private db: D1Database,
    private sse?: SSEManager,
  ) {}

  async rebaseWithRetry(
    agentId: string,
    baseBranch: string,
    taskId: string,
  ): Promise<RebaseResult> {
    const attempts: RebaseAttempt[] = [];
    let success = false;

    for (let i = 1; i <= MAX_REBASE_ATTEMPTS; i++) {
      const strategy = this.getStrategy(i);
      const start = Date.now();

      try {
        const result = await this.attemptRebase(agentId, baseBranch, strategy);
        const attempt: RebaseAttempt = {
          attempt: i,
          strategy,
          conflictFiles: result.conflictFiles,
          success: result.success,
          error: result.error,
          durationMs: Date.now() - start,
        };
        attempts.push(attempt);

        this.sse?.pushEvent({
          event: "agent.rebase.attempt",
          data: { agentId, taskId, attempt },
        } as any);

        if (result.success) {
          success = true;
          break;
        }
      } catch (err) {
        attempts.push({
          attempt: i,
          strategy,
          conflictFiles: [],
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
          durationMs: Date.now() - start,
        });
        await this.worktreeManager.abortRebase(agentId);
      }
    }

    if (!success) {
      await this.abortAndRestore(agentId);
      await this.escalateToHuman(agentId, taskId, baseBranch, attempts);
      return { success: false, attempts, escalated: true, restoredToOriginal: true };
    }

    return { success: true, attempts, escalated: false, restoredToOriginal: false };
  }

  private getStrategy(attempt: number): RebaseAttempt["strategy"] {
    if (attempt === 1) return "simple";
    if (attempt === 2) return "llm-resolve";
    return "llm-extended";
  }

  private async attemptRebase(
    agentId: string,
    baseBranch: string,
    strategy: RebaseAttempt["strategy"],
  ): Promise<{ success: boolean; conflictFiles: string[]; error?: string }> {
    await this.worktreeManager.fetchBase(agentId);
    const rebaseResult = await this.worktreeManager.rebase(agentId, baseBranch);

    if (rebaseResult.exitCode === 0) {
      return { success: true, conflictFiles: [] };
    }

    const conflictFiles = this.parseConflictFiles(rebaseResult.stdout);

    if (strategy === "simple") {
      await this.worktreeManager.abortRebase(agentId);
      return { success: false, conflictFiles, error: "Merge conflicts detected" };
    }

    // LLM strategies
    if (conflictFiles.length > MAX_CONFLICT_FILES) {
      await this.worktreeManager.abortRebase(agentId);
      return { success: false, conflictFiles, error: `Too many conflicts: ${conflictFiles.length}` };
    }

    const extended = strategy === "llm-extended";
    const resolved = await this.resolveConflicts(agentId, baseBranch, conflictFiles, extended);

    if (!resolved) {
      await this.worktreeManager.abortRebase(agentId);
      return { success: false, conflictFiles, error: "LLM conflict resolution failed" };
    }

    const continueResult = await this.worktreeManager.continueRebase(agentId);
    if (continueResult.exitCode === 0) {
      return { success: true, conflictFiles };
    }

    await this.worktreeManager.abortRebase(agentId);
    return { success: false, conflictFiles, error: "Continue failed after LLM resolve" };
  }

  async resolveConflicts(
    agentId: string,
    baseBranch: string,
    conflictFiles: string[],
    extended: boolean,
  ): Promise<boolean> {
    for (const file of conflictFiles) {
      const prompt = this.buildResolvePrompt(file, extended);
      const result = await this.fixRunner.execute({
        taskId: `rebase-resolve-${file}`,
        agentId: "auto-rebase",
        taskType: "code-generation",
        context: {
          repoUrl: "",
          branch: baseBranch,
          instructions: prompt,
        },
        constraints: [],
      });

      if (result.status === "success" && result.output.generatedCode?.length) {
        await this.worktreeManager.stageFile(agentId, file);
      } else {
        return false;
      }
    }
    return true;
  }

  private buildResolvePrompt(file: string, extended: boolean): string {
    const base = `Resolve the merge conflict in file: ${file}.\n\nKeep both changes where possible. Prefer the incoming branch's intent.`;
    return extended
      ? `${base}\n\nUse extended context (±50 lines around conflict markers) to understand the full picture.`
      : base;
  }

  parseConflictFiles(stdout: string): string[] {
    const files: string[] = [];
    const regex = /CONFLICT \(content\): Merge conflict in (.+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(stdout)) !== null) {
      files.push(match[1]!);
    }
    return files;
  }

  async abortAndRestore(agentId: string): Promise<void> {
    await this.worktreeManager.abortRebase(agentId);
  }

  async escalateToHuman(
    agentId: string,
    taskId: string,
    baseBranch: string,
    attempts: RebaseAttempt[],
  ): Promise<void> {
    const conflictFiles = attempts.flatMap((a) => a.conflictFiles);
    const escalation: RebaseEscalation = {
      type: "rebase_escalation",
      agentId,
      taskId,
      baseBranch,
      conflictFiles: [...new Set(conflictFiles)],
      attempts,
      suggestedAction: conflictFiles.length > MAX_CONFLICT_FILES ? "abandon" : "manual_rebase",
    };

    await this.inbox.send(
      "auto-rebase",
      "human",
      "escalation" as any,
      `Rebase failed after ${MAX_REBASE_ATTEMPTS} attempts`,
      escalation as unknown as Record<string, unknown>,
    );

    this.sse?.pushEvent({
      event: "agent.rebase.escalated",
      data: escalation,
    } as any);
  }
}
