/**
 * F380: PPTX Renderer (Sprint 172)
 * pptxgenjs 기반 사업기획서 PPTX 생성 엔진
 */
import { SECTION_SLIDE_MAP, type SlideType } from "./pptx-slide-types.js";

// pptxgenjs v4: namespace+default+class 혼합 export
// Workers에서 createRequire 불가 → dynamic import + lazy init
let _PptxGenJS: (new () => PptxPres) | null = null;
async function getPptxGenJS(): Promise<new () => PptxPres> {
  if (!_PptxGenJS) {
    const mod = await import("pptxgenjs");
    _PptxGenJS = (mod.default ?? mod) as unknown as new () => PptxPres;
  }
  return _PptxGenJS;
}

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
  addShape: (shape: string, opts: Record<string, unknown>) => void;
}

// ── Types ──────────────────────────────────────

export interface OfferingRow {
  id: string;
  org_id: string;
  title: string;
  purpose: string;
  format: string;
  status: string;
  current_version: number;
  created_at: string;
}

export interface SectionRow {
  id: string;
  offering_id: string;
  section_key: string;
  title: string;
  content: string | null;
  sort_order: number;
  is_included: number;
}

export interface DesignTokenRow {
  token_key: string;
  token_value: string;
  token_category: string;
}

export interface PptxDesignConfig {
  bgColor: string;
  primaryColor: string;
  textColor: string;
  headingColor: string;
  fontFamily: string;
  titleFontSize: number;
  bodyFontSize: number;
  kpiFontSize: number;
  dataPositive: string;
  dataNegative: string;
}

interface PptxRenderInput {
  offering: OfferingRow;
  sections: SectionRow[];
  tokens: DesignTokenRow[];
}

// ── Design Config Builder ──────────────────────

const DEFAULT_DESIGN: PptxDesignConfig = {
  bgColor: "FFFFFF",
  primaryColor: "2563EB",
  textColor: "1A1A1A",
  headingColor: "111827",
  fontFamily: "Pretendard",
  titleFontSize: 24,
  bodyFontSize: 14,
  kpiFontSize: 32,
  dataPositive: "16A34A",
  dataNegative: "DC2626",
};

