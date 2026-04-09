/**
 * F446: 사업기획서 Export Service (Sprint 216)
 * business_plan_drafts + business_plan_sections → HTML / PPTX 렌더링
 */
import type { PptxDesignConfig } from "./pptx-renderer.js";
import { BP_SECTIONS } from "./business-plan-template.js";

// pptxgenjs v4: dynamic import (Workers 환경 — createRequire 불가)
let _PptxGenJS: (new () => PptxPres) | null = null;
async function getPptxGenJS(): Promise<new () => PptxPres> {
  if (!_PptxGenJS) {
    const mod = await import("pptxgenjs");
    _PptxGenJS = (mod.default ?? mod) as unknown as new () => PptxPres;
  }
  return _PptxGenJS;
}

// ── BP 팔레트 정의 ──────────────────────────────

interface BpDesignConfig {
  bgColor: string;
  primaryColor: string;
  textColor: string;
  headingColor: string;
  accentColor: string;
}

const BP_PALETTES: { [key: string]: BpDesignConfig | undefined } & { internal: BpDesignConfig } = {
  internal: {
    bgColor: "#FFFFFF",
    primaryColor: "#1D4ED8",
    textColor: "#1F2937",
    headingColor: "#111827",
    accentColor: "#2563EB",
  },
  proposal: {
    bgColor: "#F8FAFC",
    primaryColor: "#0F766E",
    textColor: "#0F172A",
    headingColor: "#134E4A",
    accentColor: "#0D9488",
  },
  "ir-pitch": {
    bgColor: "#0F172A",
    primaryColor: "#7C3AED",
    textColor: "#F1F5F9",
    headingColor: "#E2E8F0",
    accentColor: "#8B5CF6",
  },
};

// ── DB Row 타입 ──────────────────────────────────

interface BpDraftRow {
  id: string;
  biz_item_id: string;
  version: number;
  content: string;
  generated_at: string;
}

interface BpSectionRow {
  id: string;
  draft_id: string;
  biz_item_id: string;
  section_num: number;
  content: string;
  updated_at: string;
}

interface BizItemRow {
  id: string;
  title: string;
}

// ── 내부 데이터 묶음 ─────────────────────────────

interface BpData {
  draft: BpDraftRow;
  bizItem: BizItemRow;
  sections: BpSectionRow[];
  templateType: string;
}

// ── Service ──────────────────────────────────────

export class BusinessPlanExportService {
  constructor(private db: D1Database, private filesBucket?: R2Bucket) {}

  private async getBpData(bizItemId: string): Promise<BpData | null> {
    const bizItem = await this.db
      .prepare("SELECT id, title FROM biz_items WHERE id = ?")
      .bind(bizItemId)
      .first<BizItemRow>();
    if (!bizItem) return null;

    const draft = await this.db
      .prepare(
        "SELECT * FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1",
      )
      .bind(bizItemId)
      .first<BpDraftRow>();
    if (!draft) return null;

    const sectionsResult = await this.db
      .prepare(
        "SELECT * FROM business_plan_sections WHERE draft_id = ? ORDER BY section_num ASC",
      )
      .bind(draft.id)
      .all<BpSectionRow>();

    const sections = sectionsResult.results;

    // templateType은 draft id 접두사 또는 default로 추론
    const templateType = "internal";

    return { draft, bizItem, sections, templateType };
  }

  /** sections → fallback: draft.content 전체를 1섹션으로 */
  private resolveSections(data: BpData): Array<{ num: number; title: string; content: string }> {
    if (data.sections.length > 0) {
      return data.sections.map((s) => {
        const bpSection = BP_SECTIONS.find((b) => b.section === s.section_num);
        return {
          num: s.section_num,
          title: bpSection?.title ?? `섹션 ${s.section_num}`,
          content: s.content || "(내용 없음)",
        };
      });
    }
    // fallback: content 전체를 1개 섹션으로
    return [
      {
        num: 1,
        title: data.bizItem.title,
        content: data.draft.content || "(내용 없음)",
      },
    ];
  }

  async exportHtml(bizItemId: string): Promise<string | null> {
    const data = await this.getBpData(bizItemId);
    if (!data) return null;

    if (data.sections.length === 0) {
      // R2 참조인 경우: [R2:path] 형식 → R2에서 HTML 직접 가져오기
      const r2Match = data.draft.content.match(/^\[R2:([^\]]+)\]/);
      if (r2Match && this.filesBucket) {
        const obj = await this.filesBucket.get(r2Match[1]!);
        if (obj) return obj.text();
      }

      // content가 이미 완전한 HTML 문서이면 그대로 반환
      if (isCompleteHtml(data.draft.content)) {
        return data.draft.content;
      }
    }

