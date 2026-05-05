/**
 * Sprint 53: PRD 자동 생성 서비스 (F185)
 * F570: core/offering/services/prd-generator → services/prd-generator (Sprint 318)
 */

import type { AgentRunner } from "../../agent/types.js";
import type { DiscoveryCriterion, AnalysisContext, StartingPointType } from "../../discovery/types.js";
import { mapCriteriaToSections, renderPrdMarkdown } from "./prd-template.js";

export interface PrdGenerationInput {
  bizItemId: string;
  bizItem: { title: string; description: string | null; source: string };
  criteria: DiscoveryCriterion[];
  contexts: AnalysisContext[];
  startingPoint: StartingPointType;
  skipLlmRefine?: boolean;
}

export interface GeneratedPrd {
  id: string;
  bizItemId: string;
  version: number;
  content: string;
  criteriaSnapshot: string;
  generatedAt: string;
}

interface PrdRow {
  id: string;
  biz_item_id: string;
  version: number;
  content: string;
  criteria_snapshot: string | null;
  generated_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toPrd(row: PrdRow): GeneratedPrd {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    version: row.version,
    content: row.content,
    criteriaSnapshot: row.criteria_snapshot ?? "[]",
    generatedAt: row.generated_at,
  };
}

export class PrdGeneratorService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner,
  ) {}

  async generate(input: PrdGenerationInput): Promise<GeneratedPrd> {
    // Build template
    let content = this.buildTemplate(input);

    // LLM refinement (unless skipped)
    if (!input.skipLlmRefine && this.runner) {
      content = await this.refineWithLlm(content, input);
    }

    // Determine next version
    const latestRow = await this.db
      .prepare("SELECT MAX(version) as max_ver FROM biz_generated_prds WHERE biz_item_id = ?")
      .bind(input.bizItemId)
      .first<{ max_ver: number | null }>();
    const nextVersion = (latestRow?.max_ver ?? 0) + 1;

    // Save to DB
    const id = generateId();
    const now = new Date().toISOString();
    const snapshot = JSON.stringify(
      input.criteria.map((c) => ({
        criterionId: c.criterionId,
        name: c.name,
        status: c.status,
        evidence: c.evidence,
      })),
    );

    await this.db
      .prepare(
        `INSERT INTO biz_generated_prds (id, biz_item_id, version, content, criteria_snapshot, generated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.bizItemId, nextVersion, content, snapshot, now)
      .run();

    return {
      id,
      bizItemId: input.bizItemId,
      version: nextVersion,
      content,
      criteriaSnapshot: snapshot,
      generatedAt: now,
    };
  }

  buildTemplate(input: PrdGenerationInput): string {
    const sectionContents = mapCriteriaToSections(input.criteria, input.contexts);
    return renderPrdMarkdown(input.bizItem, sectionContents);
  }

  async refineWithLlm(draft: string, input: PrdGenerationInput): Promise<string> {
    const MAX_RETRIES = 1;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.runner.execute({
          taskId: `prd-refine-${Date.now()}`,
          agentId: "prd-generator",
          taskType: "policy-evaluation",
          context: {
            repoUrl: "",
            branch: "",
            instructions: `당신은 KT DS AX BD팀 사업개발 전문가입니다.
아래는 Discovery 분석 결과를 기반으로 자동 생성된 PRD 초안입니다.
각 섹션을 전문적으로 다듬고, 누락된 내용을 보완해주세요.
기존 evidence를 삭제하지 않고, 보강만 수행하세요.

사업 아이템: ${input.bizItem.title}
시작점: ${input.startingPoint}

--- PRD 초안 ---
${draft}`,
            systemPromptOverride: "당신은 사업개발 PRD 전문 편집자입니다. 구조화된 PRD를 전문적으로 다듬어주세요.",
          },
          constraints: [],
        });

        if (result.status === "success" && result.output?.analysis) {
          return result.output.analysis;
        }
        const errMsg = result.output?.analysis ?? "";
        const isTimeout = errMsg.includes("timed out") || errMsg.includes("timeout");
        if (isTimeout && attempt < MAX_RETRIES) {
          console.warn(`[prd-generator] LLM timeout (attempt ${attempt + 1}), retrying...`);
          continue;
        }
        return draft;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        const isTimeout = errMsg.includes("timed out") || errMsg.includes("timeout") || errMsg.includes("aborted");
        if (isTimeout && attempt < MAX_RETRIES) {
          console.warn(`[prd-generator] LLM threw timeout (attempt ${attempt + 1}), retrying...`);
          continue;
        }
        return draft;
      }
    }
    return draft;
  }

  async getLatest(bizItemId: string): Promise<GeneratedPrd | null> {
    const row = await this.db
      .prepare("SELECT * FROM biz_generated_prds WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId)
      .first<PrdRow>();

    return row ? toPrd(row) : null;
  }

  async getByVersion(bizItemId: string, version: number): Promise<GeneratedPrd | null> {
    const row = await this.db
      .prepare("SELECT * FROM biz_generated_prds WHERE biz_item_id = ? AND version = ?")
      .bind(bizItemId, version)
      .first<PrdRow>();

    return row ? toPrd(row) : null;
  }

  async listVersions(bizItemId: string): Promise<Array<{ version: number; generatedAt: string }>> {
    const { results } = await this.db
      .prepare("SELECT version, generated_at FROM biz_generated_prds WHERE biz_item_id = ? ORDER BY version DESC")
      .bind(bizItemId)
      .all<{ version: number; generated_at: string }>();

    return results.map((r) => ({ version: r.version, generatedAt: r.generated_at }));
  }
}