export function buildDesignConfig(tokens: DesignTokenRow[]): PptxDesignConfig {
  const config = { ...DEFAULT_DESIGN };
  for (const t of tokens) {
    const val = t.token_value.replace(/^#/, "");
    switch (t.token_key) {
      case "color-bg-default":
        config.bgColor = val;
        break;
      case "color-primary":
        config.primaryColor = val;
        break;
      case "color-text-primary":
        config.textColor = val;
        break;
      case "color-heading":
        config.headingColor = val;
        break;
      case "color-data-positive":
        config.dataPositive = val;
        break;
      case "color-data-negative":
        config.dataNegative = val;
        break;
    }
  }
  return config;
}

// ── Main Renderer ──────────��───────────────────

export async function renderPptx(input: PptxRenderInput): Promise<Uint8Array> {
  const { offering, sections, tokens } = input;
  const design = buildDesignConfig(tokens);
  const sectionMap = new Map(sections.map((s) => [s.section_key, s]));

  const PptxGenJS = await getPptxGenJS();
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "Foundry-X";
  pres.title = offering.title;

  // 표지
  addTitleSlide(pres, offering, design);

  // 목차
  addTocSlide(pres, sections, design);

  // 섹션별 슬라이드
  for (const mapping of SECTION_SLIDE_MAP) {
    if (mapping.sectionKey.startsWith("_")) continue;
    const section = sectionMap.get(mapping.sectionKey);
    if (!section) continue;
    addSectionSlides(pres, section, mapping.slideType, mapping.slideCount, design);
  }

  // 마무리
  addClosingSlide(pres, offering, design);

  const output = await pres.write({ outputType: "uint8array" });
  return output as Uint8Array;
}

// ── Slide Builders ─────────────────────────────

function addTitleSlide(pres: PptxPres, offering: OfferingRow, design: PptxDesignConfig): void {
  const slide = pres.addSlide();
  slide.background = { color: design.primaryColor };

  slide.addText(offering.title, {
    x: 0.5, y: 2.0, w: 12.33, h: 1.5,
    fontSize: 36, fontFace: design.fontFamily, color: "FFFFFF",
    bold: true, align: "center", valign: "middle",
  });

  const purposeLabel =
    offering.purpose === "report" ? "경영회의 보고용" :
    offering.purpose === "proposal" ? "대외 제안용" : "팀 내부 검토용";

  slide.addText(purposeLabel, {
    x: 0.5, y: 3.5, w: 12.33, h: 0.5,
    fontSize: 18, fontFace: design.fontFamily, color: "E0E7FF", align: "center",
  });

  slide.addText(offering.created_at, {
    x: 0.5, y: 6.5, w: 12.33, h: 0.4,
    fontSize: 12, fontFace: design.fontFamily, color: "C7D2FE", align: "center",
  });
}

function addTocSlide(pres: PptxPres, sections: SectionRow[], design: PptxDesignConfig): void {
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

  const formatItems = (items: SectionRow[], startIdx: number) =>
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

function addSectionSlides(
  pres: PptxPres, section: SectionRow, slideType: SlideType,
  slideCount: number, design: PptxDesignConfig,
): void {
  const content = section.content || "(내용 없음)";
  const paragraphs = content.split("\n\n").filter((p) => p.trim());

  if (slideCount === 1) {
    const slide = pres.addSlide();
    renderSlideByType(slide, section.title, paragraphs, slideType, design);
  } else {
    const chunkSize = Math.ceil(paragraphs.length / slideCount);
    for (let i = 0; i < slideCount; i++) {
      const slide = pres.addSlide();
      const chunk = paragraphs.slice(i * chunkSize, (i + 1) * chunkSize);
      const suffix = ` (${i + 1}/${slideCount})`;
      renderSlideByType(slide, section.title + suffix, chunk, slideType, design);
    }
  }
}

function renderSlideByType(
  slide: PptxSlide, title: string, paragraphs: string[],
  slideType: SlideType, design: PptxDesignConfig,
): void {
  slide.background = { color: design.bgColor };

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 12.33, h: 0.8,
    fontSize: design.titleFontSize, fontFace: design.fontFamily,
    color: design.headingColor, bold: true,
  });

  const bodyText = paragraphs.join("\n\n");

  switch (slideType) {
    case "hero-slide": renderHeroSlide(slide, paragraphs, design); break;
    case "exec-summary": renderExecSummary(slide, paragraphs, design); break;
    case "compare-slide": renderCompareSlide(slide, paragraphs, design); break;
    case "before-after-slide": renderBeforeAfterSlide(slide, paragraphs, design); break;
    case "gan-slide": renderGanSlide(slide, paragraphs, design); break;
    case "data-slide": renderDataSlide(slide, bodyText, design); break;
    case "scenario-slide": renderScenarioSlide(slide, paragraphs, design); break;
    case "roadmap-slide": renderRoadmapSlide(slide, paragraphs, design); break;
    case "org-slide": renderOrgSlide(slide, bodyText, design); break;
    case "impact-slide": renderImpactSlide(slide, paragraphs, design); break;
    case "strategy-slide": renderStrategySlide(slide, bodyText, design); break;
    case "content-slide": default: renderContentSlide(slide, bodyText, design); break;
  }
}

// ── Specialized Slide Renderers ─────────────────

function renderContentSlide(slide: PptxSlide, body: string, design: PptxDesignConfig): void {
  slide.addText(body, {
    x: 0.5, y: 1.3, w: 12.33, h: 5.7,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.textColor, valign: "top", lineSpacingMultiple: 1.5,
  });
}

function renderHeroSlide(slide: PptxSlide, paragraphs: string[], design: PptxDesignConfig): void {
  const headline = paragraphs[0] || "";
  slide.addText(headline, {
    x: 0.5, y: 1.5, w: 12.33, h: 1.5,
    fontSize: 28, fontFace: design.fontFamily,
    color: design.primaryColor, bold: true, align: "center", valign: "middle",
  });

  const kpis = paragraphs.slice(1, 4);
  const cardWidth = 3.5;
  const gap = 0.5;
  const startX = (13.33 - cardWidth * 3 - gap * 2) / 2;

  kpis.forEach((kpi, i) => {
    const x = startX + i * (cardWidth + gap);
    slide.addShape("rect", {
      x, y: 3.8, w: cardWidth, h: 2.5,
      fill: { color: "F3F4F6" }, rectRadius: 0.1,
    });
    slide.addText(kpi, {
      x, y: 3.8, w: cardWidth, h: 2.5,
      fontSize: design.bodyFontSize, fontFace: design.fontFamily,
      color: design.textColor, align: "center", valign: "middle",
    });
  });
}

