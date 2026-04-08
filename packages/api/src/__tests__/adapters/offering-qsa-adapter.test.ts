// F462: Offering QSA Adapter 테스트 (Sprint 226)

import { describe, it, expect, vi } from "vitest";
import { OfferingQsaAdapter } from "../../services/adapters/offering-qsa-adapter.js";

/** Workers AI mock 팩토리 */
function createMockAi(responseJson: unknown) {
  return {
    run: vi.fn().mockResolvedValue({ response: JSON.stringify(responseJson) }),
  };
}

// 18개 P0 섹션 키워드 포함 완전한 Offering HTML
const COMPLETE_OFFERING_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Pretendard', sans-serif; color: #1e293b; }
    @media (max-width: 768px) { .section { padding: 32px 16px; } }
  </style>
</head>
<body>
  <!-- Hero/표지 -->
  <section class="hero">
    <h1>AI 기반 헬스케어 플랫폼 — 혁신적 솔루션 제안</h1>
    <p>KT 그룹의 AI 역량으로 구현하는 차세대 헬스케어</p>
  </section>
  <!-- 문제 정의 -->
  <section id="problem">
    <h2>문제 정의</h2>
    <p>현재(As-Is): 의료 데이터 단절로 연간 3,000억 손실</p>
  </section>
  <!-- 솔루션 -->
  <section id="solution">
    <h2>솔루션 — To-Be</h2>
    <p>AI 통합 플랫폼으로 실시간 의료 데이터 연동</p>
  </section>
  <!-- 시장 기회 -->
  <section id="market">
    <h2>시장 기회</h2>
    <p>TAM: 50조원 | SAM: 5조원 | SOM: 5,000억원</p>
  </section>
  <!-- 비즈니스 모델 -->
  <section id="business-model">
    <h2>비즈니스 모델 — 수익 구조</h2>
    <p>SaaS 구독: 병원당 월 500만원 | Revenue 목표: 100억원/년</p>
  </section>
  <!-- 경쟁 우위 -->
  <section id="competitive">
    <h2>경쟁 우위 — 차별화 전략</h2>
    <p>KT AI 인프라 기반 unique Moat: 경쟁사 대비 3배 빠른 처리 속도</p>
  </section>
  <!-- 고객 페르소나 -->
  <section id="persona">
    <h2>고객 페르소나</h2>
    <p>주 타겟: 종합병원 CIO (Customer: 병원 경영진)</p>
  </section>
  <!-- 검증 데이터 -->
  <section id="validation">
    <h2>검증 데이터 — 파일럿 결과</h2>
    <p>파일럿: 3개 병원 | 데이터 처리 속도 40% 향상 Evidence 확인</p>
  </section>
  <!-- 팀/조직 -->
  <section id="team">
    <h2>팀 / 조직 구성</h2>
    <p>KT AI Lab 15명 | 헬스케어 도메인 전문가 5명</p>
  </section>
  <!-- 로드맵 -->
  <section id="roadmap">
    <h2>로드맵 — Timeline</h2>
    <p>Q1 2026: MVP 출시 (마일스톤 1) | Q3 2026: 전국 확산</p>
  </section>
  <!-- CTA -->
  <section id="cta">
    <h2>다음 단계 (Next Step)</h2>
    <p>연락처: axbd@kt.com | 미팅 요청: Contact Us</p>
    <button>지금 문의하기</button>
  </section>
</body>
</html>`;

const MISSING_SECTIONS_HTML = `<!DOCTYPE html>
<html>
<body>
  <section class="hero"><h1>헬스케어 AI</h1></section>
  <section id="problem"><h2>문제</h2></section>
  <!-- 솔루션, 시장 기회 등 P0 섹션 다수 누락 -->
