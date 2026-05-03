/**
 * Sprint 58: 사업계획서 초안 자동 생성 서비스 (F180)
 * Sprint 215: F445 — 템플릿 파라미터 지원 추가
 */

import type { AgentRunner } from "../../../core/agent/services/agent-runner.js";
import type { DiscoveryCriterion } from "../../discovery/services/discovery-criteria.js";
import type { AnalysisContext } from "../../discovery/services/analysis-context.js";
import type { BizItem, EvaluationWithScores } from "../../discovery/services/biz-item-service.js";
import type { StartingPointType } from "../../discovery/services/analysis-paths.js";
import {
  mapDataToSections, renderBpMarkdown, getTemplateSections, buildGenerationPrompt,
  type BpDataBundle, type TemplateType, type ToneType, type LengthType,
} from "./business-plan-template.js";

export interface BpGenerationInput {
  bizItemId: string;
  bizItem: BizItem;
  criteria: DiscoveryCriterion[];
  contexts: AnalysisContext[];
  evaluation: EvaluationWithScores | null;
  startingPoint: StartingPointType | null;
  trendReport: BpDataBundle["trendReport"];
  prdContent: string | null;
  skipLlmRefine?: boolean;
  // F445: 템플릿 파라미터
  templateType?: TemplateType;
  tone?: ToneType;
  length?: LengthType;
  // F443: 업로드 문서 파싱 결과 컨텍스트
  documentContext?: string[];
}

export interface BusinessPlanDraft {
  id: string;
  bizItemId: string;
  version: number;
  content: string;
  sectionsSnapshot: string;
  modelUsed: string | null;
  tokensUsed: number;
  generatedAt: string;
}

interface BpRow {
  id: string;
  biz_item_id: string;
  version: number;
  content: string;
  sections_snapshot: string | null;
  model_used: string | null;
  tokens_used: number;
  generated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toBp(row: BpRow): BusinessPlanDraft {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    version: row.version,
    content: row.content,
    sectionsSnapshot: row.sections_snapshot ?? "{}",
    modelUsed: row.model_used,
    tokensUsed: row.tokens_used,
    generatedAt: row.generated_at,
  };
}

export class BusinessPlanGeneratorService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner | null,
  ) {}

  async generate(input: BpGenerationInput): Promise<BusinessPlanDraft> {
    // 1. Template build
    let content = this.buildTemplate(input);

    // 2. LLM refinement
    if (!input.skipLlmRefine && this.runner) {
      content = await this.refineWithLlm(content, input);
    }

    // 3. Next version
    const latestRow = await this.db
      .prepare("SELECT MAX(version) as max_ver FROM business_plan_drafts WHERE biz_item_id = ?")
      .bind(input.bizItemId)
      .first<{ max_ver: number | null }>();
    const nextVersion = (latestRow?.max_ver ?? 0) + 1;

    // 4. Snapshot
    const snapshot = JSON.stringify({
      classification: input.bizItem.classification?.itemType ?? null,
      startingPoint: input.startingPoint,
      evaluationVerdict: input.evaluation?.verdict ?? null,
      criteriaCompleted: input.criteria.filter(c => c.status === "completed").length,
      contextsCount: input.contexts.length,
      hasTrend: !!input.trendReport,
      hasPrd: !!input.prdContent,
    });

    // 5. Save
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO business_plan_drafts (id, biz_item_id, version, content, sections_snapshot, model_used, tokens_used, generated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.bizItemId, nextVersion, content, snapshot, null, 0, now)
      .run();

    return { id, bizItemId: input.bizItemId, version: nextVersion, content, sectionsSnapshot: snapshot, modelUsed: null, tokensUsed: 0, generatedAt: now };
  }

  buildTemplate(input: BpGenerationInput): string {
    const templateType = input.templateType ?? 'internal';
    const tone = input.tone ?? 'formal';
    const length = input.length ?? 'medium';

    const bundle: BpDataBundle = {
      bizItem: input.bizItem,
      classification: input.bizItem.classification,
      evaluation: input.evaluation,
      criteria: input.criteria,
      contexts: input.contexts,
      startingPoint: input.startingPoint,
      trendReport: input.trendReport,
      prdContent: input.prdContent,
    };
    const allSectionContents = mapDataToSections(bundle);

    // 템플릿별 섹션 필터링
    const templateSections = getTemplateSections(templateType);
    const filteredContents = new Map<number, string>();
    for (const sec of templateSections) {
      filteredContents.set(sec.section, allSectionContents.get(sec.section) ?? `*${sec.description}*`);
    }

    // 템플릿 파라미터를 제목에 포함 (LLM 리파인 시 참고용)
    const templateNote = buildGenerationPrompt(templateType, tone, length);
    const titleWithTemplate = `${input.bizItem.title} [${templateNote}]`;

    return renderBpMarkdown(
      { title: titleWithTemplate, description: input.bizItem.description },
      filteredContents,
    );
  }

  async refineWithLlm(draft: string, input: BpGenerationInput): Promise<string> {
    if (!this.runner) return draft;
    try {
      const result = await this.runner.execute({
        taskId: `bp-refine-${Date.now()}`,
        agentId: "bp-generator",
        taskType: "policy-evaluation",
        context: {
          repoUrl: "", branch: "",
          instructions: `당신은 KT DS AX BD팀 사업개발 전문가입니다.
아래는 Discovery 분석 결과를 기반으로 자동 생성된 B2B 사업계획서 초안입니다.
각 섹션을 전문적으로 다듬고, 누락된 내용을 보완해주세요.
기존 evidence를 삭제하지 않고, 보강만 수행하세요.
사업 아이템: ${input.bizItem.title}
시작점: ${input.startingPoint ?? "미분류"}
${input.documentContext && input.documentContext.length > 0
  ? `\n--- 첨부 자료 (참고용) ---\n${input.documentContext.join("\n\n---\n\n")}\n`
  : ""}
--- 사업계획서 초안 ---
${draft}`,
          systemPromptOverride: "당신은 B2B 사업계획서 전문 편집자입니다. KT DS 사업개발팀 문체에 맞게 구조화된 사업계획서를 다듬어주세요.",
        },
        constraints: [],
      });
      if (result.status === "success" && result.output?.analysis) {
        return result.output.analysis;
      }
      return draft;
    } catch { return draft; }
  }

  async getLatest(bizItemId: string): Promise<BusinessPlanDraft | null> {
    const row = await this.db
      .prepare("SELECT * FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId)
      .first<BpRow>();
    return row ? toBp(row) : null;
  }

  async listVersions(bizItemId: string): Promise<Array<{ version: number; generatedAt: string }>> {
    const { results } = await this.db
      .prepare("SELECT version, generated_at FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC")
      .bind(bizItemId)
      .all<{ version: number; generated_at: string }>();
    return results.map(r => ({ version: r.version, generatedAt: r.generated_at }));
  }
}
