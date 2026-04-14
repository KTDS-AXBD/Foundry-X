/**
 * Sprint 234: F480 Discovery Stage Runner Service
 * Sprint 238: F485 결과 저장 + F486 criteria 자동 갱신
 * 2-1~2-8, 2-10 단계별 AI 분석 실행 + HITL 확인 로직
 */
import type { AgentRunner } from "../../agent/services/agent-runner.js";
import type { AgentExecutionRequest } from "../../agent/services/execution-types.js";
import type { DiscoveryType, Intensity, Stage } from "./analysis-path-v82.js";
import { ANALYSIS_PATH_MAP, STAGE_NAMES, VIABILITY_QUESTIONS, COMMIT_GATE_QUESTIONS } from "./analysis-path-v82.js";
import { DiscoveryStageService } from "./discovery-stage-service.js";
import { DiscoveryCriteriaService } from "./discovery-criteria.js";
import type { DiscoveryGraphService } from "./discovery-graph-service.js";
import type { DiagnosticCollector } from "../../agent/services/diagnostic-collector.js";

/** F531: confirmStage graphMode 옵션 */
export interface ConfirmStageOptions {
  /** true이면 다음 단계를 GraphEngine으로 실행 */
  graphMode?: boolean;
  runner?: AgentRunner;
  sessionId?: string;
  apiKey?: string;
}

export interface StageRunResult {
  stage: string;
  stageName: string;
  intensity: Intensity;
  result: StageAnalysisResult;
  viabilityQuestion: string | null;
  commitGateQuestions: string[] | null;
}

export interface StageAnalysisResult {
  summary: string;
  details: string;
  confidence: number;
}

export interface StageConfirmResult {
  ok: boolean;
  nextStage: string | null;
}

const STAGE_ORDER = ["2-0", "2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9", "2-10"];

/** confidence 기본값 — AI 실패 시 또는 파싱 fallback */
const CONFIDENCE_FALLBACK = 70;
const CONFIDENCE_ON_ERROR = 50;

// F486: 단계 완료 시 자동 갱신할 criteria 매핑
const STAGE_CRITERIA_MAP: Record<string, number[]> = {
  "2-1": [1],     // 레퍼런스 분석 → 문제/고객 정의
  "2-2": [2],     // 수요/시장 검증 → 시장 기회
  "2-3": [3, 8],  // 경쟁 환경 → 경쟁 환경 + 차별화 근거
  "2-4": [4],     // 아이템 도출 → 가치 제안 가설
  "2-5": [5],     // 핵심 선정 → 수익 구조 가설
  "2-6": [6],     // 타겟 고객 → 핵심 리스크 가정
  "2-7": [7],     // 비즈니스 모델 → 규제/기술 제약
  "2-8": [9],     // 패키징 → 검증 실험 계획
};

export interface StageResultResponse {
  stage: string;
  stageName: string;
  intensity: string;
  result: StageAnalysisResult;
  viabilityDecision: string | null;
  feedback: string | null;
  completedAt: string | null;
  artifactId: string | null;
}

/**
 * Discovery 단계 분석 전용 시스템 프롬프트.
 * AI가 반드시 {summary, details, confidence} 스키마로 응답하도록 강제.
 * "analysis" 필드 언급 없음 — runner가 custom 스키마 그대로 전달받아야 함.
 */
const DISCOVERY_STAGE_SYSTEM_PROMPT = `당신은 AX BD팀의 사업 발굴 분석 에이전트입니다.
모든 응답은 반드시 다음 JSON 스키마로 출력하세요:
{
  "summary": "1~2문장 핵심 요약 (한국어)",
  "details": "마크다운 형식 상세 분석 (한국어)",
  "confidence": 0~100 사이 정수
}
다른 필드를 추가하지 마세요. 반드시 위 3개 필드만 포함된 유효한 JSON을 반환하세요.`;