    return this.renderHtml(data);
  }

  async exportPptx(bizItemId: string): Promise<Uint8Array | null> {
    const data = await this.getBpData(bizItemId);
    if (!data) return null;
    return this.renderPptx(data);
  }

  // ── HTML 렌더링 ──────────────────────────────────

  private renderHtml(data: BpData): string {
    const palette = BP_PALETTES[data.templateType] ?? BP_PALETTES["internal"];
    const sections = this.resolveSections(data);

    const cssVariables = [
      `    --bp-bg: ${palette.bgColor};`,
      `    --bp-primary: ${palette.primaryColor};`,
      `    --bp-text: ${palette.textColor};`,
      `    --bp-heading: ${palette.headingColor};`,
      `    --bp-accent: ${palette.accentColor};`,
    ].join("\n");

    const sectionHtml = sections
      .map((s) => this.renderSectionHtml(s))
      .join("\n");

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.bizItem.title)} — 사업기획서</title>
  <style>
    :root {
${cssVariables}
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.7; color: var(--bp-text, #1F2937); background: var(--bp-bg, #FFFFFF); }
    .bp-doc { max-width: 960px; margin: 0 auto; padding: 40px 32px; }
    .bp-header { margin-bottom: 48px; border-bottom: 3px solid var(--bp-primary, #1D4ED8); padding-bottom: 24px; }
    .bp-header h1 { font-size: 28px; font-weight: 700; color: var(--bp-heading, #111827); }
    .bp-header .meta { font-size: 14px; color: #6b7280; margin-top: 8px; }
    .bp-section { margin-bottom: 32px; }
    .bp-section h2 { font-size: 20px; font-weight: 600; margin-bottom: 12px; color: var(--bp-heading, #111827); }
    .bp-section .content { font-size: 15px; }
    .bp-section .content p { margin-bottom: 12px; }
    .bp-section .placeholder { color: #9ca3af; font-style: italic; }
  </style>
</head>
<body>
  <div class="bp-doc">
    <header class="bp-header">
      <h1>${escapeHtml(data.bizItem.title)}</h1>
      <div class="meta">v${data.draft.version} · ${data.draft.generated_at}</div>
    </header>
${sectionHtml}
  </div>
</body>
</html>`;
  }

  private renderSectionHtml(section: { num: number; title: string; content: string }): string {
    const contentHtml = section.content && section.content !== "(내용 없음)"
      ? `<div class="content">${markdownToHtml(section.content)}</div>`
      : `<div class="content"><p class="placeholder">(내용 없음)</p></div>`;

    return `    <section data-section="${section.num}" class="bp-section">
      <h2>${section.num}. ${escapeHtml(section.title)}</h2>
      ${contentHtml}
    </section>`;
  }

  // ── PPTX 렌더링 ─────────────────────────────────

  private async renderPptx(data: BpData): Promise<Uint8Array> {
    const palette = BP_PALETTES[data.templateType] ?? BP_PALETTES["internal"];
    const sections = this.resolveSections(data);

    // PptxDesignConfig 형식으로 어댑터 작성 (# 제거)
    const design: PptxDesignConfig = {
      bgColor: palette.bgColor.replace(/^#/, ""),
      primaryColor: palette.primaryColor.replace(/^#/, ""),
      textColor: palette.textColor.replace(/^#/, ""),
      headingColor: palette.headingColor.replace(/^#/, ""),
      fontFamily: "Pretendard",
      titleFontSize: 24,
      bodyFontSize: 14,
      kpiFontSize: 32,
      dataPositive: "16A34A",
      dataNegative: "DC2626",
    };

    const PptxGenJS = await getPptxGenJS();
    const pres = new PptxGenJS();
    pres.layout = "LAYOUT_WIDE";
    pres.author = "Foundry-X";
    pres.title = data.bizItem.title;

    // 표지 슬라이드
    this.addBpTitleSlide(pres, data.bizItem.title, data.draft.version, data.draft.generated_at, design);

    // 목차 슬라이드
    this.addBpTocSlide(pres, sections, design);

    // 섹션별 슬라이드 (섹션 1개 = 슬라이드 1장)
    for (const section of sections) {
      this.addBpContentSlide(pres, section, design);
    }

    // 마무리 슬라이드
    this.addBpClosingSlide(pres, data.bizItem.title, design);

    const output = await pres.write({ outputType: "uint8array" });
    return output as Uint8Array;
  }

  private addBpTitleSlide(
    pres: PptxPres,
    title: string,
    version: number,
    generatedAt: string,
    design: PptxDesignConfig,
  ): void {
    const slide = pres.addSlide();
    slide.background = { color: design.primaryColor };

    slide.addText(title, {
      x: 0.5, y: 2.0, w: 12.33, h: 1.5,
      fontSize: 36, fontFace: design.fontFamily, color: "FFFFFF",
      bold: true, align: "center", valign: "middle",
    });

    slide.addText("사업기획서", {
      x: 0.5, y: 3.5, w: 12.33, h: 0.5,
      fontSize: 18, fontFace: design.fontFamily, color: "E0E7FF", align: "center",
    });

    slide.addText(`v${version} · ${generatedAt}`, {
      x: 0.5, y: 6.5, w: 12.33, h: 0.4,
      fontSize: 12, fontFace: design.fontFamily, color: "C7D2FE", align: "center",
    });
  }

  private addBpTocSlide(
    pres: PptxPres,
    sections: Array<{ num: number; title: string; content: string }>,
    design: PptxDesignConfig,
  ): void {
    const slide = pres.addSlide();
    slide.background = { color: design.bgColor };

    slide.addText("목차", {
      x: 0.5, y: 0.3, w: 12.33, h: 0.8,
      fontSize: design.titleFontSize, fontFace: design.fontFamily,
      color: design.headingColor, bold: true,
    });

    const half = Math.ceil(sections.length / 2);
    const leftItems = sections.slice(0, half);
    const rightItems = sections.slice(half);

    const formatItems = (items: typeof sections, startIdx: number) =>
      items.map((s, i) => `${String(startIdx + i + 1).padStart(2, "0")}. ${s.title}`).join("\n");

    slide.addText(formatItems(leftItems, 0), {
      x: 0.5, y: 1.3, w: 5.9, h: 5.5,
      fontSize: design.bodyFontSize, fontFace: design.fontFamily,
      color: design.textColor, lineSpacingMultiple: 1.8, valign: "top",
    });

    if (rightItems.length > 0) {
      slide.addText(formatItems(rightItems, half), {
        x: 6.8, y: 1.3, w: 5.9, h: 5.5,
        fontSize: design.bodyFontSize, fontFace: design.fontFamily,
        color: design.textColor, lineSpacingMultiple: 1.8, valign: "top",
      });
    }
  }

  private addBpContentSlide(
    pres: PptxPres,
    section: { num: number; title: string; content: string },
    design: PptxDesignConfig,
  ): void {
    const slide = pres.addSlide();
    slide.background = { color: design.bgColor };

    slide.addText(`${section.num}. ${section.title}`, {
      x: 0.5, y: 0.3, w: 12.33, h: 0.8,
      fontSize: design.titleFontSize, fontFace: design.fontFamily,
      color: design.headingColor, bold: true,
    });

    slide.addText(section.content, {
      x: 0.5, y: 1.3, w: 12.33, h: 5.7,
      fontSize: design.bodyFontSize, fontFace: design.fontFamily,
      color: design.textColor, valign: "top", lineSpacingMultiple: 1.5,
    });
  }

  private addBpClosingSlide(
    pres: PptxPres,
    title: string,
    design: PptxDesignConfig,
  ): void {
    const slide = pres.addSlide();
    slide.background = { color: design.primaryColor };

    slide.addText("감사합니다", {
      x: 0.5, y: 2.5, w: 12.33, h: 1.5,
      fontSize: 36, fontFace: design.fontFamily, color: "FFFFFF",
      bold: true, align: "center", valign: "middle",
    });

    slide.addText(`${title}\nkt ds AX사업개발팀`, {
      x: 0.5, y: 4.5, w: 12.33, h: 1.5,
      fontSize: 16, fontFace: design.fontFamily, color: "E0E7FF", align: "center",
    });
  }
}

// ── PptxPres 인터페이스 (로컬 선언) ─────────────

interface PptxPres {
  layout: string;
  author: string;
  title: string;
  addSlide: () => PptxSlide;
  write: (opts: { outputType: string }) => Promise<unknown>;
}

interface PptxSlide {
  background: { color: string };
  addText: (text: string, opts: Record<string, unknown>) => void;
  addShape?: (shape: string, opts: Record<string, unknown>) => void;
}

// ── 유틸 ─────────────────────────────────────────

/** content가 이미 완전한 HTML 문서인지 판별 */
function isCompleteHtml(content: string): boolean {
  const trimmed = content.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(md: string): string {
  return md
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("# ")) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
      if (trimmed.startsWith("## ")) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith("### ")) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed
          .split("\n")
          .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "))
          .map((l) => `<li>${escapeHtml(l.trim().slice(2))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