function renderExecSummary(slide: PptxSlide, paragraphs: string[], design: PptxDesignConfig): void {
  const half = Math.ceil(paragraphs.length / 2);
  slide.addText(paragraphs.slice(0, half).join("\n\n"), {
    x: 0.5, y: 1.3, w: 5.9, h: 5.7,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.textColor, valign: "top", lineSpacingMultiple: 1.5,
  });
  slide.addShape("rect", {
    x: 6.8, y: 1.3, w: 5.9, h: 5.7,
    fill: { color: "EFF6FF" }, rectRadius: 0.1,
  });
  slide.addText(paragraphs.slice(half).join("\n\n"), {
    x: 7.0, y: 1.5, w: 5.5, h: 5.3,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.primaryColor, valign: "top", lineSpacingMultiple: 1.5,
  });
}

function renderCompareSlide(slide: PptxSlide, paragraphs: string[], design: PptxDesignConfig): void {
  const half = Math.ceil(paragraphs.length / 2);
  slide.addText("현재 (Before)", {
    x: 0.5, y: 1.3, w: 5.9, h: 0.5,
    fontSize: 16, fontFace: design.fontFamily, color: design.dataNegative, bold: true,
  });
  slide.addText(paragraphs.slice(0, half).join("\n\n"), {
    x: 0.5, y: 1.9, w: 5.9, h: 5.1,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.textColor, valign: "top",
  });
  slide.addText("목표 (After)", {
    x: 6.8, y: 1.3, w: 5.9, h: 0.5,
    fontSize: 16, fontFace: design.fontFamily, color: design.dataPositive, bold: true,
  });
  slide.addText(paragraphs.slice(half).join("\n\n"), {
    x: 6.8, y: 1.9, w: 5.9, h: 5.1,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.textColor, valign: "top",
  });
}

function renderBeforeAfterSlide(slide: PptxSlide, paragraphs: string[], design: PptxDesignConfig): void {
  const half = Math.ceil(paragraphs.length / 2);
  slide.addShape("rect", {
    x: 0.5, y: 1.3, w: 12.33, h: 2.5,
    fill: { color: "FEF2F2" }, rectRadius: 0.1,
  });
  slide.addText(paragraphs.slice(0, half).join("\n"), {
    x: 0.7, y: 1.4, w: 11.93, h: 2.3,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.dataNegative, valign: "middle",
  });
  slide.addText("\u2193", {
    x: 5.5, y: 3.9, w: 2.33, h: 0.6,
    fontSize: 28, color: design.primaryColor, align: "center", bold: true,
  });
  slide.addShape("rect", {
    x: 0.5, y: 4.6, w: 12.33, h: 2.5,
    fill: { color: "F0FDF4" }, rectRadius: 0.1,
  });
  slide.addText(paragraphs.slice(half).join("\n"), {
    x: 0.7, y: 4.7, w: 11.93, h: 2.3,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.dataPositive, valign: "middle",
  });
}

function renderGanSlide(slide: PptxSlide, paragraphs: string[], design: PptxDesignConfig): void {
  const half = Math.ceil(paragraphs.length / 2);
  slide.addText("추진론 (Pro)", {
    x: 0.5, y: 1.3, w: 5.9, h: 0.5,
    fontSize: 16, fontFace: design.fontFamily, color: design.dataPositive, bold: true,
  });
  slide.addText(paragraphs.slice(0, half).join("\n\n"), {
    x: 0.5, y: 1.9, w: 5.9, h: 4.5,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.textColor, valign: "top",
  });
  slide.addText("반대론 (Con)", {
    x: 6.8, y: 1.3, w: 5.9, h: 0.5,
    fontSize: 16, fontFace: design.fontFamily, color: design.dataNegative, bold: true,
  });
  slide.addText(paragraphs.slice(half).join("\n\n"), {
    x: 6.8, y: 1.9, w: 5.9, h: 4.5,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.textColor, valign: "top",
  });
}

function renderDataSlide(slide: PptxSlide, body: string, design: PptxDesignConfig): void {
  slide.addShape("rect", {
    x: 0.5, y: 1.3, w: 12.33, h: 5.7,
    fill: { color: "F9FAFB" }, rectRadius: 0.1,
  });
  slide.addText(body, {
    x: 0.7, y: 1.5, w: 11.93, h: 5.3,
    fontSize: design.bodyFontSize, fontFace: design.fontFamily,
    color: design.textColor, valign: "top", lineSpacingMultiple: 1.4,
  });
}

