/**
 * Sprint 215: 사업기획서 편집기 서비스 (F444)
 * 섹션별 편집 추적 + AI 재생성 + 버전 diff
 */

import { BP_SECTIONS } from "./business-plan-template.js";
import type { AgentRunner } from "./agent-runner.js";

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export interface BpSection {
  id: string;
  draftId: string;
  bizItemId: string;
  sectionNum: number;
  title: string;
  content: string;
  updatedAt: string | null;
}

export interface BpDiffResult {
  v1: { version: number; generatedAt: string };
  v2: { version: number; generatedAt: string };
  sections: Array<{
    num: number;
    title: string;
    v1Content: string;
    v2Content: string;
    changed: boolean;
  }>;
}

interface SectionRow {
  id: string;
  draft_id: string;
  biz_item_id: string;
  section_num: number;
  content: string;
  updated_at: string;
}

interface DraftRow {
  id: string;
  biz_item_id: string;
  version: number;
  content: string;
  sections_snapshot: string | null;
  generated_at: string;
}

/** 마크다운을 섹션 번호별 Map으로 파싱 */
function parseMarkdownToSections(markdown: string): Map<number, string> {
  const result = new Map<number, string>();
  // "## N. Title" 패턴으로 분리
  const sectionRegex = /^## (\d+)\. .+$/gm;
  const matches = [...markdown.matchAll(sectionRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match) continue;
    const groupOne = match[1];
    if (!groupOne) continue;
    const sectionNum = parseInt(groupOne, 10);
    const startIndex = (match.index ?? 0) + match[0].length;
    const nextMatch = matches[i + 1];
    const endIndex = nextMatch ? (nextMatch.index ?? markdown.length) : markdown.length;
    const content = markdown.slice(startIndex, endIndex).trim();
    result.set(sectionNum, content);
  }
  return result;
}

/** 섹션 Map을 마크다운으로 재조합 */
function assembleSectionsToMarkdown(
  sections: Map<number, string>,
  title: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`> 자동 생성일: ${new Date().toISOString().split("T")[0]} | Foundry-X Discovery Pipeline`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const sec of BP_SECTIONS) {
    lines.push(`## ${sec.section}. ${sec.title}`);
    lines.push("");
    lines.push(sections.get(sec.section) ?? `*${sec.description}*`);
    lines.push("");
  }
  return lines.join("\n");
}

export class BusinessPlanEditorService {
  constructor(private db: D1Database, private runner?: AgentRunner) {}