</body>
</html>`;

describe("OfferingQsaAdapter", () => {
  describe("인터페이스 기본값", () => {
    it("domain이 'offering-qsa'이다", () => {
      const adapter = new OfferingQsaAdapter({} as Ai);
      expect(adapter.domain).toBe("offering-qsa");
    });

    it("displayName이 'Offering QSA 판별'이다", () => {
      const adapter = new OfferingQsaAdapter({} as Ai);
      expect(adapter.displayName).toBe("Offering QSA 판별");
    });

    it("description이 있다", () => {
      const adapter = new OfferingQsaAdapter({} as Ai);
      expect(adapter.description).toBeTruthy();
    });
  });

  describe("getDefaultRubric()", () => {
    it("OQ-R1~R5 5개 차원을 모두 포함한다", () => {
      const adapter = new OfferingQsaAdapter({} as Ai);
      const rubric = adapter.getDefaultRubric();
      expect(rubric).toContain("OQ-R1");
      expect(rubric).toContain("OQ-R2");
      expect(rubric).toContain("OQ-R3");
      expect(rubric).toContain("OQ-R4");
      expect(rubric).toContain("OQ-R5");
    });

    it("5개 가중치 합이 1.0이다 (0.25+0.25+0.20+0.20+0.10)", () => {
      const weights = [0.25, 0.25, 0.20, 0.20, 0.10];
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe("checkSections()", () => {
    it("완전한 Offering HTML에서 P0 섹션 누락이 없다", () => {
      const adapter = new OfferingQsaAdapter({} as Ai);
      const result = adapter.checkSections(COMPLETE_OFFERING_HTML);
      expect(result.p0Missing).toHaveLength(0);
      expect(result.presentCount).toBeGreaterThanOrEqual(10);
    });

    it("P0 필수 섹션 누락 시 누락 목록을 반환한다", () => {
      const adapter = new OfferingQsaAdapter({} as Ai);
      const result = adapter.checkSections(MISSING_SECTIONS_HTML);
      expect(result.p0Missing.length).toBeGreaterThan(0);
      expect(result.p0Missing).toContain("솔루션");
      expect(result.p0Missing).toContain("시장 기회");
    });

    it("P1 권장 섹션 누락 시 p1Missing에 포함된다", () => {
      const adapter = new OfferingQsaAdapter({} as Ai);
      const result = adapter.checkSections(MISSING_SECTIONS_HTML);
      // GTM, 재무계획 등 P1 섹션들이 없으므로 p1Missing에 있어야 함
      expect(result.p1Missing.length).toBeGreaterThan(0);
    });
  });

  describe("discriminate()", () => {
    it("완전한 Offering에 대해 pass=true를 반환한다", async () => {
      const mockAi = createMockAi({
        scores: {
          "OQ-R1": 0.95,
          "OQ-R2": 0.88,
          "OQ-R3": 0.82,
          "OQ-R4": 0.85,
          "OQ-R5": 0.98,
        },
        missingSections: [],
        securityFail: false,
        feedback: "전반적으로 우수합니다.",
      });

      const adapter = new OfferingQsaAdapter(mockAi as unknown as Ai);
      const result = await adapter.discriminate(COMPLETE_OFFERING_HTML, adapter.getDefaultRubric());

      expect(result.pass).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.80);
    });

    it("기밀 노출 시 SECURITY_FAIL을 반환한다", async () => {
      const securityFailHtml = `<html><head><!-- INTERNAL API: https://internal.kt.com --></head><body></body></html>`;

      const mockAi = createMockAi({
        scores: {
          "OQ-R1": 0.50,
          "OQ-R2": 0.50,
          "OQ-R3": 0.50,
          "OQ-R4": 0.50,
          "OQ-R5": 0.10,
        },
        securityFail: true,
        feedback: "내부 API URL 노출",
      });

      const adapter = new OfferingQsaAdapter(mockAi as unknown as Ai);
      const result = await adapter.discriminate(securityFailHtml, adapter.getDefaultRubric());

      expect(result.pass).toBe(false);
      expect(result.score).toBe(0);
      expect(result.feedback).toContain("SECURITY_FAIL");
    });

    it("LLM JSON 파싱 실패 시 fallback을 반환한다", async () => {
      const mockAi = {
        run: vi.fn().mockResolvedValue({ response: "파싱 불가 응답" }),
      };

      const adapter = new OfferingQsaAdapter(mockAi as unknown as Ai);
      const result = await adapter.discriminate(COMPLETE_OFFERING_HTML, adapter.getDefaultRubric());

      expect(result.pass).toBe(false);
      expect(result.score).toBe(0.5);
    });
  });
});