function renderScenarioSlide(slide: PptxSlide, paragraphs: string[], design: PptxDesignConfig): void {
  const cards = paragraphs.slice(0, 3);
  const cardW = 3.8;
  const gap = 0.3;
  const startX = (13.33 - cardW * cards.length - gap * (cards.length - 1)) / 2;

  cards.forEach((card, i) => {
    const x = startX + i * (cardW + gap);
    slide.addShape("rect", {
      x, y: 1.5, w: cardW, h: 5.0,
      fill: { color: "F3F4F6" }, rectRadius: 0.15,
    });
    slide.addText(card, {
      x: x + 0.2, y: 1.7, w: cardW - 0.4, h: 4.6,
      fontSize: design.bodyFontSize, fontFace: design.fontFamily,
      color: design.textColor, valign: "top", lineSpacingMultiple: 1.4,
    });
  });
}

function renderRoadmapSlide(slide: PptxSlide, paragraphs: string[], design: PptxDesignConfig): void {
  const phases = ["단기 (6개월)", "중기 (1년)", "장기 (2년+)"];
  const phaseW = 3.8;
  const gap = 0.3;
  const startX = (13.33 - phaseW * 3 - gap * 2) / 2;

  phases.forEach((phase, i) => {
    const x = startX + i * (phaseW + gap);
    slide.addShape("rect", {
      x, y: 1.5, w: phaseW, h: 0.6,
      fill: { color: design.primaryColor }, rectRadius: 0.05,
    });
    slide.addText(phase, {
      x, y: 1.5, w: phaseW, h: 0.6,
      fontSize: 12, fontFace: design.fontFamily, color: "FFFFFF",
      bold: true, align: "center", valign: "middle",
    });
    slide.addShape("rect", {
      x, y: 2.2, w: phaseW, h: 4.5,
      fill: { color: "F9FAFB" }, rectRadius: 0.05,
    });
    slide.addText(paragraphs[i] || "", {
      x: x + 0.15, y: 2.4, w: phaseW - 0.3, h: 4.1,
      fontSize: design.bodyFontSize - 1, fontFace: design.fontFamily,
      color: design.textColor, valign: "top", lineSpacingMultiple: 1.3,
    });
    if (i < 2) {
      slide.addText("\u2192", {
        x: x + phaseW, y: 3.5, w: gap, h: 0.5,
        fontSize: 20, color: design.primaryColor, align: "center", bold: true,
      });
    }
  });
}

function renderOrgSlide(slide: PptxSlide, body: string, design: PptxDesignConfig): void {
  renderContentSlide(slide, body, design);
}

function renderImpactSlide(slide: PptxSlide, paragraphs: string[], design: PptxDesignConfig): void {
  paragraphs.forEach((p, i) => {
    const y = 1.3 + i * 1.2;
    if (y > 6.5) return;
    slide.addShape("rect", {
      x: 0.5, y, w: 12.33, h: 1.0,
      fill: { color: i % 2 === 0 ? "F0FDF4" : "F9FAFB" }, rectRadius: 0.05,
    });
    slide.addText(`\u2713 ${p}`, {
      x: 0.7, y, w: 11.93, h: 1.0,
      fontSize: design.bodyFontSize, fontFace: design.fontFamily,
      color: design.dataPositive, valign: "middle",
    });
  });
}

function renderStrategySlide(slide: PptxSlide, body: string, design: PptxDesignConfig): void {
  renderContentSlide(slide, body, design);
}

function addClosingSlide(pres: PptxPres, offering: OfferingRow, design: PptxDesignConfig): void {
  const slide = pres.addSlide();
  slide.background = { color: design.primaryColor };

  slide.addText("감사합니다", {
    x: 0.5, y: 2.5, w: 12.33, h: 1.5,
    fontSize: 36, fontFace: design.fontFamily, color: "FFFFFF",
    bold: true, align: "center", valign: "middle",
  });

  slide.addText(`${offering.title}\nkt ds AX사업개발팀`, {
    x: 0.5, y: 4.5, w: 12.33, h: 1.5,
    fontSize: 16, fontFace: design.fontFamily, color: "E0E7FF", align: "center",
  });
}