  /** 현재 섹션 목록 (없으면 최신 draft에서 파싱) */
  async getSections(bizItemId: string): Promise<BpSection[]> {
    // 최신 draft 조회
    const draft = await this.db
      .prepare("SELECT * FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId)
      .first<DraftRow>();

    if (!draft) return [];

    // DB에 섹션이 있으면 반환
    const { results } = await this.db
      .prepare("SELECT * FROM business_plan_sections WHERE draft_id = ? ORDER BY section_num")
      .bind(draft.id)
      .all<SectionRow>();

    if (results.length > 0) {
      return results.map(r => ({
        id: r.id,
        draftId: r.draft_id,
        bizItemId: r.biz_item_id,
        sectionNum: r.section_num,
        title: BP_SECTIONS.find(s => s.section === r.section_num)?.title ?? `Section ${r.section_num}`,
        content: r.content,
        updatedAt: r.updated_at,
      }));
    }

    // 없으면 draft.content에서 파싱하여 초기화
    const parsed = parseMarkdownToSections(draft.content);
    const now = new Date().toISOString();
    const rows: BpSection[] = [];

    for (const sec of BP_SECTIONS) {
      const id = generateId();
      const content = parsed.get(sec.section) ?? `*${sec.description}*`;
      await this.db
        .prepare(
          "INSERT INTO business_plan_sections (id, draft_id, biz_item_id, section_num, content, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(id, draft.id, bizItemId, sec.section, content, now)
        .run();
      rows.push({ id, draftId: draft.id, bizItemId, sectionNum: sec.section, title: sec.title, content, updatedAt: now });
    }
    return rows;
  }

  /** 섹션 내용 업데이트 */
  async updateSection(bizItemId: string, sectionNum: number, content: string): Promise<BpSection> {
    const now = new Date().toISOString();

    // 기존 섹션 행 조회
    const existing = await this.db
      .prepare(
        `SELECT bps.* FROM business_plan_sections bps
         JOIN business_plan_drafts bpd ON bps.draft_id = bpd.id
         WHERE bps.biz_item_id = ? AND bps.section_num = ?
         ORDER BY bpd.version DESC LIMIT 1`,
      )
      .bind(bizItemId, sectionNum)
      .first<SectionRow>();

    if (!existing) {
      // 섹션 초기화 후 재시도
      await this.getSections(bizItemId);
      const row = await this.db
        .prepare(
          `SELECT bps.* FROM business_plan_sections bps
           JOIN business_plan_drafts bpd ON bps.draft_id = bpd.id
           WHERE bps.biz_item_id = ? AND bps.section_num = ?
           ORDER BY bpd.version DESC LIMIT 1`,
        )
        .bind(bizItemId, sectionNum)
        .first<SectionRow>();
      if (!row) throw new Error(`Section ${sectionNum} not found`);
      await this.db
        .prepare("UPDATE business_plan_sections SET content = ?, updated_at = ? WHERE id = ?")
        .bind(content, now, row.id)
        .run();
      const title = BP_SECTIONS.find(s => s.section === sectionNum)?.title ?? `Section ${sectionNum}`;
      return { id: row.id, draftId: row.draft_id, bizItemId, sectionNum, title, content, updatedAt: now };
    }

    await this.db
      .prepare("UPDATE business_plan_sections SET content = ?, updated_at = ? WHERE id = ?")
      .bind(content, now, existing.id)
      .run();

    const title = BP_SECTIONS.find(s => s.section === sectionNum)?.title ?? `Section ${sectionNum}`;
    return { id: existing.id, draftId: existing.draft_id, bizItemId, sectionNum, title, content, updatedAt: now };
  }

  /** AI로 섹션 재생성 */
  async regenerateSection(bizItemId: string, sectionNum: number, customPrompt?: string): Promise<string> {
    if (!this.runner) {
      // runner 없으면 현재 섹션 내용 그대로 반환
      const sections = await this.getSections(bizItemId);
      return sections.find(s => s.sectionNum === sectionNum)?.content ?? "";
    }

    const secMeta = BP_SECTIONS.find(s => s.section === sectionNum);
    if (!secMeta) throw new Error(`Invalid section number: ${sectionNum}`);

    const sections = await this.getSections(bizItemId);
    const currentContent = sections.find(s => s.sectionNum === sectionNum)?.content ?? "";

    try {
      const result = await this.runner.execute({
        taskId: `bp-regen-${sectionNum}-${Date.now()}`,
        agentId: "bp-generator",
        taskType: "policy-evaluation",
        context: {
          repoUrl: "",
          branch: "",
          instructions: customPrompt
            ?? `사업계획서 섹션 "${secMeta.title}"을 다시 작성해주세요.\n\n목적: ${secMeta.description}\n\n기존 내용:\n${currentContent}\n\n더 구체적이고 전문적으로 개선해주세요.`,
          systemPromptOverride: "당신은 B2B 사업계획서 전문 편집자입니다. 요청된 섹션을 개선하여 내용만 반환하세요. 섹션 제목은 포함하지 마세요.",
        },
        constraints: [],
      });

      if (result.status === "success" && result.output?.analysis) {
        const newContent = result.output.analysis as string;
        await this.updateSection(bizItemId, sectionNum, newContent);
        return newContent;
      }
      return currentContent;
    } catch {
      return currentContent;
    }
  }

  /** 현재 편집된 섹션들을 새 버전 draft로 저장 */
  async saveDraft(bizItemId: string, note?: string): Promise<{ id: string; bizItemId: string; version: number; content: string; generatedAt: string }> {
    const sections = await this.getSections(bizItemId);
    if (sections.length === 0) throw new Error("No sections to save");

    // 마크다운 재조합
    const sectionMap = new Map(sections.map(s => [s.sectionNum, s.content]));
    const title = `사업계획서${note ? ` — ${note}` : ""}`;
    const newContent = assembleSectionsToMarkdown(sectionMap, title);

    // 기존 최신 버전 조회
    const latest = await this.db
      .prepare("SELECT version FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1")
      .bind(bizItemId)
      .first<{ version: number }>();
    const nextVersion = (latest?.version ?? 0) + 1;

    const id = generateId();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        "INSERT INTO business_plan_drafts (id, biz_item_id, version, content, sections_snapshot, model_used, tokens_used, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, bizItemId, nextVersion, newContent, JSON.stringify(Object.fromEntries(sectionMap)), null, 0, now)
      .run();

    // 섹션 행을 새 draft_id로 이전
    await this.db
      .prepare("UPDATE business_plan_sections SET draft_id = ? WHERE biz_item_id = ?")
      .bind(id, bizItemId)
      .run();

    return { id, bizItemId, version: nextVersion, content: newContent, generatedAt: now };
  }

  /** 두 버전 섹션별 diff */
  async diffVersions(bizItemId: string, v1: number, v2: number): Promise<BpDiffResult> {
    const [row1, row2] = await Promise.all([
      this.db
        .prepare("SELECT id, version, content, generated_at FROM business_plan_drafts WHERE biz_item_id = ? AND version = ?")
        .bind(bizItemId, v1)
        .first<{ id: string; version: number; content: string; generated_at: string }>(),
      this.db
        .prepare("SELECT id, version, content, generated_at FROM business_plan_drafts WHERE biz_item_id = ? AND version = ?")
        .bind(bizItemId, v2)
        .first<{ id: string; version: number; content: string; generated_at: string }>(),
    ]);

    if (!row1) throw new Error(`Version ${v1} not found`);
    if (!row2) throw new Error(`Version ${v2} not found`);

    const parsed1 = parseMarkdownToSections(row1.content);
    const parsed2 = parseMarkdownToSections(row2.content);

    const sectionDiffs = BP_SECTIONS.map(sec => {
      const c1 = parsed1.get(sec.section) ?? "";
      const c2 = parsed2.get(sec.section) ?? "";
      return {
        num: sec.section,
        title: sec.title,
        v1Content: c1,
        v2Content: c2,
        changed: c1 !== c2,
      };
    });

    return {
      v1: { version: row1.version, generatedAt: row1.generated_at },
      v2: { version: row2.version, generatedAt: row2.generated_at },
      sections: sectionDiffs,
    };
  }
}
