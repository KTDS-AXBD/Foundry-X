/**
 * F380: PPTX Renderer (Sprint 172)
 * C9: 제안서 수준 품질 보강
 * pptxgenjs 기반 사업기획서 PPTX 생성 엔진
 */
import { SECTION_SLIDE_MAP, type SlideType } from "./pptx-slide-types.js";
import {
  parseContentBlocks,
  parseKpiItems,
  parseTableData,
  parseBulletItems,
  type ContentBlock,
} from "./pptx-content-parser.js";

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

// ── PptxGenJS Interfaces ──────────────────────────
// pptxgenjs 실제 API를 반영한 확장 인터페이스

interface PptxTextProps {
  text: string;
  options?: Record<string, unknown>;
}

interface PptxTableCell {
  text: string;
  options?: Record<string, unknown>;
}

interface PptxPres {
  layout: string;
  author: string;
  title: string;
  addSlide: (opts?: { masterName?: string }) => PptxSlide;
  write: (opts: { outputType: string }) => Promise<unknown>;
  defineSlideMaster: (opts: Record<string, unknown>) => void;
}

interface PptxSlide {
  background: { color: string };
  addText: (
    text: string | PptxTextProps[],
    opts: Record<string, unknown>,
  ) => void;
  addShape: (shape: string, opts: Record<string, unknown>) => void;
  addTable: (
    rows: PptxTableCell[][],
    opts: Record<string, unknown>,
  ) => void;
  addNotes: (notes: string) => void;
  slideNumber: Record<string, unknown> | undefined;
}

// ── Types ──────────────────────────────────────

export interface OfferingRow {
  id: string;
  org_id: string;
  biz_item_id: string;
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

// ── Constants ─────────────────────────────────

const SLIDE_WIDTH = 13.33;
const MARGIN = 0.5;
const CONTENT_WIDTH = SLIDE_WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 0.8;
const BODY_TOP = 1.3;
const BODY_HEIGHT = 5.7;
const FOOTER_TEXT = "kt ds AX사업개발팀 · CONFIDENTIAL";

/** 섹션 구분 divider 슬라이드를 삽입할 상위 섹션 키 */
const DIVIDER_SECTIONS: Record<string, string> = {
  s01: "01. 추진 배경 및 목적",
  s02_1: "02. 사업기회 점검",
  s03_1: "03. 제안 방향",
  s04_1: "04. 추진 계획",
  s05: "05. KT 연계 GTM 전략",
};

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

// ── Helpers ────────────────────────────────────

function formatDate(raw: string): string {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return raw;
  }
}

function purposeLabel(purpose: string): string {
  return purpose === "report"
    ? "경영회의 보고용"
    : purpose === "proposal"
      ? "대외 제안용"
      : "팀 내부 검토용";
}

function lightenColor(hex: string, amount = 0.9): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return [lr, lg, lb].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** 슬라이드에 공통 푸터 + 슬라이드 번호 추가 */
function addSlideFooter(slide: PptxSlide, design: PptxDesignConfig): void {
  slide.addText(FOOTER_TEXT, {
    x: MARGIN,
    y: 7.1,
    w: CONTENT_WIDTH - 1.5,
    h: 0.3,
    fontSize: 8,
    fontFace: design.fontFamily,
    color: "9CA3AF",
    align: "left",
    valign: "bottom",
  });
  slide.slideNumber = {
    x: SLIDE_WIDTH - 1.5,
    y: 7.1,
    w: 1.0,
    h: 0.3,
    fontSize: 8,
    fontFace: design.fontFamily,
    color: "9CA3AF",
    align: "right",
  };
}

/** 섹션 제목 영역 공통 렌더 */
function addSectionHeader(
  slide: PptxSlide,
  title: string,
  design: PptxDesignConfig,
): void {
  // 제목 좌측 악센트 라인
  slide.addShape("rect", {
    x: MARGIN,
    y: 0.3,
    w: 0.06,
    h: 0.6,
    fill: { color: design.primaryColor },
  });
  slide.addText(title, {
    x: MARGIN + 0.2,
    y: 0.3,
    w: CONTENT_WIDTH - 0.2,
    h: HEADER_HEIGHT,
    fontSize: design.titleFontSize,
    fontFace: design.fontFamily,
    color: design.headingColor,
    bold: true,
    valign: "middle",
  });
}

/** 리치 텍스트 렌더 — ContentBlock[] 기반 */
function renderRichText(
  slide: PptxSlide,
  blocks: ContentBlock[],
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    design: PptxDesignConfig;
    fontSize?: number;
  },
): void {
  const { design, fontSize = design.bodyFontSize } = opts;
  const textParts: PptxTextProps[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      textParts.push({
        text: block.text + "\n",
        options: {
          fontSize: fontSize + 2,
          fontFace: design.fontFamily,
          color: design.headingColor,
          bold: true,
          breakType: "break",
        },
      });
    } else if (block.type === "bullet") {
      textParts.push({
        text: block.text,
        options: {
          fontSize,
          fontFace: design.fontFamily,
          color: design.textColor,
          bullet: true,
          indentLevel: block.level ?? 0,
          breakType: "break",
        },
      });
    } else if (block.type === "bold") {
      textParts.push({
        text: block.text,
        options: {
          fontSize,
          fontFace: design.fontFamily,
          color: design.textColor,
          bold: true,
        },
      });
    } else {
      textParts.push({
        text: block.text + "\n",
        options: {
          fontSize,
          fontFace: design.fontFamily,
          color: design.textColor,
          breakType: "break",
        },
      });
    }
  }

  if (textParts.length === 0) {
    textParts.push({
      text: "(내용 없음)",
      options: {
        fontSize,
        fontFace: design.fontFamily,
        color: "9CA3AF",
        italic: true,
      },
    });
  }

  slide.addText(textParts, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    valign: "top",
    lineSpacingMultiple: 1.5,
  });
}

