/**
 * F442: 문서 파싱 결과 타입 (Sprint 213)
 */

export interface ParsedItem {
  index: number;
  text: string;
  title?: string;
}

export interface ContentStructured {
  type: "slides" | "paragraphs" | "pages";
  items: ParsedItem[];
}

export interface ParseResult {
  content_text: string;
  content_structured: ContentStructured;
  page_count: number;
}

export interface ParsedDocument {
  id: string;
  file_id: string;
  content_text: string;
  content_structured: string; // JSON string in D1
  page_count: number;
  parsed_at: number;
}