const STAGE_PROMPTS: Record<string, string> = {
  "2-1": "이 사업 아이템에 대한 레퍼런스를 분석해주세요. 유사 사례, 기존 서비스, 해외 사례를 조사하고, 차별화 가능 영역을 도출해주세요.",
  "2-2": "이 사업 아이템의 수요와 시장을 검증해주세요. 시장 규모(TAM/SAM/SOM), 성장률, 주요 수요처, 타이밍 적절성을 분석해주세요.",
  "2-3": "이 사업 아이템의 경쟁 환경과 자사 역량을 분석해주세요. 주요 경쟁사, 진입 장벽, 자사 강점/약점, 포지셔닝 기회를 도출해주세요.",
  "2-4": "지금까지의 분석을 종합하여 구체적인 사업 아이템을 도출해주세요. 핵심 가치 제안, 타겟 세그먼트, 수익 모델 후보를 제시해주세요.",
  "2-5": "도출된 아이템 중 핵심 아이템을 선정해주세요. 전략적 적합성, 실현 가능성, 시장 잠재력을 기준으로 우선순위를 매겨주세요.",
  "2-6": "선정된 핵심 아이템의 타겟 고객을 정의해주세요. 고객 세그먼트, 페르소나, 고객 니즈, 구매 여정을 분석해주세요.",
  "2-7": "비즈니스 모델을 정의해주세요. 수익 구조, 비용 구조, 핵심 파트너, 채널 전략을 Business Model Canvas 형식으로 작성해주세요.",
  "2-8": "발굴 결과를 패키징해주세요. 핵심 발견, 추천 사항, 리스크, 다음 단계를 종합 정리해주세요.",
  "2-10": "전체 발굴 과정의 최종 보고서를 작성해주세요. 각 단계별 핵심 결과와 최종 권고사항을 정리해주세요.",
};