// ── Main Renderer ─────────────────────────────

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
  let prevDividerKey: string | null = null;
  for (const mapping of SECTION_SLIDE_MAP) {
    if (mapping.sectionKey.startsWith("_")) continue;
    const section = sectionMap.get(mapping.sectionKey);
    if (!section) continue;

    // 섹션 구분 divider 삽입
    const dividerTitle = DIVIDER_SECTIONS[mapping.sectionKey];
    if (dividerTitle && dividerTitle !== prevDividerKey) {
      addDividerSlide(pres, dividerTitle, design);
      prevDividerKey = dividerTitle;
    }

    addSectionSlides(
      pres,
      section,
      mapping.slideType,
      mapping.slideCount,
      design,
      offering.purpose,
    );
  }

  // 마무리
  addClosingSlide(pres, offering, design);

  const output = await pres.write({ outputType: "uint8array" });
  return output as Uint8Array;
}

// ── Slide Builders ────────────────────────────

function addTitleSlide(
  pres: PptxPres,
  offering: OfferingRow,
  design: PptxDesignConfig,
): void {
  const slide = pres.addSlide();
  slide.background = { color: design.primaryColor };

  // 상단 악센트 라인
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: SLIDE_WIDTH,
    h: 0.08,
    fill: { color: "FFFFFF" },
  });

  slide.addText(offering.title, {
    x: MARGIN,
    y: 2.0,
    w: CONTENT_WIDTH,
    h: 1.5,
    fontSize: 36,
    fontFace: design.fontFamily,
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle",
  });

  slide.addText(purposeLabel(offering.purpose), {
    x: MARGIN,
    y: 3.6,
    w: CONTENT_WIDTH,
    h: 0.5,
    fontSize: 18,
    fontFace: design.fontFamily,
    color: "E0E7FF",
    align: "center",
  });

  // 하단 구분선 + 날짜 + 소속
  slide.addShape("rect", {
    x: 4.5,
    y: 5.5,
    w: 4.33,
    h: 0.02,
    fill: { color: "E0E7FF" },
  });

  slide.addText(
    `${formatDate(offering.created_at)}\nkt ds AX사업개발팀`,
    {
      x: MARGIN,
      y: 5.7,
      w: CONTENT_WIDTH,
      h: 1.0,
      fontSize: 14,
      fontFace: design.fontFamily,
      color: "C7D2FE",
      align: "center",
      lineSpacingMultiple: 1.6,
    },
  );

  slide.addNotes(
    `${offering.title} — ${purposeLabel(offering.purpose)}. ` +
      `작성일: ${formatDate(offering.created_at)}`,
  );
}

function addTocSlide(
  pres: PptxPres,
  sections: SectionRow[],
  design: PptxDesignConfig,
): void {
  const slide = pres.addSlide();
  slide.background = { color: design.bgColor };

  addSectionHeader(slide, "목차", design);

  const half = Math.ceil(sections.length / 2);
  const leftItems = sections.slice(0, half);
  const rightItems = sections.slice(half);

  const formatItems = (items: SectionRow[], startIdx: number) =>
    items
      .map(
        (s, i) =>
          `${String(startIdx + i + 1).padStart(2, "0")}. ${s.title}`,
      )
      .join("\n");

  slide.addText(formatItems(leftItems, 0), {
    x: MARGIN,
    y: BODY_TOP,
    w: 5.9,
    h: 5.5,
    fontSize: design.bodyFontSize,
    fontFace: design.fontFamily,
    color: design.textColor,
    lineSpacingMultiple: 1.8,
    valign: "top",
  });

  if (rightItems.length > 0) {
    slide.addText(formatItems(rightItems, half), {
      x: 6.8,
      y: BODY_TOP,
      w: 5.9,
      h: 5.5,
      fontSize: design.bodyFontSize,
      fontFace: design.fontFamily,
      color: design.textColor,
      lineSpacingMultiple: 1.8,
      valign: "top",
    });
  }

  addSlideFooter(slide, design);
  slide.addNotes(
    `이 사업기획서는 총 ${sections.length}개 섹션으로 구성되어 있어요.`,
  );
}

