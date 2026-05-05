/**
 * F312: ShapingOrchestratorService — 형상화 Phase A~F 자동 순차 실행 오케스트레이터
 *
 * 발굴 완료 → 산출물 수집 → shaping_runs 생성 → Phase A~F 순차 실행
 */
import { ShapingService } from "./shaping-service.js";
import { PipelineStateMachine } from "../../../modules/launch/services/pipeline-state-machine.js";
import type { TriggerShapingInput } from "@foundry-x/shared";
import { linkShapingRunToPipeline } from "../../discovery/types.js";

const SHAPING_PHASES = ["A", "B", "C", "D", "E", "F"] as const;

interface ArtifactBundle {
  bizItemId: string;
  artifacts: Array<{
    skillId: string;
    stageId: string;
    version: number;
    outputText: string;
    createdAt: string;
  }>;
  summary: string;
}

export class ShapingOrchestratorService {
  private shapingService: ShapingService;
  private fsm: PipelineStateMachine;

  constructor(private db: D1Database) {
    this.shapingService = new ShapingService(db);
    this.fsm = new PipelineStateMachine(db);
  }

  /**
   * 발굴 완료 후 형상화 자동 시작
   * 1. 발굴 산출물 수집
   * 2. shaping_runs 생성 (mode=auto)
   * 3. pipeline 상태 shaping_queued → shaping_running
   * 4. Phase A 시작
   */
  async startAutoShaping(
    pipelineRunId: string,
    bizItemId: string,
    orgId: string,
    options: TriggerShapingInput = { mode: "auto", maxIterations: 3 },
  ): Promise<string> {
    // 1. 발굴 산출물 수집
    const artifacts = await this.collectDiscoveryArtifacts(bizItemId);

    // 2. shaping_runs 생성
    const shapingRun = await this.shapingService.createRun(orgId, {
      discoveryPrdId: bizItemId,
      mode: options.mode,
      maxIterations: options.maxIterations ?? 3,
      tokenLimit: 500000,
    });

    if (!shapingRun) {
      throw new Error("Failed to create shaping run");
    }

    // 3. pipeline에 shaping_run_id 연결 + shaping_queued → shaping_running
    await linkShapingRunToPipeline(this.db, pipelineRunId, shapingRun.id);

    await this.fsm.transition(pipelineRunId, "START", { stepId: "phase-A" });

    // 4. Phase A 시작 로그
    await this.shapingService.addPhaseLog(shapingRun.id, {
      phase: "A",
      round: 0,
      inputSnapshot: JSON.stringify({
        artifactCount: artifacts.artifacts.length,
        summary: artifacts.summary,
      }),
    });

    return shapingRun.id;
  }

  /**
   * Phase 진행 — 현재 Phase 완료 → 다음 Phase 시작
   */
  async advancePhase(
    shapingRunId: string,
    pipelineRunId: string,
    currentPhase: string,
    verdict?: string,
    qualityScore?: number,
  ): Promise<{ nextPhase: string | null; completed: boolean }> {
    const phaseIdx = SHAPING_PHASES.indexOf(currentPhase as typeof SHAPING_PHASES[number]);
    if (phaseIdx === -1) {
      throw new Error(`Invalid phase: ${currentPhase}`);
    }

    // 현재 Phase 완료 로그 갱신
    await this.db
      .prepare(
        `UPDATE shaping_phase_logs
         SET verdict = ?, quality_score = ?
         WHERE run_id = ? AND phase = ?`,
      )
      .bind(verdict ?? "PASS", qualityScore ?? null, shapingRunId, currentPhase)
      .run();

    // shaping_runs 현재 Phase 갱신 — ShapingService.updateRun requires (tenantId, runId, params)
    // We read tenant_id from the run
    const runRow = await this.db
      .prepare("SELECT tenant_id FROM shaping_runs WHERE id = ?")
      .bind(shapingRunId)
      .first<{ tenant_id: string }>();
    const tenantId = runRow?.tenant_id ?? "";
    await this.shapingService.updateRun(tenantId, shapingRunId, { currentPhase: currentPhase as "A" | "B" | "C" | "D" | "E" | "F" });

    const isLastPhase = phaseIdx === SHAPING_PHASES.length - 1;

    if (isLastPhase) {
      // Phase F 완료 → 파이프라인 완료
      await this.shapingService.updateRun(tenantId, shapingRunId, { status: "completed" });

      const stepId = currentPhase === "F" ? "phase-F" : `phase-${currentPhase}`;
      await this.fsm.transition(pipelineRunId, "SHAPING_PHASE_COMPLETE", { stepId });

      return { nextPhase: null, completed: true };
    }

    // 다음 Phase
    const nextPhase = SHAPING_PHASES[phaseIdx + 1]!;

    // 파이프라인 이벤트
    await this.fsm.transition(pipelineRunId, "SHAPING_PHASE_COMPLETE", { stepId: `phase-${currentPhase}` });

    // 다음 Phase 로그 생성
    await this.shapingService.addPhaseLog(shapingRunId, {
      phase: nextPhase,
      round: 0,
    });

    // shaping_runs 갱신
    await this.shapingService.updateRun(tenantId, shapingRunId, { currentPhase: nextPhase });

    return { nextPhase, completed: false };
  }

  /**
   * 발굴 산출물 수집 — bd_artifacts에서 해당 biz_item의 산출물 집계
   */
  async collectDiscoveryArtifacts(bizItemId: string): Promise<ArtifactBundle> {
    const rows = await this.db
      .prepare(
        `SELECT skill_id, stage_id, version, output_text, created_at
         FROM bd_artifacts
         WHERE biz_item_id = ? AND status = 'completed'
         ORDER BY stage_id, version DESC`,
      )
      .bind(bizItemId)
      .all<{
        skill_id: string;
        stage_id: string;
        version: number;
        output_text: string | null;
        created_at: string;
      }>();

    const artifacts = (rows.results ?? []).map((r) => ({
      skillId: r.skill_id,
      stageId: r.stage_id,
      version: r.version,
      outputText: r.output_text ?? "",
      createdAt: r.created_at,
    }));

    // 요약 생성 (단계별 최신 산출물 수)
    const stageMap = new Map<string, number>();
    for (const a of artifacts) {
      stageMap.set(a.stageId, (stageMap.get(a.stageId) ?? 0) + 1);
    }
    const summary = Array.from(stageMap.entries())
      .map(([stage, count]) => `${stage}: ${count}건`)
      .join(", ");

    return { bizItemId, artifacts, summary };
  }
}
