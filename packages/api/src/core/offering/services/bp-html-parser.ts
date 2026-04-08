/**
 * Sprint 220 F454: 사업기획서 HTML 파서
 * <h1>~<h3> 헤더 기반 섹션 분리 → 키워드 매핑으로 섹션명 정규화
 */

export interface ParsedBpSection {
  sectionName: string;
  sectionKey: BpSectionKey;
  content: string;
  confidence: number;
}

export type BpSectionKey = "purpose" | "target" | "market" | "technology" | "scope" | "timeline" | "risk" | "other";

export interface ParsedBusinessPlan {
  title: string;
  sections: ParsedBpSection[];
  rawText: string;
}

// 키워드 → 섹션 매핑
const SECTION_KEYWORD_MAP: Array<{ key: BpSectionKey; label: string; keywords: string[] }> = [
  { key: "purpose",    label: "프로젝트 개요", keywords: ["목적", "배경", "개요", "소개", "필요성", "추진"] },
  { key: "target",     label: "타깃 고객",    keywords: ["고객", "타깃", "대상", "사용자", "페르소나", "customer"] },
  { key: "market",     label: "시장 분석",    keywords: ["시장", "규모", "tam", "sam", "som", "성장", "경쟁"] },
  { key: "technology", label: "기술 요건",    keywords: ["기술", "아키텍처", "스택", "stack", "인프라", "개발", "tech"] },
  { key: "scope",      label: "기능 범위",    keywords: ["범위", "기능", "요구사항", "feature", "mvp", "스펙"] },
  { key: "timeline",   label: "일정",         keywords: ["일정", "로드맵", "마일스톤", "roadmap", "milestone", "계획"] },
  { key: "risk",       label: "리스크",       keywords: ["리스크", "위험", "제약", "risk", "제한", "규제", "이슈"] },
];

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s{2,}/g, " ").trim();
}

function detectSectionKey(heading: string): { key: BpSectionKey; label: string; confidence: number } | null {
  const lower = heading.toLowerCase();
  for (const { key, label, keywords } of SECTION_KEYWORD_MAP) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return { key, label, confidence: 0.9 };
      }
    }
  }
  return null;
}

/**
 * 헤더 기반 HTML 파싱 (h1/h2/h3 분리)
 */
function parseByHeaders(html: string): Array<{ heading: string; body: string }> {
  const headerRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  const sections: Array<{ heading: string; body: string; startIdx: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(html)) !== null) {
    const headingText = match[1] ?? "";
    sections.push({
      heading: stripHtmlTags(headingText),
      body: "",
      startIdx: match.index + match[0].length,
    });
  }

  // 각 헤더 이후 ~ 다음 헤더까지의 body 추출
  for (let i = 0; i < sections.length; i++) {
    const curr = sections[i];
    if (!curr) continue;
    const start = curr.startIdx;
    const next = sections[i + 1];
    const end = next ? next.startIdx - next.heading.length - 10 : html.length;
    const bodyHtml = html.slice(start, end);
    curr.body = stripHtmlTags(bodyHtml).trim();
  }

  return sections.map(({ heading, body }) => ({ heading, body }));
}

/**
 * 폴백: 줄바꿈 기반 단락 분리
 */
function parseByParagraphs(text: string): Array<{ heading: string; body: string }> {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 20);
  return paragraphs.slice(0, 10).map((p, i) => ({
    heading: `단락 ${i + 1}`,
    body: p.trim(),
  }));
}

export class BpHtmlParser {
  /**
   * 사업기획서 HTML을 구조화된 섹션으로 파싱.
   * 전략:
   * 1. <h1>~<h3> 헤더 기반 섹션 분리
   * 2. 키워드 매칭으로 섹션명 정규화
   * 3. 실패 시 단락 기반 폴백
   */
  parse(html: string): ParsedBusinessPlan {
    const rawText = stripHtmlTags(html);

    // 제목 추출 (첫 번째 h1 또는 title 태그)
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1] ? stripHtmlTags(titleMatch[1]) : "사업기획서";

    // 헤더 기반 파싱 시도
    let rawSections = parseByHeaders(html);

    // 헤더 없으면 단락 폴백
    if (rawSections.length === 0) {
      rawSections = parseByParagraphs(rawText);
    }

    // 섹션 키 매핑
    const sections: ParsedBpSection[] = [];
    for (const { heading, body } of rawSections) {
      if (!body || body.length < 5) continue;
      const detected = detectSectionKey(heading);
      if (detected) {
        sections.push({
          sectionName: detected.label,
          sectionKey: detected.key,
          content: body,
          confidence: detected.confidence,
        });
      } else {
        // 매핑 실패 — other로 저장 (LLM 전달용)
        sections.push({
          sectionName: heading,
          sectionKey: "other",
          content: body,
          confidence: 0.3,
        });
      }
    }

    return { title, sections, rawText };
  }

  /**
   * 표준 섹션 7종(purpose~risk) 중 파싱된 섹션 수 반환
   */
  countStandardSections(parsed: ParsedBusinessPlan): number {
    const standardKeys: BpSectionKey[] = ["purpose", "target", "market", "technology", "scope", "timeline", "risk"];
    const foundKeys = new Set(parsed.sections.map((s) => s.sectionKey));
    return standardKeys.filter((k) => foundKeys.has(k)).length;
  }
}