/** 섹션 구분 divider 슬라이드 */
function addDividerSlide(
  pres: PptxPres,
  sectionTitle: string,
  design: PptxDesignConfig,
): void {
  const slide = pres.addSlide();
  slide.background = { color: design.primaryColor };

  // 좌측 악센트 바
  slide.addShape("rect", {
    x: 1.5,
    y: 2.8,
    w: 0.1,
    h: 1.8,
    fill: { color: "FFFFFF" },
  });

  slide.addText(sectionTitle, {
    x: 2.0,
    y: 2.8,
    w: 9.0,
    h: 1.8,
    fontSize: 32,
    fontFace: design.fontFamily,
    color: "FFFFFF",
    bold: true,
    valign: "middle",
  });
}

function addSectionSlides(
  pres: PptxPres,
  section: SectionRow,
  slideType: SlideType,
  slideCount: number,
  design: PptxDesignConfig,
  purpose: string,
): void {
  const content = section.content || "";
  const paragraphs = content.split("\n\n").filter((p) => p.trim());
  const blocks = parseContentBlocks(content);

  if (slideCount === 1) {
    const slide = pres.addSlide();
    renderSlideByType(
      slide,
      section.title,
      paragraphs,
      blocks,
      content,
      slideType,
      design,
    );
    addSlideFooter(slide, design);
    addAutoNotes(slide, section, purpose);
  } else {
    const chunkSize = Math.ceil(paragraphs.length / slideCount);
    for (let i = 0; i < slideCount; i++) {
      const slide = pres.addSlide();
      const chunk = paragraphs.slice(i * chunkSize, (i + 1) * chunkSize);
      const chunkContent = chunk.join("\n\n");
      const chunkBlocks = parseContentBlocks(chunkContent);
      const suffix = ` (${i + 1}/${slideCount})`;
      renderSlideByType(
        slide,
        section.title + suffix,
        chunk,
        chunkBlocks,
        chunkContent,
        slideType,
        design,
      );
      addSlideFooter(slide, design);
      if (i === 0) addAutoNotes(slide, section, purpose);
    }
  }
}

/** 발표 노트 자동 생성 */
function addAutoNotes(
  slide: PptxSlide,
  section: SectionRow,
  purpose: string,
): void {
  const content = section.content || "";
  // 첫 2~3문장을 발표 노트로 사용
  const sentences = content
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?。])\s+/)
    .filter((s) => s.trim().length > 5);
  const noteLines = sentences.slice(0, 3).join(" ");
  const purposeNote =
    purpose === "report"
      ? "[경영보고] "
      : purpose === "proposal"
        ? "[제안] "
        : "[검토] ";
  slide.addNotes(
    `${purposeNote}${section.title}: ${noteLines || "(발표 노트를 추가해 주세요)"}`,
  );
}

function renderSlideByType(
  slide: PptxSlide,
  title: string,
  paragraphs: string[],
  blocks: ContentBlock[],
  rawContent: string,
  slideType: SlideType,
  design: PptxDesignConfig,
): void {
  slide.background = { color: design.bgColor };
  addSectionHeader(slide, title, design);

  switch (slideType) {
    case "hero-slide":
      renderHeroSlide(slide, paragraphs, design);
      break;
    case "exec-summary":
      renderExecSummary(slide, blocks, design);
      break;
    case "compare-slide":
      renderCompareSlide(slide, paragraphs, design);
      break;
    case "before-after-slide":
      renderBeforeAfterSlide(slide, paragraphs, design);
      break;
    case "gan-slide":
      renderGanSlide(slide, paragraphs, design);
      break;
    case "data-slide":
      renderDataSlide(slide, rawContent, design);
      break;
    case "scenario-slide":
      renderScenarioSlide(slide, paragraphs, design);
      break;
    case "roadmap-slide":
      renderRoadmapSlide(slide, paragraphs, design);
      break;
    case "org-slide":
      renderOrgSlide(slide, rawContent, design);
      break;
    case "impact-slide":
      renderImpactSlide(slide, paragraphs, design);
      break;
    case "strategy-slide":
      renderStrategySlide(slide, blocks, rawContent, design);
      break;
    case "content-slide":
    default:
      renderContentSlide(slide, blocks, design);
      break;
  }
}

// ── Specialized Slide Renderers ─────────────────

function renderContentSlide(
  slide: PptxSlide,
  blocks: ContentBlock[],
  design: PptxDesignConfig,
): void {
  renderRichText(slide, blocks, {
    x: MARGIN,
    y: BODY_TOP,
    w: CONTENT_WIDTH,
    h: BODY_HEIGHT,
    design,
  });
}

