/**
 * F442: 문서 파싱 서비스 단위 테스트 (Sprint 213)
 * Workers 환경 의존 없는 순수 함수 테스트
 */
import { describe, it, expect, vi } from "vitest";
import { DocumentParserService } from "../document-parser-service.js";

// JSZip mock — 실제 zip 파일 없이 파싱 로직만 테스트
vi.mock("jszip", () => ({
  default: {
    loadAsync: vi.fn().mockResolvedValue({
      files: {
        "ppt/slides/slide1.xml": {
          async: async () => `
            <p:sld><p:sp><p:ph idx="0"/><a:t>제목 슬라이드</a:t></p:sp>
            <a:t>본문 텍스트 1</a:t><a:t>본문 텍스트 2</a:t></p:sld>
          `,
        },
        "ppt/slides/slide2.xml": {
          async: async () => `
            <p:sld><a:t>슬라이드 2 내용</a:t></p:sld>
          `,
        },
        "word/document.xml": {
          async: async () => `
            <w:document>
              <w:body>
                <w:p><w:t>첫 번째 단락</w:t></w:p>
                <w:p><w:t>두 번째 단락</w:t></w:p>
              </w:body>
            </w:document>
          `,
        },
      },
    }),
  },
}));

const parser = new DocumentParserService();

describe("F442: PPTX 파싱", () => {
  it("슬라이드별 텍스트를 추출한다", async () => {
    const result = await parser.parsePptx(new ArrayBuffer(8));

    expect(result.page_count).toBe(2);
    expect(result.content_structured.type).toBe("slides");
    expect(result.content_structured.items).toHaveLength(2);
    expect(result.content_text).toContain("본문 텍스트 1");
    expect(result.content_text).toContain("슬라이드 2 내용");
  });
});

describe("F442: DOCX 파싱", () => {
  it("단락별 텍스트를 추출한다", async () => {
    const result = await parser.parseDocx(new ArrayBuffer(8));

    expect(result.content_text).toContain("첫 번째 단락");
    expect(result.content_text).toContain("두 번째 단락");
    expect(result.content_structured.type).toBe("paragraphs");
  });
});

describe("F442: PDF 파싱 (텍스트 레이어)", () => {
  it("텍스트 없는 빈 버퍼는 빈 결과 반환", async () => {
    const result = await parser.parsePdf(new ArrayBuffer(0));
    expect(result.page_count).toBe(0);
    expect(result.content_structured.items).toHaveLength(0);
  });

  it("텍스트 레이어가 있는 PDF는 텍스트 추출", async () => {
    // BT ... Tj ... ET 패턴을 포함하는 mock buffer (50자 이상 필요)
    const words = Array.from({ length: 20 }, (_, i) => `Word${i}`).join(" ");
    const pdfContent = `BT (${words})Tj ET BT (Second Paragraph Content Here)Tj ET`;
    const encoder = new TextEncoder();
    const buffer = encoder.encode(pdfContent).buffer;

    const result = await parser.parsePdf(buffer);
    expect(result.content_text).toContain("Word0");
    expect(result.content_text).toContain("Second Paragraph");
  });
});
