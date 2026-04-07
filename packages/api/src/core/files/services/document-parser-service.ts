/**
 * F442: 문서 파싱 서비스 (Sprint 213)
 * PDF/PPTX/DOCX → 텍스트 추출 (Workers 환경 최적화)
 *
 * Workers CPU 제한 (128ms) 고려:
 * - PPTX/DOCX: JSZip 기반 XML 직접 파싱 (mammoth은 Node.js only)
 * - PDF: 텍스트 기반 추출 시도 → 실패 시 Workers AI fallback
 */
import type { ParseResult, ContentStructured } from "../schemas/parsed-document.js";

// JSZip은 Workers 환경 호환 (순수 JS)
// 실제 배포 시 package.json에 "jszip": "^3.10.1" 추가 필요
type ZipEntry = { async(type: "string"): Promise<string> };
type ZipFiles = Record<string, ZipEntry>;

async function loadJSZip(buffer: ArrayBuffer): Promise<{ files: ZipFiles }> {
  // Workers 환경에서 동적 import
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JSZip = ((await import("jszip" as string)) as any).default;
  return JSZip.loadAsync(buffer) as Promise<{ files: ZipFiles }>;
}

export class DocumentParserService {
  /**
   * PPTX 파싱: ppt/slides/slide*.xml의 <a:t> 태그 추출
   */
  async parsePptx(buffer: ArrayBuffer): Promise<ParseResult> {
    const zip = await loadJSZip(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? "0", 10);
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? "0", 10);
        return numA - numB;
      });

    const items = await Promise.all(
      slideFiles.map(async (name, index) => {
        const entry = zip.files[name];
        const xml = entry ? await entry.async("string") : "";
        const title = this.extractXmlText(xml, "a:t") ?? "";
        const text = this.extractAllText(xml, "a:t");
        return { index: index + 1, text, title };
      }),
    );

    const content_text = items.map((s) => s.text).join("\n\n");
    const content_structured: ContentStructured = { type: "slides", items };

    return { content_text, content_structured, page_count: items.length };
  }

  /**
   * DOCX 파싱: word/document.xml의 <w:t> 태그 추출
   */
  async parseDocx(buffer: ArrayBuffer): Promise<ParseResult> {
    const zip = await loadJSZip(buffer);
    const docEntry = zip.files["word/document.xml"];
    const docXml = docEntry ? await docEntry.async("string") : "";
    const text = this.extractAllText(docXml, "w:t");

    // 단락 분리: <w:p> 태그 기준
    const paragraphs = docXml
      .split(/<w:p[ >]/)
      .slice(1)
      .map((p, index) => ({
        index: index + 1,
        text: this.extractAllText(`<w:p ${p ?? ""}`, "w:t"),
      }))
      .filter((p) => p.text.trim().length > 0);

    const content_structured: ContentStructured = { type: "paragraphs", items: paragraphs };

    return { content_text: text, content_structured, page_count: paragraphs.length };
  }

  /**
   * PDF 파싱: 텍스트 레이어 추출 시도
   * Workers 환경에서 pdf-parse는 CPU 제한 초과 가능 → 기본 텍스트 추출 후 AI fallback
   */
  async parsePdf(buffer: ArrayBuffer, ai?: Ai): Promise<ParseResult> {
    // PDF 내 텍스트 스트림 직접 추출 (BT...ET 블록)
    const text = this.extractPdfText(buffer);

    if (text.trim().length > 50) {
      const pages = text.split(/\f/).filter((p) => p.trim().length > 0);
      const items = pages.map((text, index) => ({ index: index + 1, text: text.trim() }));
      return {
        content_text: text,
        content_structured: { type: "pages", items },
        page_count: pages.length,
      };
    }

    // 텍스트 추출 실패 시 Workers AI fallback (스캔 PDF 등)
    if (ai) {
      return this.parsePdfWithAi(buffer, ai);
    }

    return {
      content_text: "(PDF 텍스트 추출 불가 — 이미지 기반 PDF일 수 있어요)",
      content_structured: { type: "pages", items: [] },
      page_count: 0,
    };
  }

  /**
   * PDF 텍스트 스트림 직접 추출 (pdf-parse 없이)
   * PDF 스펙: BT ... Tj/TJ ... ET 블록 내 텍스트
   */
  private extractPdfText(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const raw = new TextDecoder("latin1").decode(bytes);

    const textBlocks: string[] = [];
    const regex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(raw)) !== null) {
      const block = match[0] ?? "";
      // Tj 연산자: (text)Tj
      const tjMatches = block.matchAll(/\(([^)]*)\)\s*Tj/g);
      for (const m of tjMatches) {
        if (m[1] != null) textBlocks.push(m[1]);
      }
      // TJ 연산자: [(text)]TJ
      const tjArrMatches = block.matchAll(/\[([^\]]*)\]\s*TJ/g);
      for (const m of tjArrMatches) {
        const inner = (m[1] ?? "").matchAll(/\(([^)]*)\)/g);
        for (const im of inner) {
          if (im[1] != null) textBlocks.push(im[1]);
        }
      }
    }

    return textBlocks
      .join(" ")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .trim();
  }

  private async parsePdfWithAi(buffer: ArrayBuffer, ai: Ai): Promise<ParseResult> {
    // Workers AI를 통한 텍스트 추출 (fallback)
    const base64 = Buffer.from(buffer).toString("base64");
    try {
      const result = await (ai as unknown as { run: (model: string, input: object) => Promise<{ response?: string }> }).run(
        "@cf/facebook/bart-large-cnn",
        { input_text: base64.slice(0, 2000), max_length: 512 },
      );
      const text = result?.response ?? "";
      return {
        content_text: text,
        content_structured: { type: "pages", items: [{ index: 1, text }] },
        page_count: 1,
      };
    } catch {
      return {
        content_text: "(AI 파싱 실패)",
        content_structured: { type: "pages", items: [] },
        page_count: 0,
      };
    }
  }

  /**
   * XML에서 특정 태그 텍스트 전체 추출
   */
  private extractAllText(xml: string, tag: string): string {
    const localTag = tag.split(":")[1] ?? tag;
    const results: string[] = [];
    const regex = new RegExp(`<[^>]*:?${localTag}[^>]*>([^<]*)<`, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      const text = match[1];
      if (text != null && text.trim()) results.push(text);
    }
    return results.join(" ").trim();
  }

  private extractXmlText(xml: string, _selector: string): string | undefined {
    // 간단한 첫 번째 텍스트 추출 (selector 무시, 제목 태그만)
    const match = xml.match(/<p:sp>[\s\S]*?<p:ph[^>]*idx="0"[\s\S]*?<a:t>([^<]+)<\/a:t>/);
    return match?.[1] ?? undefined;
  }
}

export const documentParserService = new DocumentParserService();
