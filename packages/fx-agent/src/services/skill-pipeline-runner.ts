/**
 * F580: SkillPipelineRunner — DI 패턴 (fx-agent canonical)
 *
 * F314의 concrete 구현과 달리, 이 버전은 interface injection을 사용하여
 * packages/api 도메인 서비스에 직접 의존하지 않는다.
 * packages/api 측은 services/skill-pipeline-runner.ts (concrete)를 사용한다.
 */
import type {
  IDiscoveryPipelineService,
  IPipelineCheckpointService,
  IDiscoveryStageService,
  IBdSkillExecutor,
} from "@foundry-x/shared";

export interface StepResult {
  stepId: string;
  status: "completed" | "checkpoint_pending" | "shaping_triggered" | "pipeline_complete" | "failed";
  nextStep: string | null;
  checkpointId?: string;
  shapingRunId?: string;
  autoAdvance: boolean;
  error?: string;
}

const DISCOVERY_STEP_ORDER = [
  "2-0", "2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9", "2-10",
] as const;

export class SkillPipelineRunner {
  constructor(
    private db: D1Database,
    private pipelineService: IDiscoveryPipelineService,
    private checkpointService: IPipelineCheckpointService,
    private stageService: IDiscoveryStageService,
    private skillExecutor: IBdSkillExecutor | null = null,
  ) {}

  async runNextStep(
    pipelineRunId: string,
    orgId: string,
    userId: string,
    skipCheckpoints = false,
  ): Promise<StepResult> {
    const run = await this.pipelineService.getRun(pipelineRunId, orgId);
    if (!run) throw new Error(`Pipeline run not found: ${pipelineRunId}`);

    const currentStep = run.currentStep;
    if (!currentStep) throw new Error("Pipeline has no current step");

    const bizItemId = run.bizItemId;
    try {
      await this.executeStepSkills(bizItemId, currentStep, orgId, userId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.pipelineService.reportStepFailed(pipelineRunId, currentStep, "SKILL_ERROR", errorMsg, userId);
      return { stepId: currentStep, status: "failed", nextStep: null, autoAdvance: false, error: errorMsg };
    }

    const result = await this.pipelineService.reportStepComplete(pipelineRunId, currentStep, undefined, userId);
    await this.stageService.updateStage(bizItemId, orgId, currentStep as never, "completed").catch(() => {});

    if (result.shouldTriggerShaping) {
      return { stepId: currentStep, status: "shaping_triggered", nextStep: null, autoAdvance: false };
    }

    const nextStep = this.getNextStep(currentStep);
    if (!nextStep) {
      return { stepId: currentStep, status: "pipeline_complete", nextStep: null, autoAdvance: false };
    }

    if (!skipCheckpoints && this.checkpointService.isCheckpointStep(nextStep)) {
      const checkpoint = await this.checkpointService.createCheckpoint(pipelineRunId, nextStep);
      return { stepId: currentStep, status: "checkpoint_pending", nextStep, checkpointId: checkpoint.id, autoAdvance: false };
    }

    await this.db
      .prepare("UPDATE discovery_pipeline_runs SET current_step = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(nextStep, pipelineRunId)
      .run();

    await this.stageService.updateStage(bizItemId, orgId, nextStep as never, "in_progress").catch(() => {});
    return { stepId: currentStep, status: "completed", nextStep, autoAdvance: true };
  }

  private async executeStepSkills(
    bizItemId: string,
    stepId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    if (!this.skillExecutor) return;
    const skills = await this.db
      .prepare(`SELECT id, name FROM bd_skills WHERE stage_id = ? AND status = 'active' ORDER BY sort_order, name`)
      .bind(stepId)
      .all<{ id: string; name: string }>();
    for (const skill of skills.results ?? []) {
      await this.skillExecutor.execute(orgId, userId, skill.id, {
        bizItemId,
        stageId: stepId,
        inputText: `자동 파이프라인 실행: ${skill.name} (단계 ${stepId})`,
      });
    }
  }

  private getNextStep(currentStep: string): string | null {
    const idx = DISCOVERY_STEP_ORDER.indexOf(currentStep as typeof DISCOVERY_STEP_ORDER[number]);
    if (idx === -1 || idx >= DISCOVERY_STEP_ORDER.length - 1) return null;
    return DISCOVERY_STEP_ORDER[idx + 1]!;
  }
}
