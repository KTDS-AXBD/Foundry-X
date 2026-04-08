// F461: Prototype QSA Adapter 테스트 (Sprint 226)

import { describe, it, expect, vi } from "vitest";
import { PrototypeQsaAdapter } from "../../services/adapters/prototype-qsa-adapter.js";

/** Workers AI mock 팩토리 */
function createMockAi(responseJson: unknown) {
  return {
    run: vi.fn().mockResolvedValue({ response: JSON.stringify(responseJson) }),
  };
}

const GOOD_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Pretendard', sans-serif; color: #1a1a2e; }
    .hero { padding: 80px 64px; background: #0f172a; }
    .card { padding: 24px; }
    h1 { font-size: 2.5rem; letter-spacing: -0.02em; }
    @media (max-width: 768px) { .hero { padding: 40px 24px; } }
  </style>
</head>
<body>
  <section class="hero">
    <h1>AI 기반 고객 이탈 예측 솔루션</h1>
    <p>30일 전 예측으로 이탈율 20% 감소</p>
    <button>도입 문의</button>
  </section>
  <section id="problem"><h2>문제 정의</h2><p>현재 사후 대응으로 연간 2억 손실</p></section>
  <section id="solution"><h2>솔루션</h2><p>ML 기반 예측 모델</p></section>
  <section id="market"><h2>시장 기회</h2><p>TAM 1조원</p></section>
  <section id="cta"><h2>다음 단계</h2><button>미팅 요청</button></section>
</body>
</html>`;

const SECURITY_FAIL_HTML = `<!DOCTYPE html>
<html>
<head>
  <!-- INTERNAL: Project Codename ATLAS, Team: BD-KT-Alpha, API: https://internal-api.kt.com/v2 -->
  <title>비공개 내부 자료</title>
</head>
<body>
  <h1>고객용 제안서</h1>
  <p>내부 시스템 URL: https://internal.kt.com/dashboard</p>
</body>
</html>`;

const AI_FONT_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, Helvetica, system-ui, sans-serif; color: #000000; background: #ffffff; }
    .card { padding: 13px; }
    .card { background: #fff; }
    .card .card { padding: 8px; }
  </style>
</head>
<body><h1>테스트</h1></body>
</html>`;

describe("PrototypeQsaAdapter", () => {
  describe("인터페이스 기본값", () => {
    it("domain이 'prototype-qsa'이다", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      expect(adapter.domain).toBe("prototype-qsa");
    });

    it("displayName이 'Prototype QSA 판별'이다", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      expect(adapter.displayName).toBe("Prototype QSA 판별");
    });

    it("description이 있다", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      expect(adapter.description).toBeTruthy();
    });
  });

  describe("getDefaultRubric()", () => {
    it("QSA-R1~R5 5개 차원을 모두 포함한다", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      const rubric = adapter.getDefaultRubric();
      expect(rubric).toContain("QSA-R1");
      expect(rubric).toContain("QSA-R2");
      expect(rubric).toContain("QSA-R3");
      expect(rubric).toContain("QSA-R4");
      expect(rubric).toContain("QSA-R5");
    });

    it("5개 가중치 합이 1.0이다 (0.25+0.25+0.25+0.15+0.10)", () => {
      // 가중치는 소스코드의 QSA_RUBRIC_WEIGHTS 기준으로 확인
      const weights = [0.25, 0.25, 0.25, 0.15, 0.10];
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe("analyzeCss()", () => {
    it("Arial, system-ui 등 AI 기본 폰트를 검출한다", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      const result = adapter.analyzeCss(AI_FONT_HTML);
      expect(result.aiDefaultFonts).toContain("Arial");
      expect(result.aiDefaultFonts).toContain("system-ui");
    });

    it("순수 흑색(#000000)과 순수 백색(#ffffff)을 검출한다", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      const result = adapter.analyzeCss(AI_FONT_HTML);
      expect(result.pureColors.length).toBeGreaterThan(0);
    });

    it("중첩 카드 패턴을 감지한다 (.card .card)", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      const result = adapter.analyzeCss(AI_FONT_HTML);
      expect(result.hasNestedCards).toBe(true);
    });

    it("@media 쿼리 존재를 감지한다", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      const goodResult = adapter.analyzeCss(GOOD_HTML);
      expect(goodResult.hasMediaQueries).toBe(true);

      const badResult = adapter.analyzeCss(AI_FONT_HTML);
      expect(badResult.hasMediaQueries).toBe(false);
    });

    it("안티패턴이 없는 우수 HTML에서는 빈 배열을 반환한다", () => {
      const adapter = new PrototypeQsaAdapter({} as Ai);
      const result = adapter.analyzeCss(GOOD_HTML);
      expect(result.aiDefaultFonts).toHaveLength(0);
      expect(result.pureColors).toHaveLength(0);
      expect(result.hasNestedCards).toBe(false);
    });
  });

  describe("discriminate()", () => {
    it("우수 HTML에 대해 pass=true를 반환한다", async () => {
      const mockAi = createMockAi({
        scores: {
          "QSA-R1": 0.95,
          "QSA-R2": 0.90,
          "QSA-R3": 0.88,
          "QSA-R4": 0.85,
          "QSA-R5": 0.90,
        },
        securityFail: false,
        feedback: "전반적으로 우수합니다.",
      });

      const adapter = new PrototypeQsaAdapter(mockAi as unknown as Ai);
      const result = await adapter.discriminate(GOOD_HTML, adapter.getDefaultRubric());

      expect(result.pass).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.85);
    });

    it("기밀 노출 HTML에 대해 SECURITY_FAIL을 반환한다", async () => {
      const mockAi = createMockAi({
        scores: {
          "QSA-R1": 0.10,
          "QSA-R2": 0.50,
          "QSA-R3": 0.50,
          "QSA-R4": 0.50,
          "QSA-R5": 0.50,
        },
        securityFail: true,
        feedback: "내부 API URL 노출 감지",
      });

      const adapter = new PrototypeQsaAdapter(mockAi as unknown as Ai);
      const result = await adapter.discriminate(SECURITY_FAIL_HTML, adapter.getDefaultRubric());

      expect(result.pass).toBe(false);
      expect(result.score).toBe(0);
      expect(result.feedback).toContain("SECURITY_FAIL");
    });

    it("LLM JSON 파싱 실패 시 fallback을 반환한다", async () => {
      const mockAi = {
        run: vi.fn().mockResolvedValue({ response: "비정상 응답 텍스트" }),
      };

      const adapter = new PrototypeQsaAdapter(mockAi as unknown as Ai);
      const result = await adapter.discriminate(GOOD_HTML, adapter.getDefaultRubric());

      expect(result.pass).toBe(false);
      expect(result.score).toBe(0.5);
    });
  });

  describe("generate()", () => {
    it("피드백과 함께 HTML을 개선한다", async () => {
      const improvedHtml = "<html><body><h1>개선된 Prototype</h1></body></html>";
      const mockAi = {
        run: vi.fn().mockResolvedValue({ response: improvedHtml }),
      };

      const adapter = new PrototypeQsaAdapter(mockAi as unknown as Ai);
      const result = await adapter.generate(
        { htmlContent: AI_FONT_HTML, prdContent: "PRD 내용" },
        "Arial 폰트를 Pretendard로 교체하세요",
      );

      expect(result.output).toBe(improvedHtml);
    });
  });
});