export class StageRunnerService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner,
    private diagnostics?: DiagnosticCollector,  // F534: 메트릭 훅 (optional — 기존 호출 호환)
  ) {}

  async runStage(
    bizItemId: string,
    orgId: string,
    stage: string,
    discoveryType: DiscoveryType | null,
    feedback?: string,
  ): Promise<StageRunResult> {
    const stageSvc = new DiscoveryStageService(this.db);
    const isV82Stage = stage in ANALYSIS_PATH_MAP;

    // intensity 결정
    const intensity: Intensity = isV82Stage && discoveryType
      ? ANALYSIS_PATH_MAP[stage as Stage][discoveryType]
      : "normal";

    // Race condition 방어: 이미 in_progress인 단계는 중복 실행 차단
    const currentStatus = await this.db.prepare(
      "SELECT status FROM biz_item_discovery_stages WHERE biz_item_id = ? AND stage = ?",
    ).bind(bizItemId, stage).first<{ status: string }>();

    if (currentStatus?.status === "in_progress") {
      throw new Error("STAGE_ALREADY_RUNNING");
    }

    // stage 상태를 in_progress로
    await stageSvc.updateStage(bizItemId, orgId, stage as never, "in_progress");

    // biz_item 정보 조회
    const item = await this.db.prepare(
      "SELECT title, description, source FROM biz_items WHERE id = ? AND org_id = ?",
    ).bind(bizItemId, orgId).first<{ title: string; description: string | null; source: string | null }>();

    if (!item) throw new Error("BIZ_ITEM_NOT_FOUND");

    // AI 분석 실행
    const prompt = this.buildPrompt(stage, item, intensity, feedback);
    const request: AgentExecutionRequest = {
      taskId: `stage-${stage}-${bizItemId}`,
      agentId: "discovery-stage-runner",
      taskType: "discovery-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: DISCOVERY_STAGE_SYSTEM_PROMPT,
      },
      constraints: [],
    };
    let analysisResult: StageAnalysisResult = {
      summary: "AI 분석 일시 실패 — 수동 편집으로 결과를 작성해 주세요.",
      details: "분석이 실행되지 않았어요. 다시 시도해 주세요.",
      confidence: CONFIDENCE_ON_ERROR,
    };
    const MAX_RETRIES = 1;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const execStart = Date.now();
        const aiResult = await this.runner.execute(request);
        const execDuration = Date.now() - execStart;
        // F534: 비스트리밍 실행 경로 메트릭 기록
        if (this.diagnostics) {
          await this.diagnostics.record(request.taskId, "discovery-stage-runner", aiResult, execDuration);
        }
        if (aiResult.status === "failed") {
          const errMsg = aiResult.output?.analysis ?? "AI runner failed";
          const isTimeout = errMsg.includes("timed out") || errMsg.includes("timeout");
          if (isTimeout && attempt < MAX_RETRIES) {
            console.warn(`[stage-runner] ${stage} timeout (attempt ${attempt + 1}), retrying...`);
            continue;
          }
          console.error(`[stage-runner] ${stage} failed:`, errMsg);
          analysisResult = {
            summary: "AI 분석 일시 실패 — 수동 편집으로 결과를 작성해 주세요.",
            details: `자동 분석이 실패했어요.\n\n사유: ${errMsg}\n\n오른쪽 편집 버튼으로 직접 작성하거나 잠시 후 다시 시도해 주세요.`,
            confidence: CONFIDENCE_ON_ERROR,
          };
        } else {
          analysisResult = this.parseResult(aiResult.output?.analysis ?? "");
        }
        break;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        const isTimeout = errMsg.includes("timed out") || errMsg.includes("timeout") || errMsg.includes("aborted");
        if (isTimeout && attempt < MAX_RETRIES) {
          console.warn(`[stage-runner] ${stage} threw timeout (attempt ${attempt + 1}), retrying...`);
          continue;
        }
        console.error(`[stage-runner] ${stage} threw:`, errMsg);
        analysisResult = {
          summary: "AI 분석 일시 실패 — 수동 편집으로 결과를 작성해 주세요.",
          details: `자동 분석 호출 중 오류가 발생했어요.\n\n사유: ${errMsg}\n\n오른쪽 편집 버튼으로 직접 작성하거나 잠시 후 다시 시도해 주세요.`,
          confidence: CONFIDENCE_ON_ERROR,
        };
        break;
      }
    }

    // F485: bd_artifacts에 결과 저장
    const versionRow = await this.db.prepare(
      "SELECT MAX(version) as max_ver FROM bd_artifacts WHERE biz_item_id = ? AND skill_id = ?",
    ).bind(bizItemId, `discovery-${stage}`).first<{ max_ver: number | null }>();
    const nextVersion = (versionRow?.max_ver ?? 0) + 1;

    const artifactId = crypto.randomUUID().replace(/-/g, "");
    try {
      await this.db.prepare(
        `INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, status, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'claude-haiku-4-5-20250714', 'completed', 'system', datetime('now'))`,
      ).bind(artifactId, orgId, bizItemId, `discovery-${stage}`, stage, nextVersion, prompt, JSON.stringify(analysisResult)).run();
    } catch (e) {
      console.error(`[stage-runner] bd_artifacts INSERT failed:`, e instanceof Error ? e.message : String(e));
      // 결과는 반환하되 DB 저장 실패는 로그만 — 사용자가 편집/재시도 가능
    }

    // stage 상태를 completed로 복귀 (in_progress lock 해제)
    // — 재실행 시나리오 지원: 피드백 기반 재분석이 가능해야 함
    // — in_progress stuck 방지: race condition 가드가 영구 잠금이 되지 않도록
    await stageSvc.updateStage(bizItemId, orgId, stage as never, "completed");

    // viability question
    const viabilityQuestion = isV82Stage ? VIABILITY_QUESTIONS[stage as Stage] : null;
    const commitGateQuestions = stage === "2-5" ? [...COMMIT_GATE_QUESTIONS] : null;
    const stageName = STAGE_NAMES[stage as Stage] ?? this.getStageName(stage);

    return {
      stage,
      stageName,
      intensity,
      result: analysisResult,
      viabilityQuestion,
      commitGateQuestions,
    };
  }

  async confirmStage(
    bizItemId: string,
    orgId: string,
    stage: string,
    viabilityAnswer: "go" | "pivot" | "stop",
    feedback?: string,
    options?: ConfirmStageOptions,
  ): Promise<StageConfirmResult> {
    // D1 batch로 stage 완료 + viability checkpoint를 원자적으로 처리
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const isoNow = new Date().toISOString();

    const VIABILITY_STAGES = new Set(["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"]);
    const batchStmts: D1PreparedStatement[] = [];

    // 1) stage 완료 처리
    batchStmts.push(
      this.db.prepare(
        `UPDATE biz_item_discovery_stages
         SET status = 'completed', completed_at = ?, updated_at = datetime('now')
         WHERE biz_item_id = ? AND stage = ?`,
      ).bind(now, bizItemId, stage),
    );

    // 2) viability checkpoint (2-1~2-7만)
    if (VIABILITY_STAGES.has(stage)) {
      const viabilityQuestion: string = stage in VIABILITY_QUESTIONS
        ? (VIABILITY_QUESTIONS[stage as Stage] ?? "")
        : "";
      const cpId = crypto.randomUUID().replace(/-/g, "");
      const dbDecision = viabilityAnswer === "stop" ? "drop" : viabilityAnswer;
      batchStmts.push(
        this.db.prepare(
          `INSERT OR REPLACE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'system', ?)`,
        ).bind(cpId, bizItemId, orgId, stage, dbDecision, viabilityQuestion, feedback ?? null, isoNow),
      );
    }

    // batch 실행 — 원자적 커밋
    await this.db.batch(batchStmts);

    // F486: criteria 자동 갱신 (stop이 아닌 경우)
    if (viabilityAnswer !== "stop") {
      const criteriaIds = STAGE_CRITERIA_MAP[stage] ?? [];
      if (criteriaIds.length > 0) {
        const criteriaSvc = new DiscoveryCriteriaService(this.db);
        for (const criterionId of criteriaIds) {
          await criteriaSvc.update(bizItemId, criterionId, {
            status: "completed",
            evidence: `${stage} 단계 분석 완료 (${viabilityAnswer})`,
          });
        }
      }

      // F494: 9/9 criteria 완료 시 pipeline_stages DISCOVERY→FORMALIZATION 자동 전진
      // - gateStatus==='ready' 조건과 동치 (≥9)
      // - DISCOVERY 단계가 열려있는 경우에만 전진 (멱등성)
      // - 테이블 미존재 시 무시 (테스트 환경 대비)
      try {
        const criteriaSvc = new DiscoveryCriteriaService(this.db);
        const progress = await criteriaSvc.getAll(bizItemId);
        if (progress.gateStatus === "ready") {
          const discoveryRow = await this.db.prepare(
            `SELECT id FROM pipeline_stages WHERE biz_item_id = ? AND stage = 'DISCOVERY' AND exited_at IS NULL LIMIT 1`,
          ).bind(bizItemId).first<{ id: string }>();
          if (discoveryRow) {
            const now = new Date().toISOString();
            await this.db.prepare(
              `UPDATE pipeline_stages SET exited_at = ? WHERE id = ?`,
            ).bind(now, discoveryRow.id).run();
            const formalizationId = crypto.randomUUID().replace(/-/g, "");
            await this.db.prepare(
              `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, entered_by) VALUES (?, ?, ?, 'FORMALIZATION', ?, 'system')`,
            ).bind(formalizationId, bizItemId, orgId, now).run();
          }
        }
      } catch {
        // pipeline_stages 미존재 시 무시
      }
    }

    // stop이면 다음 단계 없음
    if (viabilityAnswer === "stop") {
      return { ok: true, nextStage: null };
    }

    // 다음 단계 결정
    const idx = STAGE_ORDER.indexOf(stage);
    const nextStage = idx >= 0 && idx < STAGE_ORDER.length - 1 ? (STAGE_ORDER[idx + 1] ?? null) : null;

    // F531: graphMode=true이면 다음 단계를 GraphEngine으로 실행
    if (options?.graphMode && nextStage && options.runner && options.sessionId && options.apiKey) {
      const { DiscoveryGraphService } = await import("./discovery-graph-service.js");
      const graphSvc: DiscoveryGraphService = new DiscoveryGraphService(
        options.runner,
        this.db,
        options.sessionId,
        options.apiKey,
      );
      await graphSvc.runFrom(nextStage, { bizItemId, orgId });
    }

    return { ok: true, nextStage };
  }

  async getStageResult(
    bizItemId: string,
    orgId: string,
    stage: string,
  ): Promise<StageResultResponse | null> {
    // bd_artifacts에서 최신 결과 조회
    const artifact = await this.db.prepare(
      `SELECT id, output_text, stage_id, created_at FROM bd_artifacts
       WHERE biz_item_id = ? AND org_id = ? AND skill_id = ? AND status = 'completed'
       ORDER BY version DESC LIMIT 1`,
    ).bind(bizItemId, orgId, `discovery-${stage}`).first<{
      id: string; output_text: string | null; stage_id: string; created_at: string;
    }>();

    if (!artifact?.output_text) {
      // Fallback: 2-1 단계는 biz_item_classifications에서 합성
      // (legacy classify 경로는 bd_artifacts를 만들지 않음)
      if (stage === "2-1") {
        const cls = await this.db.prepare(
          `SELECT item_type, confidence, turn_1_answer, turn_2_answer, turn_3_answer, classified_at
           FROM biz_item_classifications WHERE biz_item_id = ?`,
        ).bind(bizItemId).first<{
          item_type: string; confidence: number;
          turn_1_answer: string | null; turn_2_answer: string | null; turn_3_answer: string | null;
          classified_at: string;
        }>();
        if (cls) {
          const item = await this.db.prepare(
            "SELECT discovery_type FROM biz_items WHERE id = ? AND org_id = ?",
          ).bind(bizItemId, orgId).first<{ discovery_type: string | null }>();
          const intensity: Intensity = item?.discovery_type
            ? ANALYSIS_PATH_MAP["2-1" as Stage][item.discovery_type as DiscoveryType]
            : "normal";
          return {
            stage,
            stageName: STAGE_NAMES["2-1" as Stage] ?? this.getStageName(stage),
            intensity,
            result: {
              summary: `아이템 유형: ${cls.item_type} (신뢰도 ${Math.round(cls.confidence * 100)}%)`,
              details: [cls.turn_1_answer, cls.turn_2_answer, cls.turn_3_answer]
                .filter(Boolean).join("\n\n") || "분류 분석 결과",
              confidence: Math.round(cls.confidence * 100),
            },
            viabilityDecision: null,
            feedback: null,
            completedAt: cls.classified_at,
            artifactId: `legacy-classify-${bizItemId}`,
          };
        }
      }
      return null;
    }

    // ax_viability_checkpoints에서 decision 조회
    const checkpoint = await this.db.prepare(
      `SELECT decision, reason FROM ax_viability_checkpoints
       WHERE biz_item_id = ? AND org_id = ? AND stage = ?
       ORDER BY decided_at DESC LIMIT 1`,
    ).bind(bizItemId, orgId, stage).first<{ decision: string | null; reason: string | null }>();

    // biz_item에서 discoveryType 조회하여 intensity 결정
    const item = await this.db.prepare(
      "SELECT discovery_type FROM biz_items WHERE id = ? AND org_id = ?",
    ).bind(bizItemId, orgId).first<{ discovery_type: string | null }>();

    const isV82Stage = stage in ANALYSIS_PATH_MAP;
    const intensity: Intensity = isV82Stage && item?.discovery_type
      ? ANALYSIS_PATH_MAP[stage as Stage][item.discovery_type as DiscoveryType]
      : "normal";

    let result: StageAnalysisResult;
    try {
      result = JSON.parse(artifact.output_text);
    } catch {
      result = { summary: "분석 결과", details: artifact.output_text, confidence: CONFIDENCE_FALLBACK };
    }

    const stageName = STAGE_NAMES[stage as Stage] ?? this.getStageName(stage);

    return {
      stage,
      stageName,
      intensity,
      result,
      viabilityDecision: checkpoint?.decision ?? null,
      feedback: checkpoint?.reason ?? null,
      completedAt: artifact.created_at,
      artifactId: artifact.id,
    };
  }

  /**
   * 단계 결과 수동 편집 — 사용자가 AI 결과를 직접 수정.
   * bd_artifacts 최신 행의 output_text를 갱신한다 (새 버전 생성하지 않음).
   * 향후 감사 로그가 필요하면 별도 history 테이블 추가.
   */
  async updateStageResult(
    bizItemId: string,
    orgId: string,
    stage: string,
    patch: { summary?: string; details?: string; confidence?: number },
  ): Promise<StageResultResponse | null> {
    const current = await this.getStageResult(bizItemId, orgId, stage);
    if (!current) return null;

    const next: StageAnalysisResult = {
      summary: patch.summary ?? current.result.summary,
      details: patch.details ?? current.result.details,
      confidence:
        typeof patch.confidence === "number"
          ? Math.max(0, Math.min(100, patch.confidence))
          : current.result.confidence,
    };

    // legacy classify fallback의 경우 bd_artifacts 행을 새로 생성
    if (current.artifactId?.startsWith("legacy-classify-") || !current.artifactId) {
      const newId = crypto.randomUUID();
      await this.db
        .prepare(
          `INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, status, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'manual-edit', 'completed', 'user', datetime('now'))`,
        )
        .bind(
          newId,
          orgId,
          bizItemId,
          `discovery-${stage}`,
          stage,
          "manual edit (legacy)",
          JSON.stringify(next),
        )
        .run();
      return { ...current, result: next, artifactId: newId };
    }

    await this.db
      .prepare(`UPDATE bd_artifacts SET output_text = ? WHERE id = ?`)
      .bind(JSON.stringify(next), current.artifactId)
      .run();

    return { ...current, result: next };
  }

  private buildPrompt(
    stage: string,
    item: { title: string; description: string | null; source: string | null },
    intensity: Intensity,
    feedback?: string,
  ): string {
    const basePrompt = STAGE_PROMPTS[stage] ?? `${stage} 단계 분석을 수행해주세요.`;
    const intensityGuide = intensity === "core"
      ? "심층 분석을 수행하세요. 가능한 한 상세하게 분석해주세요."
      : intensity === "light"
        ? "간략한 분석을 수행하세요. 핵심 포인트만 짚어주세요."
        : "적절한 수준의 분석을 수행하세요.";

    let prompt = `## 사업 아이템\n- 제목: ${item.title}\n`;
    if (item.description) prompt += `- 설명: ${item.description}\n`;
    if (item.source) prompt += `- 출처: ${item.source}\n`;
    prompt += `\n## 분석 지시\n${basePrompt}\n\n## 분석 강도\n${intensityGuide}\n`;
    if (feedback) prompt += `\n## 이전 단계 피드백\n${feedback}\n`;
    prompt += `\n## 응답 형식\nJSON으로 응답해주세요: { "summary": "1~2문장 요약", "details": "마크다운 상세 분석", "confidence": 0~100 }`;

    return prompt;
  }

  private parseResult(output: string): StageAnalysisResult {
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary ?? "분석이 완료되었습니다.",
          details: parsed.details ?? output,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : CONFIDENCE_FALLBACK,
        };
      }
    } catch {
      // JSON 파싱 실패 시 fallback
    }
    return {
      summary: "분석이 완료되었습니다.",
      details: output,
      confidence: CONFIDENCE_FALLBACK,
    };
  }

  private getStageName(stage: string): string {
    const names: Record<string, string> = {
      "2-0": "사업 아이템 분류",
      "2-8": "패키징",
      "2-9": "AI 멀티페르소나 평가",
      "2-10": "최종 보고서",
    };
    return names[stage] ?? stage;
  }
}
