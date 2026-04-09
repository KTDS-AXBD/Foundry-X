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
      taskType: "spec-analysis",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
      },
      constraints: [],
    };
    const aiResult = await this.runner.execute(request);

    const analysisResult: StageAnalysisResult = this.parseResult(aiResult.output.analysis ?? "");

    // F485: bd_artifacts에 결과 저장
    const versionRow = await this.db.prepare(
      "SELECT MAX(version) as max_ver FROM bd_artifacts WHERE biz_item_id = ? AND skill_id = ?",
    ).bind(bizItemId, `discovery-${stage}`).first<{ max_ver: number | null }>();
    const nextVersion = (versionRow?.max_ver ?? 0) + 1;

    const artifactId = crypto.randomUUID().replace(/-/g, "");
    await this.db.prepare(
      `INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'claude-haiku-4-5-20250714', 'completed', 'system', datetime('now'))`,
    ).bind(artifactId, orgId, bizItemId, `discovery-${stage}`, stage, nextVersion, prompt, JSON.stringify(analysisResult)).run();

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
  ): Promise<StageConfirmResult> {
    const stageSvc = new DiscoveryStageService(this.db);

    // stage 완료 처리
    await stageSvc.updateStage(bizItemId, orgId, stage as never, "completed");

    // ax_viability_checkpoints: stage CHECK 2-1~2-7만 허용, decision CHECK go/pivot/drop
    const VIABILITY_STAGES = new Set(["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"]);
    if (VIABILITY_STAGES.has(stage)) {
      const viabilityQuestion: string = stage in VIABILITY_QUESTIONS
        ? (VIABILITY_QUESTIONS[stage as Stage] ?? "")
        : "";
      const cpId = crypto.randomUUID().replace(/-/g, "");
      const now = new Date().toISOString();
      const dbDecision = viabilityAnswer === "stop" ? "drop" : viabilityAnswer;
      await this.db.prepare(
        `INSERT OR REPLACE INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, reason, decided_by, decided_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'system', ?)`,
      ).bind(cpId, bizItemId, orgId, stage, dbDecision, viabilityQuestion, feedback ?? null, now).run();
    }

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
    }

    // stop이면 다음 단계 없음
    if (viabilityAnswer === "stop") {
      return { ok: true, nextStage: null };
    }

    // 다음 단계 결정
    const idx = STAGE_ORDER.indexOf(stage);
    const nextStage = idx >= 0 && idx < STAGE_ORDER.length - 1 ? (STAGE_ORDER[idx + 1] ?? null) : null;

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

    if (!artifact?.output_text) return null;

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
      result = { summary: "분석 결과", details: artifact.output_text, confidence: 70 };
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
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 70,
        };
      }
    } catch {
      // JSON 파싱 실패 시 fallback
    }
    return {
      summary: "분석이 완료되었습니다.",
      details: output,
      confidence: 70,
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