function renderHeroSlide(
  slide: PptxSlide,
  paragraphs: string[],
  design: PptxDesignConfig,
): void {
  // 헤드라인
  const headline = paragraphs[0] || "";
  slide.addText(headline, {
    x: MARGIN,
    y: 1.3,
    w: CONTENT_WIDTH,
    h: 1.2,
    fontSize: 26,
    fontFace: design.fontFamily,
    color: design.primaryColor,
    bold: true,
    align: "center",
    valign: "middle",
  });

  // KPI 카드 — 구조화 파싱 시도
  const kpiSource = paragraphs.slice(1, 4);
  const kpis = parseKpiItems(kpiSource);

  const cardCount = Math.min(kpis.length, 3);
  if (cardCount === 0) return;

  const cardWidth = 3.6;
  const gap = 0.4;
  const totalWidth = cardWidth * cardCount + gap * (cardCount - 1);
  const startX = (SLIDE_WIDTH - totalWidth) / 2;

  kpis.slice(0, 3).forEach((kpi, i) => {
    const x = startX + i * (cardWidth + gap);
    const cardY = 3.2;

    // 카드 배경
    slide.addShape("rect", {
      x,
      y: cardY,
      w: cardWidth,
      h: 3.2,
      fill: { color: lightenColor(design.primaryColor, 0.92) },
      rectRadius: 0.1,
    });

    // 상단 악센트 라인
    slide.addShape("rect", {
      x: x + 0.3,
      y: cardY + 0.15,
      w: cardWidth - 0.6,
      h: 0.04,
      fill: { color: design.primaryColor },
    });

    // KPI 수치 (큰 글씨)
    slide.addText(kpi.value, {
      x,
      y: cardY + 0.5,
      w: cardWidth,
      h: 1.2,
      fontSize: design.kpiFontSize,
      fontFace: design.fontFamily,
      color: design.primaryColor,
      bold: true,
      align: "center",
      valign: "middle",
    });

    // KPI 라벨
    slide.addText(kpi.label, {
      x: x + 0.2,
      y: cardY + 1.7,
      w: cardWidth - 0.4,
      h: 1.2,
      fontSize: design.bodyFontSize - 1,
      fontFace: design.fontFamily,
      color: design.textColor,
      align: "center",
      valign: "top",
      lineSpacingMultiple: 1.3,
    });
  });
}

function renderExecSummary(
  slide: PptxSlide,
  blocks: ContentBlock[],
  design: PptxDesignConfig,
): void {
  const half = Math.ceil(blocks.length / 2);
  const leftBlocks = blocks.slice(0, half);
  const rightBlocks = blocks.slice(half);

  // 좌측: 텍스트 요약
  renderRichText(slide, leftBlocks, {
    x: MARGIN,
    y: BODY_TOP,
    w: 5.9,
    h: BODY_HEIGHT,
    design,
  });

  // 우측: 하이라이트 박스
  slide.addShape("rect", {
    x: 6.8,
    y: BODY_TOP,
    w: 5.9,
    h: BODY_HEIGHT,
    fill: { color: lightenColor(design.primaryColor, 0.92) },
    rectRadius: 0.1,
  });

  // 우측 상단 악센트
  slide.addShape("rect", {
    x: 6.8,
    y: BODY_TOP,
    w: 5.9,
    h: 0.06,
    fill: { color: design.primaryColor },
    rectRadius: 0,
  });

  renderRichText(slide, rightBlocks, {
    x: 7.0,
    y: BODY_TOP + 0.3,
    w: 5.5,
    h: BODY_HEIGHT - 0.5,
    design,
    fontSize: design.bodyFontSize,
  });
}

function renderCompareSlide(
  slide: PptxSlide,
  paragraphs: string[],
  design: PptxDesignConfig,
): void {
  const half = Math.ceil(paragraphs.length / 2);
  const colWidth = 5.9;

  // 좌측: Before
  slide.addShape("rect", {
    x: MARGIN,
    y: BODY_TOP,
    w: colWidth,
    h: 0.5,
    fill: { color: lightenColor(design.dataNegative, 0.85) },
  });
  slide.addText("현재 (Before)", {
    x: MARGIN + 0.15,
    y: BODY_TOP,
    w: colWidth - 0.3,
    h: 0.5,
    fontSize: 14,
    fontFace: design.fontFamily,
    color: design.dataNegative,
    bold: true,
    valign: "middle",
  });
  slide.addText(paragraphs.slice(0, half).join("\n\n"), {
    x: MARGIN,
    y: 1.9,
    w: colWidth,
    h: 5.1,
    fontSize: design.bodyFontSize,
    fontFace: design.fontFamily,
    color: design.textColor,
    valign: "top",
    lineSpacingMultiple: 1.4,
  });

  // 우측: After
  slide.addShape("rect", {
    x: 6.8,
    y: BODY_TOP,
    w: colWidth,
    h: 0.5,
    fill: { color: lightenColor(design.dataPositive, 0.85) },
  });
  slide.addText("목표 (After)", {
    x: 6.95,
    y: BODY_TOP,
    w: colWidth - 0.3,
    h: 0.5,
    fontSize: 14,
    fontFace: design.fontFamily,
    color: design.dataPositive,
    bold: true,
    valign: "middle",
  });
  slide.addText(paragraphs.slice(half).join("\n\n"), {
    x: 6.8,
    y: 1.9,
    w: colWidth,
    h: 5.1,
    fontSize: design.bodyFontSize,
    fontFace: design.fontFamily,
    color: design.textColor,
    valign: "top",
    lineSpacingMultiple: 1.4,
  });
}

