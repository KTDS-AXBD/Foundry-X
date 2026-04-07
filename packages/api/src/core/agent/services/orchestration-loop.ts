// ─── F335: OrchestrationLoop — 3모드 피드백 루프 엔진 (Sprint 150) ───

import {
  TaskState,
  DEFAULT_CONVERGENCE,
  type AgentAdapter,
  type AgentExecutionContext,
  type LoopMode,
  type LoopOutcome,
  type LoopRoundResult,
  type LoopStartParams,
  type ConvergenceCriteria,
  createTaskEvent,
} from "@foundry-x/shared";
import { TaskStateService } from "./task-state-service.js";
import { FeedbackLoopContextManager } from "../../../modules/portal/services/feedback-loop-context.js";
import { EventBus } from "../../../services/event-bus.js";
import { TransitionGuard } from "../../harness/services/transition-guard.js";

export class OrchestrationLoop {
  private contextManager: FeedbackLoopContextManager;

  constructor(
    private taskStateService: TaskStateService,
    private eventBus: EventBus,
    private db: D1Database,
  ) {
    this.contextManager = new FeedbackLoopContextManager(db);
  }

  /**
   * 루프 실행 — 태스크가 FEEDBACK_LOOP 상태일 때만 호출 가능
   *
   * 1. 현재 상태 검증 (FEEDBACK_LOOP 확인)
   * 2. FeedbackLoopContext 생성
   * 3. 모드별 라운드 반복 (최대 maxRounds)
   * 4. 수렴 시 exitTarget으로 전이, 미수렴 시 FAILED
   */
  async run(params: LoopStartParams): Promise<LoopOutcome> {
    // 1. 현재 상태 검증
    const taskState = await this.taskStateService.getState(params.taskId, params.tenantId);
    if (!taskState) {
      return { status: "escalated", reason: "Task not found", round: 0 };
    }
    if (taskState.currentState !== TaskState.FEEDBACK_LOOP) {
      return {
        status: "escalated",
        reason: `Task is in ${taskState.currentState}, not FEEDBACK_LOOP`,
        round: 0,
      };
    }

    // 2. exitTarget 결정 — FEEDBACK_LOOP 이전 상태의 다음 정상 단계
    const exitTarget = this.determineExitTarget(taskState.metadata);

    // 3. FeedbackLoopContext 생성
    const convergence: ConvergenceCriteria = {
      ...DEFAULT_CONVERGENCE,
      ...params.convergence,
    };

    const ctx = await this.contextManager.create({
      taskId: params.taskId,
      tenantId: params.tenantId,
      entryState: taskState.currentState,
      triggerEventId: null,
      loopMode: params.loopMode,
      exitTarget,
      convergence: params.convergence,
    });

    // 루프 시작 이벤트
    await this.emitLoopEvent(params.taskId, params.tenantId, "loop_started", {
      loopMode: params.loopMode,
      maxRounds: convergence.maxRounds,
      contextId: ctx.id,
    });

    // 4. 모드별 라운드 반복
    let consecutivePass = 0;
    let bestScore = 0;
    let lastResult: LoopRoundResult | null = null;

    for (let round = 1; round <= convergence.maxRounds; round++) {
      const result = await this.executeRound(params, ctx.id, round);
      lastResult = result;

      // 라운드 결과 저장
      await this.contextManager.addRound(ctx.id, result);

      // 품질 추적
      if (result.qualityScore !== null && result.qualityScore > bestScore) {
        bestScore = result.qualityScore;
      }

      // 수렴 판정
      if (this.checkConvergence(convergence, result)) {
        consecutivePass++;
        if (consecutivePass >= convergence.requiredConsecutivePass) {
          // 수렴 성공 — exitTarget으로 전이
          await this.contextManager.complete(ctx.id, "resolved");
          await this.taskStateService.transition(
            { taskId: params.taskId, toState: exitTarget, triggerSource: "manual", triggerEvent: "loop_resolved" },
            params.tenantId,
          );

          await this.emitLoopEvent(params.taskId, params.tenantId, "loop_resolved", {
            rounds: round,
            finalScore: result.qualityScore ?? bestScore,
            contextId: ctx.id,
          });

          return {
            status: "resolved",
            exitState: exitTarget,
            rounds: round,
            finalScore: result.qualityScore ?? bestScore,
          };
        }
      } else {
        consecutivePass = 0;
      }

      // 에러 발생 시 escalation
      if (result.status === "error") {
        await this.contextManager.complete(ctx.id, "escalated");
        await this.emitLoopEvent(params.taskId, params.tenantId, "loop_escalated", {
          reason: result.feedback.join("; "),
          round,
          contextId: ctx.id,
        });
        return {
          status: "escalated",
          reason: result.feedback.join("; "),
          round,
        };
      }
    }

    // maxRounds 도달 — exhausted → FAILED
    await this.contextManager.complete(ctx.id, "exhausted");
    await this.taskStateService.transition(
      { taskId: params.taskId, toState: TaskState.FAILED, triggerSource: "manual", triggerEvent: "loop_exhausted" },
      params.tenantId,
    );

    const residualIssues = lastResult?.feedback ?? [];

    await this.emitLoopEvent(params.taskId, params.tenantId, "loop_exhausted", {
      rounds: convergence.maxRounds,
      bestScore,
      residualIssues,
      contextId: ctx.id,
    });

    return {
      status: "exhausted",
      rounds: convergence.maxRounds,
      bestScore,
      residualIssues,
    };
  }

