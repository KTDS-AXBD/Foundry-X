/**
 * Sprint 220 F454: 사업기획서(HTML) 기반 1차 PRD 생성 서비스
 */

import type { AgentRunner } from "../../../core/agent/services/agent-runner.js";
import type { ParsedBusinessPlan, BpSectionKey } from "./bp-html-parser.js";

export interface BpPrdInput {
  bizItemId: string;
  bizItem: { title: string; description: string | null };
  parsedBp: ParsedBusinessPlan;
  bpDraftId: string;
  skipLlmRefine?: boolean;
}

export interface GeneratedPrdFromBp {
  id: string;
  bizItemId: string;
  version: number;
  content: string;
  sourceType: "business_plan";
  bpDraftId: string;
  generatedAt: string;
}

interface PrdRow {
  id: string;
  biz_item_id: string;
  version: number;
  content: string;
  source_type: string;
  bp_draft_id: string | null;
  generated_at: string;
}

const SECTION_ORDER: Array<{ key: BpSectionKey; title: string }> = [
  { key: "purpose",    title: "1. 프로젝트 개요" },
  { key: "target",     title: "2. 타깃 고객" },
  { key: "market",     title: "3. 시장 분석" },
  { key: "technology", title: "4. 기술 요건" },
  { key: "scope",      title: "5. 기능 범위" },
  { key: "timeline",   title: "6. 일정 및 마일스톤" },
  { key: "risk",       title: "7. 리스크 및 제약" },
];

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildPrdTemplate(input: BpPrdInput): string {
  const { bizItem, parsedBp } = input;
  const sectionMap = new Map(parsedBp.sections.map((s) => [s.sectionKey, s.content]));

  const lines: string[] = [];
  lines.push(`# PRD: ${bizItem.title}`);
  lines.push("");
  if (bizItem.description) {
    lines.push(`> ${bizItem.description}`);
    lines.push("");
  }
  lines.push(`> 원본: ${parsedBp.title}`);
  lines.push(`> 생성일: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`> 출처: 사업기획서 자동 변환`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const { key, title } of SECTION_ORDER) {
    lines.push(`## ${title}`);
    lines.push("");
    const content = sectionMap.get(key);
    if (content) {
      lines.push(content);
    } else {
      lines.push("*사업기획서에서 해당 섹션을 찾지 못했어요 — 인터뷰에서 보강이 필요해요.*");
    }
    lines.push("");
  }

  lines.push("## 8. 성공 지표");
  lines.push("");
  lines.push("*사업기획서에서 추출된 성공 지표가 없어요 — 인터뷰 보강 또는 LLM 도출 결과로 채워질 예정이에요.*");
  lines.push("");

  return lines.join("\n");
}

async function refineWithLlm(draft: string, input: BpPrdInput, runner: AgentRunner): Promise<string> {
  try {
    const result = await runner.execute({
      taskId: `bp-prd-refine-${Date.now()}`,
      agentId: "prd-generator",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `당신은 KT DS AX BD팀 사업개발 전문가입니다.
아래는 사업기획서를 기반으로 자동 변환된 PRD 초안입니다.
각 섹션을 전문적으로 다듬고, 누락된 내용을 보완하세요.
기존 내용을 삭제하지 않고, 보강만 수행하세요.

사업 아이템: ${input.bizItem.title}
원본 사업기획서: ${input.parsedBp.title}

--- PRD 초안 ---
${draft}`,
        systemPromptOverride: "당신은 사업개발 PRD 전문 편집자입니다. 구조화된 PRD를 전문적으로 다듬어주세요.",
      },
      constraints: [],
    });

    if (result.status === "success" && result.output?.analysis) {
      return result.output.analysis;
    }
    return draft;
  } catch {
    return draft;
  }
}

export class BpPrdGenerator {
  constructor(
    private db: D1Database,
    private runner: AgentRunner,
  ) {}

  async generate(input: BpPrdInput): Promise<GeneratedPrdFromBp> {
    let content = buildPrdTemplate(input);

    if (!input.skipLlmRefine && this.runner) {
      content = await refineWithLlm(content, input, this.runner);
    }

    // 다음 version 계산
    const latestRow = await this.db
      .prepare("SELECT MAX(version) as max_ver FROM biz_generated_prds WHERE biz_item_id = ?")
      .bind(input.bizItemId)
      .first<{ max_ver: number | null }>();
    const nextVersion = (latestRow?.max_ver ?? 0) + 1;

    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO biz_generated_prds
           (id, biz_item_id, version, content, criteria_snapshot, generated_at, source_type, bp_draft_id)
         VALUES (?, ?, ?, ?, ?, ?, 'business_plan', ?)`,
      )
      .bind(id, input.bizItemId, nextVersion, content, "[]", now, input.bpDraftId)
      .run();

    return {
      id,
      bizItemId: input.bizItemId,
      version: nextVersion,
      content,
      sourceType: "business_plan",
      bpDraftId: input.bpDraftId,
      generatedAt: now,
    };
  }

  async getLatestBpPrd(bizItemId: string): Promise<GeneratedPrdFromBp | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM biz_generated_prds
         WHERE biz_item_id = ? AND source_type = 'business_plan'
         ORDER BY version DESC LIMIT 1`,
      )
      .bind(bizItemId)
      .first<PrdRow>();

    if (!row) return null;
    return {
      id: row.id,
      bizItemId: row.biz_item_id,
      version: row.version,
      content: row.content,
      sourceType: "business_plan",
      bpDraftId: row.bp_draft_id ?? "",
      generatedAt: row.generated_at,
    };
  }
}