function renderBeforeAfterSlide(
  slide: PptxSlide,
  paragraphs: string[],
  design: PptxDesignConfig,
): void {
  const half = Math.ceil(paragraphs.length / 2);

  // Before 영역
  slide.addShape("rect", {
    x: MARGIN,
    y: BODY_TOP,
    w: CONTENT_WIDTH,
    h: 2.3,
    fill: { color: lightenColor(design.dataNegative, 0.92) },
    rectRadius: 0.1,
  });
  // Before 라벨
  slide.addShape("rect", {
    x: MARGIN,
    y: BODY_TOP,
    w: 1.2,
    h: 0.35,
    fill: { color: design.dataNegative },
    rectRadius: 0.05,
  });
  slide.addText("Before", {
    x: MARGIN,
    y: BODY_TOP,
    w: 1.2,
    h: 0.35,
    fontSize: 10,
    fontFace: design.fontFamily,
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle",
  });
  slide.addText(paragraphs.slice(0, half).join("\n"), {
    x: MARGIN + 0.2,
    y: BODY_TOP + 0.5,
    w: CONTENT_WIDTH - 0.4,
    h: 1.7,
    fontSize: design.bodyFontSize,
    fontFace: design.fontFamily,
    color: design.textColor,
    valign: "middle",
    lineSpacingMultiple: 1.3,
  });

  // 화살표
  slide.addText("\u2193", {
    x: 5.5,
    y: 3.7,
    w: 2.33,
    h: 0.6,
    fontSize: 28,
    color: design.primaryColor,
    align: "center",
    bold: true,
  });

  // After 영역
  slide.addShape("rect", {
    x: MARGIN,
    y: 4.4,
    w: CONTENT_WIDTH,
    h: 2.3,
    fill: { color: lightenColor(design.dataPositive, 0.92) },
    rectRadius: 0.1,
  });
  // After 라벨
  slide.addShape("rect", {
    x: MARGIN,
    y: 4.4,
    w: 1.0,
    h: 0.35,
    fill: { color: design.dataPositive },
    rectRadius: 0.05,
  });
  slide.addText("After", {
    x: MARGIN,
    y: 4.4,
    w: 1.0,
    h: 0.35,
    fontSize: 10,
    fontFace: design.fontFamily,
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle",
  });
  slide.addText(paragraphs.slice(half).join("\n"), {
    x: MARGIN + 0.2,
    y: 4.9,
    w: CONTENT_WIDTH - 0.4,
    h: 1.7,
    fontSize: design.bodyFontSize,
    fontFace: design.fontFamily,
    color: design.textColor,
    valign: "middle",
    lineSpacingMultiple: 1.3,
  });
}

