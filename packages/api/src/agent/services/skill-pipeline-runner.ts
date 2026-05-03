/**
 * F314: SkillPipelineRunner — 발굴 2-0~2-10 자동 순차 실행 엔진
 *
 * 각 단계의 스킬을 자동 실행하고, HITL 체크포인트에서 정지한다.
 * Workers 30초 제한을 고려하여, 한 호출에 1단계만 실행한다.
 */
import { DiscoveryPipelineService } from "../../core/discovery/services/discovery-pipeline-service.js";
import { PipelineCheckpointService } from "../../modules/launch/services/pipeline-checkpoint-service.js";
import { BdSkillExecutor } from "../../core/shaping/services/bd-skill-executor.js";
import { DiscoveryStageService } from "../../core/discovery/services/discovery-stage-service.js";

export interface StepResult {
  stepId: string;
  status: "completed" | "checkpoint_pending" | "shaping_triggered" | "pipeline_complete" | "failed";
  nextStep: string | null;
  checkpointId?: string;
  shapingRunId?: string;
  autoAdvance: boolean;
  error?: string;
}

/** 발굴 단계 순서 */
const DISCOVERY_STEP_ORDER = [
  "2-0", "2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9", "2-10",
] as const;

export class SkillPipelineRunner {
  private pipelineService: DiscoveryPipelineService;
  private checkpointService: PipelineCheckpointService;
  private stageService: DiscoveryStageService;
  private skillExecutor: BdSkillExecutor | null;

  constructor(private db: D1Database, apiKey?: string) {
    this.pipelineService = new DiscoveryPipelineService(db);
    this.checkpointService = new PipelineCheckpointService(db);
    this.stageService = new DiscoveryStageService(db);
    this.skillExecutor = apiKey ? new BdSkillExecutor(db, apiKey) : null;
  }

  /**
   * 파이프라인의 다음 단계를 실행한다.
   * - 현재 단계의 스킬 실행 → stepComplete 보고
   * - 다음 단계가 체크포인트면 정지 + checkpoint 생성
   * - 아니면 다음 단계를 반환 (클라이언트가 다시 호출)
   */
  async runNextStep(
    pipelineRunId: string,
    orgId: string,
    userId: string,
    skipCheckpoints = false,
  ): Promise<StepResult> {
    // 현재 파이프라인 상태 확인
    const run = await this.pipelineService.getRun(pipelineRunId, orgId);
    if (!run) {
      throw new Error(`Pipeline run not found: ${pipelineRunId}`);
    }

    const currentStep = run.currentStep;
    if (!currentStep) {
      throw new Error("Pipeline has no current step");
    }

    // 현재 단계의 스킬 실행
    const bizItemId = run.bizItemId;
    try {
      await this.executeStepSkills(bizItemId, currentStep, orgId, userId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.pipelineService.reportStepFailed(pipelineRunId, currentStep, "SKILL_ERROR", errorMsg, userId);
      return {
        stepId: currentStep,
        status: "failed",
        nextStep: null,
        autoAdvance: false,
        error: errorMsg,
      };
    }

    // 현재 단계 완료 보고
    const result = await this.pipelineService.reportStepComplete(pipelineRunId, currentStep, undefined, userId);

    // 단계 진행 추적 갱신
    await this.stageService.updateStage(bizItemId, orgId, currentStep as never, "completed").catch(() => {});

    // 2-10 완료 → 형상화 트리거됨
    if (result.shouldTriggerShaping) {
      return {
        stepId: currentStep,
        status: "shaping_triggered",
        nextStep: null,
        autoAdvance: false,
      };
    }

    // 다음 단계 계산
    const nextStep = this.getNextStep(currentStep);
    if (!nextStep) {
      return {
        stepId: currentStep,
        status: "pipeline_complete",
        nextStep: null,
        autoAdvance: false,
      };
    }

    // 다음 단계가 체크포인트인지 확인
    if (!skipCheckpoints && this.checkpointService.isCheckpointStep(nextStep)) {
      const checkpoint = await this.checkpointService.createCheckpoint(pipelineRunId, nextStep);
      return {
        stepId: currentStep,
        status: "checkpoint_pending",
        nextStep,
        checkpointId: checkpoint.id,
        autoAdvance: false,
      };
    }

    // current_step을 다음으로 갱신
    await this.db
      .prepare(
        "UPDATE discovery_pipeline_runs SET current_step = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(nextStep, pipelineRunId)
      .run();

    // 다음 단계 진행 추적 시작
    await this.stageService.updateStage(bizItemId, orgId, nextStep as never, "in_progress").catch(() => {});

    return {
      stepId: currentStep,
      status: "completed",
      nextStep,
      autoAdvance: true,
    };
  }

  /**
   * 해당 단계의 스킬들을 실행한다.
   */
  private async executeStepSkills(
    bizItemId: string,
    stepId: string,
    orgId: string,
    userId: string,
  ): Promise<void> {
    if (!this.skillExecutor) return;

    // 해당 단계에 매핑된 스킬 조회
    const skills = await this.db
      .prepare(
        `SELECT id, name FROM bd_skills WHERE stage_id = ? AND status = 'active' ORDER BY sort_order, name`,
      )
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

  /**
   * 다음 단계 반환
   */
  private getNextStep(currentStep: string): string | null {
    const idx = DISCOVERY_STEP_ORDER.indexOf(currentStep as typeof DISCOVERY_STEP_ORDER[number]);
    if (idx === -1 || idx >= DISCOVERY_STEP_ORDER.length - 1) return null;
    return DISCOVERY_STEP_ORDER[idx + 1]!;
  }
}
