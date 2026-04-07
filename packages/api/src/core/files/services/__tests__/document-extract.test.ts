/**
 * F443: 문서 기반 아이템 추출 서비스 단위 테스트 (Sprint 214)
 */
import { describe, it, expect, vi } from "vitest";
import { DocumentExtractService } from "../document-extract-service.js";
import type { Ai } from "@cloudflare/workers-types";

// Workers AI mock
function makeAi(response: string): Ai {
  return {
    run: vi.fn().mockResolvedValue({ response }),
  } as unknown as Ai;
}

describe("DocumentExtractService", () => {
  const svc = new DocumentExtractService();

  describe("extractItemInfo", () => {
    it("빈 배열이면 빈 결과 반환", async () => {
      const ai = makeAi("");
      const result = await svc.extractItemInfo(ai, []);
      expect(result.title).toBe("");
      expect(result.description).toBe("");
      expect(result.confidence).toBe(0);
    });

    it("Workers AI가 JSON을 반환하면 파싱", async () => {
      const ai = makeAi('{"title":"AI 기반 사내 지식 관리","description":"임직원의 내부 문서를 AI로 검색하는 시스템","confidence":0.9}');
      const result = await svc.extractItemInfo(ai, [
        { filename: "test.pdf", content_text: "내용" },
      ]);
      expect(result.title).toBe("AI 기반 사내 지식 관리");
      expect(result.description).toContain("임직원");
      expect(result.confidence).toBe(0.9);
    });

    it("JSON이 텍스트 안에 섞여 있어도 파싱", async () => {
      const ai = makeAi('결과입니다: {"title":"추출 제목","description":"추출 설명","confidence":0.8} 끝');
      const result = await svc.extractItemInfo(ai, [
        { filename: "doc.docx", content_text: "문서 내용" },
      ]);
      expect(result.title).toBe("추출 제목");
    });

    it("Workers AI가 유효하지 않은 JSON 반환 시 파일명으로 fallback", async () => {
      const ai = makeAi("유효하지 않은 응답");
      const result = await svc.extractItemInfo(ai, [
        { filename: "사업기획서_v2.pdf", content_text: "내용" },
      ]);
      expect(result.title).toBe("사업기획서_v2");
      expect(result.confidence).toBe(0.1);
    });

    it("Workers AI 예외 시 파일명으로 fallback", async () => {
      const ai = { run: vi.fn().mockRejectedValue(new Error("AI 오류")) } as unknown as Ai;
      const result = await svc.extractItemInfo(ai, [
        { filename: "proposal.pptx", content_text: "내용" },
      ]);
      expect(result.title).toBe("proposal");
      expect(result.confidence).toBe(0.1);
    });

    it("제목을 100자로 슬라이싱", async () => {
      const longTitle = "A".repeat(150);
      const ai = makeAi(`{"title":"${longTitle}","description":"설명","confidence":0.5}`);
      const result = await svc.extractItemInfo(ai, [{ filename: "f.pdf", content_text: "x" }]);
      expect(result.title.length).toBeLessThanOrEqual(100);
    });

    it("최대 3개 문서만 처리", async () => {
      const ai = makeAi('{"title":"제목","description":"설명","confidence":0.7}');
      const docs = Array.from({ length: 5 }, (_, i) => ({
        filename: `doc${i}.pdf`,
        content_text: "x",
      }));
      await svc.extractItemInfo(ai, docs);
      const callArgs = (ai.run as ReturnType<typeof vi.fn>).mock.calls[0] as [string, { prompt: string }];
      const prompt = callArgs[1].prompt;
      // 최대 3개 파일명만 포함
      expect((prompt.match(/\[doc/g) ?? []).length).toBeLessThanOrEqual(3);
    });
  });
});