function renderGanSlide(
  slide: PptxSlide,
  paragraphs: string[],
  design: PptxDesignConfig,
): void {
  const half = Math.ceil(paragraphs.length / 2);
  const colWidth = 5.9;

  // 좌측: 추진론
  slide.addShape("rect", {
    x: MARGIN,
    y: BODY_TOP,
    w: colWidth,
    h: 0.5,
    fill: { color: lightenColor(design.dataPositive, 0.85) },
  });
  slide.addText("✓ 추진론 (Pro)", {
    x: MARGIN + 0.15,
    y: BODY_TOP,
    w: colWidth - 0.3,
    h: 0.5,
    fontSize: 14,
    fontFace: design.fontFamily,
    color: design.dataPositive,
    bold: true,
    valign: "middle",
  });

  const proBullets = parseBulletItems(paragraphs.slice(0, half).join("\n\n"));
  if (proBullets.length > 0) {
    const proText: PptxTextProps[] = proBullets.map((b) => ({
      text: b,
      options: {
        fontSize: design.bodyFontSize,
        fontFace: design.fontFamily,
        color: design.textColor,
        bullet: true,
        breakType: "break",
      },
    }));
    slide.addText(proText, {
      x: MARGIN + 0.1,
      y: 1.9,
      w: colWidth - 0.2,
      h: 4.8,
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  } else {
    slide.addText(paragraphs.slice(0, half).join("\n\n"), {
      x: MARGIN,
      y: 1.9,
      w: colWidth,
      h: 4.8,
      fontSize: design.bodyFontSize,
      fontFace: design.fontFamily,
      color: design.textColor,
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  }

  // 우측: 반대론
  slide.addShape("rect", {
    x: 6.8,
    y: BODY_TOP,
    w: colWidth,
    h: 0.5,
    fill: { color: lightenColor(design.dataNegative, 0.85) },
  });
  slide.addText("✗ 반대론 (Con)", {
    x: 6.95,
    y: BODY_TOP,
    w: colWidth - 0.3,
    h: 0.5,
    fontSize: 14,
    fontFace: design.fontFamily,
    color: design.dataNegative,
    bold: true,
    valign: "middle",
  });

  const conBullets = parseBulletItems(paragraphs.slice(half).join("\n\n"));
  if (conBullets.length > 0) {
    const conText: PptxTextProps[] = conBullets.map((b) => ({
      text: b,
      options: {
        fontSize: design.bodyFontSize,
        fontFace: design.fontFamily,
        color: design.textColor,
        bullet: true,
        breakType: "break",
      },
    }));
    slide.addText(conText, {
      x: 6.9,
      y: 1.9,
      w: colWidth - 0.2,
      h: 4.8,
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  } else {
    slide.addText(paragraphs.slice(half).join("\n\n"), {
      x: 6.8,
      y: 1.9,
      w: colWidth,
      h: 4.8,
      fontSize: design.bodyFontSize,
      fontFace: design.fontFamily,
      color: design.textColor,
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  }
}

function renderDataSlide(
  slide: PptxSlide,
  rawContent: string,
  design: PptxDesignConfig,
): void {
  // 마크다운 테이블 파싱 시도
  const tableData = parseTableData(rawContent);

  if (tableData) {
    // 테이블 렌더링
    const headerRow: PptxTableCell[] = tableData.headers.map((h) => ({
      text: h,
      options: {
        bold: true,
        fontSize: design.bodyFontSize - 1,
        fontFace: design.fontFamily,
        color: "FFFFFF",
        fill: { color: design.primaryColor },
        align: "center",
        valign: "middle",
      },
    }));

    const dataRows: PptxTableCell[][] = tableData.rows.map((row, ri) =>
      row.map((cell) => ({
        text: cell,
        options: {
          fontSize: design.bodyFontSize - 1,
          fontFace: design.fontFamily,
          color: design.textColor,
          fill: { color: ri % 2 === 0 ? "F9FAFB" : "FFFFFF" },
          valign: "middle",
        },
      })),
    );

    slide.addTable([headerRow, ...dataRows], {
      x: MARGIN,
      y: BODY_TOP + 0.2,
      w: CONTENT_WIDTH,
      colW: Array(tableData.headers.length).fill(
        CONTENT_WIDTH / tableData.headers.length,
      ),
      rowH: 0.45,
      border: { type: "solid", pt: 0.5, color: "E5E7EB" },
      autoPage: false,
    });

    // 테이블 아래 추가 텍스트 (테이블 이후 내용)
    const afterTable = rawContent
      .split("\n")
      .filter((l) => !l.trim().startsWith("|") && !l.trim().startsWith("---"))
      .filter((l) => l.trim())
      .join("\n");
    if (afterTable.trim()) {
      const totalTableH =
        BODY_TOP + 0.2 + (1 + tableData.rows.length) * 0.45 + 0.3;
      const remainH = 7.0 - totalTableH;
      if (remainH > 0.5) {
        slide.addText(afterTable, {
          x: MARGIN,
          y: totalTableH,
          w: CONTENT_WIDTH,
          h: remainH,
          fontSize: design.bodyFontSize - 1,
          fontFace: design.fontFamily,
          color: design.textColor,
          valign: "top",
          lineSpacingMultiple: 1.3,
        });
      }
    }
  } else {
    // 테이블 없으면 배경 박스 + 텍스트 (기존 방식 개선)
    slide.addShape("rect", {
      x: MARGIN,
      y: BODY_TOP,
      w: CONTENT_WIDTH,
      h: BODY_HEIGHT,
      fill: { color: "F9FAFB" },
      rectRadius: 0.1,
    });
    const blocks = parseContentBlocks(rawContent);
    renderRichText(slide, blocks, {
      x: MARGIN + 0.2,
      y: BODY_TOP + 0.2,
      w: CONTENT_WIDTH - 0.4,
      h: BODY_HEIGHT - 0.4,
      design,
    });
  }
}

function renderScenarioSlide(
  slide: PptxSlide,
  paragraphs: string[],
  design: PptxDesignConfig,
): void {
  const cards = paragraphs.slice(0, 3);
  const cardCount = Math.max(cards.length, 1);
  const cardW = Math.min(3.8, (CONTENT_WIDTH - 0.3 * (cardCount - 1)) / cardCount);
  const gap = 0.3;
  const totalWidth = cardW * cardCount + gap * (cardCount - 1);
  const startX = (SLIDE_WIDTH - totalWidth) / 2;

  const scenarioLabels = ["시나리오 A", "시나리오 B", "시나리오 C"];

  cards.forEach((card, i) => {
    const x = startX + i * (cardW + gap);

    // 카드 배경
    slide.addShape("rect", {
      x,
      y: 1.5,
      w: cardW,
      h: 5.2,
      fill: { color: "F9FAFB" },
      rectRadius: 0.12,
    });

    // 카드 상단 라벨
    slide.addShape("rect", {
      x,
      y: 1.5,
      w: cardW,
      h: 0.5,
      fill: { color: design.primaryColor },
      rectRadius: 0,
    });
    slide.addText(scenarioLabels[i] || `시나리오 ${i + 1}`, {
      x,
      y: 1.5,
      w: cardW,
      h: 0.5,
      fontSize: 12,
      fontFace: design.fontFamily,
      color: "FFFFFF",
      bold: true,
      align: "center",
      valign: "middle",
    });

    // 카드 내용
    slide.addText(card, {
      x: x + 0.2,
      y: 2.2,
      w: cardW - 0.4,
      h: 4.3,
      fontSize: design.bodyFontSize - 1,
      fontFace: design.fontFamily,
      color: design.textColor,
      valign: "top",
      lineSpacingMultiple: 1.3,
    });
  });
}

function renderRoadmapSlide(
  slide: PptxSlide,
  paragraphs: string[],
  design: PptxDesignConfig,
): void {
  const phases = ["단기 (6개월)", "중기 (1년)", "장기 (2년+)"];
  const phaseW = 3.8;
  const gap = 0.3;
  const startX = (SLIDE_WIDTH - phaseW * 3 - gap * 2) / 2;

  // 타임라인 연결 바
  slide.addShape("rect", {
    x: startX + 0.5,
    y: 1.75,
    w: phaseW * 3 + gap * 2 - 1.0,
    h: 0.06,
    fill: { color: design.primaryColor },
  });

  phases.forEach((phase, i) => {
    const x = startX + i * (phaseW + gap);

    // 페이즈 라벨 (원형 느낌)
    slide.addShape("rect", {
      x,
      y: 1.4,
      w: phaseW,
      h: 0.7,
      fill: { color: design.primaryColor },
      rectRadius: 0.08,
    });
    slide.addText(phase, {
      x,
      y: 1.4,
      w: phaseW,
      h: 0.7,
      fontSize: 12,
      fontFace: design.fontFamily,
      color: "FFFFFF",
      bold: true,
      align: "center",
      valign: "middle",
    });

    // 내용 카드
    slide.addShape("rect", {
      x,
      y: 2.3,
      w: phaseW,
      h: 4.3,
      fill: { color: "F9FAFB" },
      rectRadius: 0.08,
    });
    slide.addText(paragraphs[i] || "", {
      x: x + 0.15,
      y: 2.5,
      w: phaseW - 0.3,
      h: 3.9,
      fontSize: design.bodyFontSize - 1,
      fontFace: design.fontFamily,
      color: design.textColor,
      valign: "top",
      lineSpacingMultiple: 1.3,
    });

    // 화살표
    if (i < 2) {
      slide.addText("\u25B6", {
        x: x + phaseW,
        y: 3.8,
        w: gap,
        h: 0.5,
        fontSize: 14,
        color: design.primaryColor,
        align: "center",
        bold: true,
      });
    }
  });
}

function renderOrgSlide(
  slide: PptxSlide,
  rawContent: string,
  design: PptxDesignConfig,
): void {
  // 테이블 파싱 시도 (투자 계획 등)
  const tableData = parseTableData(rawContent);

  if (tableData) {
    // 테이블 상단에 요약 텍스트
    const nonTableLines = rawContent
      .split("\n")
      .filter((l) => !l.trim().startsWith("|") && !l.trim().startsWith("---"))
      .filter((l) => l.trim())
      .join("\n");

    if (nonTableLines.trim()) {
      slide.addText(nonTableLines, {
        x: MARGIN,
        y: BODY_TOP,
        w: CONTENT_WIDTH,
        h: 1.5,
        fontSize: design.bodyFontSize,
        fontFace: design.fontFamily,
        color: design.textColor,
        valign: "top",
        lineSpacingMultiple: 1.4,
      });
    }

    const tableY = nonTableLines.trim() ? 3.0 : BODY_TOP + 0.2;
    const headerRow: PptxTableCell[] = tableData.headers.map((h) => ({
      text: h,
      options: {
        bold: true,
        fontSize: design.bodyFontSize - 1,
        fontFace: design.fontFamily,
        color: "FFFFFF",
        fill: { color: design.primaryColor },
        align: "center",
        valign: "middle",
      },
    }));
    const dataRows: PptxTableCell[][] = tableData.rows.map((row, ri) =>
      row.map((cell) => ({
        text: cell,
        options: {
          fontSize: design.bodyFontSize - 1,
          fontFace: design.fontFamily,
          color: design.textColor,
          fill: { color: ri % 2 === 0 ? "F9FAFB" : "FFFFFF" },
          valign: "middle",
        },
      })),
    );
    slide.addTable([headerRow, ...dataRows], {
      x: MARGIN,
      y: tableY,
      w: CONTENT_WIDTH,
      colW: Array(tableData.headers.length).fill(
        CONTENT_WIDTH / tableData.headers.length,
      ),
      rowH: 0.45,
      border: { type: "solid", pt: 0.5, color: "E5E7EB" },
      autoPage: false,
    });
  } else {
    // 테이블 없으면 2단 레이아웃 (조직체계 좌 / 투자계획 우)
    const blocks = parseContentBlocks(rawContent);
    const half = Math.ceil(blocks.length / 2);

    // 좌측
    slide.addShape("rect", {
      x: MARGIN,
      y: BODY_TOP,
      w: 5.9,
      h: BODY_HEIGHT,
      fill: { color: "F9FAFB" },
      rectRadius: 0.08,
    });
    renderRichText(slide, blocks.slice(0, half), {
      x: MARGIN + 0.2,
      y: BODY_TOP + 0.2,
      w: 5.5,
      h: BODY_HEIGHT - 0.4,
      design,
    });

    // 우측
    slide.addShape("rect", {
      x: 6.8,
      y: BODY_TOP,
      w: 5.9,
      h: BODY_HEIGHT,
      fill: { color: "F9FAFB" },
      rectRadius: 0.08,
    });
    renderRichText(slide, blocks.slice(half), {
      x: 7.0,
      y: BODY_TOP + 0.2,
      w: 5.5,
      h: BODY_HEIGHT - 0.4,
      design,
    });
  }
}

function renderImpactSlide(
  slide: PptxSlide,
  paragraphs: string[],
  design: PptxDesignConfig,
): void {
  // 최대 표시 가능 항목 수 계산
  const itemH = 0.9;
  const gap = 0.15;
  const maxItems = Math.floor((BODY_HEIGHT + gap) / (itemH + gap));
  const items = paragraphs.slice(0, maxItems);

  items.forEach((p, i) => {
    const y = BODY_TOP + i * (itemH + gap);

    // 번호 배지
    slide.addShape("rect", {
      x: MARGIN,
      y: y + 0.1,
      w: 0.6,
      h: 0.6,
      fill: { color: design.dataPositive },
      rectRadius: 0.3,
    });
    slide.addText(String(i + 1), {
      x: MARGIN,
      y: y + 0.1,
      w: 0.6,
      h: 0.6,
      fontSize: 14,
      fontFace: design.fontFamily,
      color: "FFFFFF",
      bold: true,
      align: "center",
      valign: "middle",
    });

    // 항목 배경
    slide.addShape("rect", {
      x: MARGIN + 0.8,
      y,
      w: CONTENT_WIDTH - 0.8,
      h: itemH,
      fill: { color: i % 2 === 0 ? lightenColor(design.dataPositive, 0.92) : "F9FAFB" },
      rectRadius: 0.06,
    });

    // 항목 텍스트
    slide.addText(p, {
      x: MARGIN + 1.0,
      y,
      w: CONTENT_WIDTH - 1.2,
      h: itemH,
      fontSize: design.bodyFontSize,
      fontFace: design.fontFamily,
      color: design.textColor,
      valign: "middle",
      lineSpacingMultiple: 1.2,
    });
  });
}

function renderStrategySlide(
  slide: PptxSlide,
  blocks: ContentBlock[],
  rawContent: string,
  design: PptxDesignConfig,
): void {
  // 테이블이 있으면 테이블 렌더링
  const tableData = parseTableData(rawContent);

  if (tableData) {
    renderDataSlide(slide, rawContent, design);
    return;
  }

  // 3단 구조 시도 (KT연계 GTM은 보통 전략 3~4개)
  const headings = blocks.filter((b) => b.type === "heading");
  if (headings.length >= 3) {
    // 카드 레이아웃
    const cardW = 3.8;
    const gap = 0.3;
    const cardCount = Math.min(headings.length, 3);
    const startX =
      (SLIDE_WIDTH - cardW * cardCount - gap * (cardCount - 1)) / 2;

    // 각 heading별 블록 그룹핑
    let currentGroup: ContentBlock[] = [];
    const groups: ContentBlock[][] = [];
    for (const b of blocks) {
      if (b.type === "heading" && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [b];
      } else {
        currentGroup.push(b);
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    groups.slice(0, 3).forEach((group, i) => {
      const x = startX + i * (cardW + gap);

      slide.addShape("rect", {
        x,
        y: BODY_TOP,
        w: cardW,
        h: BODY_HEIGHT,
        fill: { color: "F9FAFB" },
        rectRadius: 0.08,
      });
      slide.addShape("rect", {
        x,
        y: BODY_TOP,
        w: cardW,
        h: 0.06,
        fill: { color: design.primaryColor },
      });

      renderRichText(slide, group, {
        x: x + 0.15,
        y: BODY_TOP + 0.2,
        w: cardW - 0.3,
        h: BODY_HEIGHT - 0.4,
        design,
        fontSize: design.bodyFontSize - 1,
      });
    });
  } else {
    // fallback: 리치 텍스트 렌더
    renderRichText(slide, blocks, {
      x: MARGIN,
      y: BODY_TOP,
      w: CONTENT_WIDTH,
      h: BODY_HEIGHT,
      design,
    });
  }
}

function addClosingSlide(
  pres: PptxPres,
  offering: OfferingRow,
  design: PptxDesignConfig,
): void {
  const slide = pres.addSlide();
  slide.background = { color: design.primaryColor };

  // 상단 악센트
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: SLIDE_WIDTH,
    h: 0.08,
    fill: { color: "FFFFFF" },
  });

  slide.addText("감사합니다", {
    x: MARGIN,
    y: 2.2,
    w: CONTENT_WIDTH,
    h: 1.5,
    fontSize: 36,
    fontFace: design.fontFamily,
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle",
  });

  // 구분선
  slide.addShape("rect", {
    x: 4.5,
    y: 4.0,
    w: 4.33,
    h: 0.02,
    fill: { color: "E0E7FF" },
  });

  slide.addText(`${offering.title}\nkt ds AX사업개발팀`, {
    x: MARGIN,
    y: 4.3,
    w: CONTENT_WIDTH,
    h: 1.5,
    fontSize: 16,
    fontFace: design.fontFamily,
    color: "E0E7FF",
    align: "center",
    lineSpacingMultiple: 1.6,
  });

  slide.addNotes("Q&A 시간. 추가 논의가 필요한 사항을 정리해 주세요.");
}
