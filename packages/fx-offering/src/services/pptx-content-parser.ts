/**
 * C9: PPTX 콘텐츠 파서
 * 마크다운/구조화 텍스트 → 슬라이드 렌더링용 구조화 데이터 변환
 */

// ── Types ──────────────────────────────────────

export interface ContentBlock {
  type: "text" | "heading" | "bullet" | "bold";
  text: string;
  level?: number; // heading level (1-3), bullet indent level (0-2)
}

export interface KpiItem {
  label: string;
  value: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

// ── Content Block Parser ──────────────────────

/**
 * 마크다운 콘텐츠를 ContentBlock[]으로 파싱.
 * 지원: 헤딩(#), 불릿(- / *), 볼드(**text**), 일반 텍스트
 */
export function parseContentBlocks(content: string): ContentBlock[] {
  if (!content.trim()) return [];

  const blocks: ContentBlock[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 헤딩
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      blocks.push({
        type: "heading",
        text: headingMatch[2],
        level: headingMatch[1].length,
      });
      continue;
    }

    // 불릿 (-, *, 숫자.)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch && bulletMatch[1]) {
      const indent = line.search(/\S/);
      blocks.push({
        type: "bullet",
        text: stripInlineMarkdown(bulletMatch[1]),
        level: indent >= 4 ? 1 : 0,
      });
      continue;
    }

    // 번호 리스트
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numberedMatch && numberedMatch[1]) {
      blocks.push({
        type: "bullet",
        text: stripInlineMarkdown(numberedMatch[1]),
        level: 0,
      });
      continue;
    }

    // 테이블 행은 스킵 (parseTableData에서 처리)
    if (trimmed.startsWith("|") || /^[-:| ]+$/.test(trimmed)) continue;

    // 전체가 볼드인 줄
    const boldMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (boldMatch && boldMatch[1]) {
      blocks.push({ type: "bold", text: boldMatch[1] });
      continue;
    }

    // 일반 텍스트
    blocks.push({ type: "text", text: stripInlineMarkdown(trimmed) });
  }

  return blocks;
}

// ── KPI Parser ────────────────────────────────

/**
 * KPI 텍스트에서 수치와 라벨을 분리.
 * 지원 패턴:
 *   "약 150억원 (3개년 매출 목표)"  → { value: "약 150억원", label: "3개년 매출 목표" }
 *   "ROI 340% — 투자 대비 수익률"   → { value: "ROI 340%", label: "투자 대비 수익률" }
 *   "5개 PoC 고객사 확보"            → { value: "5개", label: "PoC 고객사 확보" }
 */
export function parseKpiItems(paragraphs: string[]): KpiItem[] {
  return paragraphs.map((p) => {
    const trimmed = p.trim();

    // 패턴 1: "수치 (설명)" 또는 "수치 — 설명"
    const parenMatch = trimmed.match(
      /^(.+?)\s*[(\u2014\u2013\-:]\s*(.+?)[)]*$/,
    );
    if (parenMatch && parenMatch[1] && parenMatch[2] && hasNumber(parenMatch[1])) {
      return {
        value: parenMatch[1].trim(),
        label: parenMatch[2].replace(/\)$/, "").trim(),
      };
    }

    // 패턴 2: 첫 번째 숫자 토큰 추출
    const numMatch = trimmed.match(
      /^((?:약\s*)?[\d,.]+\s*(?:억원|만원|원|%|개|건|명|배|조원)?)/,
    );
    if (numMatch && numMatch[0] && numMatch[1]) {
      return {
        value: numMatch[1].trim(),
        label: trimmed.slice(numMatch[0].length).trim(),
      };
    }

    // 패턴 3: "KEY VALUE" (예: "ROI 340%")
    const kvMatch = trimmed.match(
      /^([A-Z][A-Za-z/]+)\s+([\d,.]+\s*(?:%|억원|만원|원|배|개)?)(.*)$/,
    );
    if (kvMatch && kvMatch[1] && kvMatch[2] && kvMatch[3] !== undefined) {
      return {
        value: `${kvMatch[1]} ${kvMatch[2]}`.trim(),
        label: kvMatch[3].trim().replace(/^[\s\-—:]+/, ""),
      };
    }

    // fallback: 전체를 라벨로
    return { value: trimmed, label: "" };
  });
}

// ── Table Parser ──────────────────────────────

/**
 * 마크다운 테이블을 파싱.
 * | 헤더1 | 헤더2 |
 * |-------|-------|
 * | 값1   | 값2   |
 */
export function parseTableData(content: string): TableData | null {
  const lines = content.split("\n").filter((l) => l.trim());
  const tableLines = lines.filter((l) => l.trim().startsWith("|"));
  if (tableLines.length < 3) return null; // 최소 헤더 + 구분선 + 1행

  // 구분선 찾기
  const separatorIdx = tableLines.findIndex((l) =>
    /^\|[\s\-:| ]+\|$/.test(l.trim()),
  );
  if (separatorIdx < 1) return null;

  const parseRow = (line: string): string[] =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

  const headerLine = tableLines[separatorIdx - 1];
  if (!headerLine) return null;
  const headers = parseRow(headerLine);
  if (headers.length === 0) return null;

  const rows: string[][] = [];
  for (let i = separatorIdx + 1; i < tableLines.length; i++) {
    const rowLine = tableLines[i];
    if (!rowLine) continue;
    const cells = parseRow(rowLine);
    if (cells.length > 0) {
      // 컬럼 수 맞추기
      while (cells.length < headers.length) cells.push("");
      rows.push(cells.slice(0, headers.length));
    }
  }

  if (rows.length === 0) return null;
  return { headers, rows };
}

// ── Bullet Parser ─────────────────────────────

/**
 * 텍스트에서 불릿 항목 추출 (- 또는 * 접두어)
 * 불릿이 없으면 문장 단위로 분리
 */
export function parseBulletItems(content: string): string[] {
  const lines = content.split("\n").filter((l) => l.trim());
  const bullets = lines
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim());

  if (bullets.length > 0) return bullets;

  // 불릿이 없으면 paragraph 단위
  return content
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
}

// ── Helpers ───────────────────────────────────

/** 인라인 마크다운 제거 (**, *, `, [link](url)) */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)]\(.*?\)/g, "$1");
}

function hasNumber(s: string): boolean {
  return /\d/.test(s);
}