  /** 루프 이력 조회 */
  async getHistory(taskId: string, tenantId: string, limit = 10) {
    return this.contextManager.getByTask(taskId, tenantId, limit);
  }

  // ─── Private ───

  private async executeRound(
    params: LoopStartParams,
    contextId: string,
    round: number,
  ): Promise<LoopRoundResult> {
    const startTime = Date.now();
    const previousFeedback = round > 1
      ? (await this.contextManager.getById(contextId))?.history
          .flatMap((r) => r.feedback) ?? []
      : [];

    const execCtx: AgentExecutionContext = {
      taskId: params.taskId,
      tenantId: params.tenantId,
      round,
      loopMode: params.loopMode,
      previousFeedback,
      metadata: params.metadata,
    };

    switch (params.loopMode) {
      case "retry":
        return this.runRetryRound(params.agents, execCtx, startTime);
      case "adversarial":
        return this.runAdversarialRound(params.agents, execCtx, startTime);
      case "fix":
        return this.runFixRound(params.agents, execCtx, startTime);
    }
  }

  /** retry: 첫 번째 에이전트에 실패 컨텍스트 전달 → 재실행 */
  private async runRetryRound(
    agents: AgentAdapter[],
    ctx: AgentExecutionContext,
    startTime: number,
  ): Promise<LoopRoundResult> {
    const agent = agents[0];
    if (!agent) {
      return this.errorResult(ctx.round, "unknown", "No agent provided", startTime);
    }

    try {
      const result = await agent.execute(ctx);
      return {
        round: ctx.round,
        agentName: agent.name,
        qualityScore: result.qualityScore,
        feedback: result.feedback,
        status: result.success ? "pass" : "fail",
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return this.errorResult(ctx.round, agent.name, String(err), startTime);
    }
  }

  /** adversarial: Generator → Discriminator → 피드백 */
  private async runAdversarialRound(
    agents: AgentAdapter[],
    ctx: AgentExecutionContext,
    startTime: number,
  ): Promise<LoopRoundResult> {
    const generator = agents.find((a) => a.role === "generator");
    const discriminator = agents.find((a) => a.role === "discriminator");

    if (!generator || !discriminator) {
      return this.errorResult(
        ctx.round,
        "unknown",
        "Adversarial mode requires both generator and discriminator agents",
        startTime,
      );
    }

    try {
      // Generator 실행
      const genResult = await generator.execute(ctx);

      // Discriminator 평가
      const discCtx: AgentExecutionContext = {
        ...ctx,
        previousFeedback: genResult.feedback,
        metadata: { ...ctx.metadata, generatorArtifacts: genResult.artifacts },
      };
      const discResult = await discriminator.execute(discCtx);

      return {
        round: ctx.round,
        agentName: `${generator.name}→${discriminator.name}`,
        qualityScore: discResult.qualityScore,
        feedback: [...genResult.feedback, ...discResult.feedback],
        status: discResult.success ? "pass" : "fail",
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return this.errorResult(ctx.round, `${generator.name}→${discriminator.name}`, String(err), startTime);
    }
  }

  /** fix: 에러 컨텍스트 → 수정 생성 → 검증 */
  private async runFixRound(
    agents: AgentAdapter[],
    ctx: AgentExecutionContext,
    startTime: number,
  ): Promise<LoopRoundResult> {
    const fixer = agents[0];
    if (!fixer) {
      return this.errorResult(ctx.round, "unknown", "No fixer agent provided", startTime);
    }

    try {
      const result = await fixer.execute(ctx);
      return {
        round: ctx.round,
        agentName: fixer.name,
        qualityScore: result.qualityScore,
        feedback: result.feedback,
        status: result.success ? "pass" : "fail",
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return this.errorResult(ctx.round, fixer.name, String(err), startTime);
    }
  }

  /** 수렴 판정 — qualityScore >= threshold 이면 pass */
  private checkConvergence(criteria: ConvergenceCriteria, result: LoopRoundResult): boolean {
    if (result.status === "error") return false;
    if (result.qualityScore === null) return result.status === "pass";
    return result.qualityScore >= criteria.minQualityScore;
  }

  /** exitTarget 결정 — metadata에 entryState가 있으면 다음 단계, 없으면 CODE_GENERATING */
  private determineExitTarget(metadata: Record<string, unknown> | null): TaskState {
    const entryState = metadata?.entryState as TaskState | undefined;
    const exitMap: Partial<Record<TaskState, TaskState>> = {
      [TaskState.SPEC_DRAFTING]: TaskState.CODE_GENERATING,
      [TaskState.CODE_GENERATING]: TaskState.TEST_RUNNING,
      [TaskState.TEST_RUNNING]: TaskState.SYNC_VERIFYING,
      [TaskState.SYNC_VERIFYING]: TaskState.PR_OPENED,
      [TaskState.PR_OPENED]: TaskState.REVIEW_PENDING,
      [TaskState.REVIEW_PENDING]: TaskState.COMPLETED,
    };
    return (entryState && exitMap[entryState]) ?? TaskState.CODE_GENERATING;
  }

  private errorResult(round: number, agentName: string, error: string, startTime: number): LoopRoundResult {
    return {
      round,
      agentName,
      qualityScore: null,
      feedback: [error],
      status: "error",
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  private async emitLoopEvent(
    taskId: string,
    tenantId: string,
    action: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    const event = createTaskEvent("manual", "info", taskId, tenantId, {
      type: "manual",
      action,
      reason: JSON.stringify(details),
    });
    await this.eventBus.emit(event);
  }
}
