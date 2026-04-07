// F431: OgdFeedbackConverterService 유닛 테스트 (Sprint 207)
import { describe, it, expect, vi } from "vitest";
import { OgdFeedbackConverterService } from "../core/harness/services/ogd-feedback-converter.js";

function makeAi(response: string) {
  return {
    run: vi.fn().mockResolvedValue({ response }),
  } as unknown as Ai;
}

describe("OgdFeedbackConverterService", () => {
  describe("convert()", () => {
    it("LLM이 유효한 JSON 반환 시 StructuredInstruction[] 파싱 성공", async () => {
      const mockResponse = JSON.stringify({
        instructions: [
          {
            issue: "과용 폰트(Arial, Inter, system-ui) 대신 전문 폰트 또는 Google Fonts를 사용한다",
            action: "font-family: Arial 을 font-family: 'Noto Sans', sans-serif 로 교체하고 Google Fonts CDN 링크를 <head>에 추가하라",
            example: "<link href=\"https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap\" rel=\"stylesheet\">",
          },
          {
            issue: "모바일 화면을 위한 미디어 쿼리(@media)가 적용되어 있다",
            action: "@media (max-width: 768px) { .container { padding: 16px; flex-direction: column; } } 를 CSS 끝에 추가하라",
          },
        ],
      });

      const svc = new OgdFeedbackConverterService(makeAi(mockResponse));
      const result = await svc.convert(
        "Font and mobile responsiveness issues found.",
        [
          "과용 폰트(Arial, Inter, system-ui) 대신 전문 폰트 또는 Google Fonts를 사용한다",
          "모바일 화면을 위한 미디어 쿼리(@media)가 적용되어 있다",
        ],
      );

      expect(result.instructions).toHaveLength(2);
      const [inst0, inst1] = result.instructions;
      expect(inst0?.issue).toContain("과용 폰트");
      expect(inst0?.action).toContain("Noto Sans");
      expect(inst0?.example).toContain("googleapis.com");
      expect(inst1?.issue).toContain("미디어 쿼리");
      expect(inst1?.example).toBeUndefined();
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.outputTokens).toBeGreaterThan(0);
    });

    it("LLM 파싱 실패 시 failedItems 기반 fallback instructions 반환", async () => {
      const svc = new OgdFeedbackConverterService(makeAi("This is not valid JSON at all!"));
      const failedItems = [
        "CTA(Call-to-Action) 버튼이 존재한다",
        "반응형 레이아웃이 적용되어 있다",
      ];

      const result = await svc.convert("Some vague feedback.", failedItems);

      expect(result.instructions).toHaveLength(2);
      const [fb0, fb1] = result.instructions;
      expect(fb0?.issue).toBe(failedItems[0]);
      expect(fb0?.action).toContain("Fix the following issue");
      expect(fb1?.issue).toBe(failedItems[1]);
    });

    it("failedItems 빈 배열 + rawFeedback 없음 → 빈 instructions 반환", async () => {
      const svc = new OgdFeedbackConverterService(makeAi("{}"));
      const result = await svc.convert("", []);

      expect(result.instructions).toHaveLength(0);
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });
  });
});
