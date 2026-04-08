// F463: PRD QSA Adapter 테스트 (Sprint 225)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrdQsaAdapter } from "../../services/adapters/prd-qsa-adapter.js";

/** Workers AI mock 팩토리 */
function createMockAi(responseJson: unknown) {
  return {
    run: vi.fn().mockResolvedValue({ response: JSON.stringify(responseJson) }),
  };
}

const GOOD_PRD = `
# 고객 이탈 예측 시스템 PRD

## 문제 정의
현재(As-Is): 고객 이탈 후 사후 대응으로 연간 2억원 손실 발생
목표(To-Be): 이탈 30일 전 예측으로 선제 대응, 이탈율 20% 감소
시급성: 2분기 내 구축 필요 — 경쟁사 동일 시스템 도입 예정

## 기능 범위
Must Have:
- 머신러닝 기반 이탈 예측 모델
- 실시간 리스크 대시보드
Out-of-scope: CRM 시스템 개발, 마케팅 자동화

## 성공 기준
KPI: 이탈율 20% 감소, 예측 정확도 85% 이상
MVP 기준: 주요 고객 100명 대상 파일럿 성공
실패 조건: 3개월 내 정확도 70% 미달 시 중단

## 기술 스택
Python, scikit-learn, AWS SageMaker
의존성: 기존 CRM DB, 데이터 웨어하우스 API

## 구현 계획
문제(이탈 손실) → 해결(예측 모델) → 성공(이탈율 20% 감소)
`;

const WEAK_PRD = `
# 챗봇 개선 PRD

## 배경
현재 챗봇이 느림. 개선이 필요함.

## 기능
- 속도 개선
- 답변 품질 향상

## 목표
더 빠른 챗봇
`;

describe("PrdQsaAdapter", () => {
  describe("인터페이스 기본값", () => {
    it("domain이 'prd-qsa'이다", () => {
      const adapter = new PrdQsaAdapter({} as Ai);
      expect(adapter.domain).toBe("prd-qsa");
    });

    it("displayName이 'PRD 완결성 판별'이다", () => {
      const adapter = new PrdQsaAdapter({} as Ai);
      expect(adapter.displayName).toBe("PRD 완결성 판별");
    });

    it("description이 있다", () => {
      const adapter = new PrdQsaAdapter({} as Ai);
      expect(adapter.description).toBeTruthy();
    });
  });

  describe("getDefaultRubric()", () => {
    it("PR-1~PR-5 5개 차원을 모두 포함한다", () => {
      const adapter = new PrdQsaAdapter({} as Ai);
      const rubric = adapter.getDefaultRubric();
      expect(rubric).toContain("PR-1");
      expect(rubric).toContain("PR-2");
      expect(rubric).toContain("PR-3");
      expect(rubric).toContain("PR-4");
      expect(rubric).toContain("PR-5");
    });

    it("가중치 0.25, 0.20, 0.15를 포함한다", () => {
      const adapter = new PrdQsaAdapter({} as Ai);
      const rubric = adapter.getDefaultRubric();
      expect(rubric).toContain("0.25");
      expect(rubric).toContain("0.20");
      expect(rubric).toContain("0.15");
    });
  });

  describe("generate()", () => {
    let ai: ReturnType<typeof createMockAi>;
    let adapter: PrdQsaAdapter;

    beforeEach(() => {
      ai = createMockAi("improved PRD content");
      adapter = new PrdQsaAdapter(ai as unknown as Ai);
    });

    it("PRD 내용을 입력받아 개선된 PRD를 반환한다", async () => {
      const result = await adapter.generate({ prdContent: WEAK_PRD });
      expect(result.output).toBeTruthy();
      expect(ai.run).toHaveBeenCalledOnce();
    });

    it("피드백이 있을 때 프롬프트에 포함된다", async () => {
      await adapter.generate({ prdContent: WEAK_PRD }, "성공 기준에 KPI가 없음");
      const callArgs = ai.run.mock.calls[0]!;
      const messages = (callArgs[1] as { messages: Array<{ content: string }> }).messages;
      const userMessage = messages.find((m) => m.content.includes("개선 필요 사항"));
      expect(userMessage).toBeTruthy();
    });

    it("AI 응답이 빈 문자열이면 원본 PRD를 반환한다", async () => {
      ai.run.mockResolvedValue({ response: "" });
      const result = await adapter.generate({ prdContent: WEAK_PRD });
      expect(result.output).toBe(WEAK_PRD);
    });
  });

  describe("discriminate()", () => {
    describe("우수한 PRD (모든 기준 충족)", () => {
      it("score >= 0.85이고 pass=true이다", async () => {
        const ai = createMockAi({
          scores: { "PR-1": 0.95, "PR-2": 0.90, "PR-3": 0.90, "PR-4": 0.95, "PR-5": 0.90 },
          feedback: "전체적으로 완결성 높은 PRD입니다.",
          readyForExecution: true,
        });
        const adapter = new PrdQsaAdapter(ai as unknown as Ai);

        const result = await adapter.discriminate(GOOD_PRD, adapter.getDefaultRubric());
        expect(result.score).toBeGreaterThanOrEqual(0.85);
        expect(result.pass).toBe(true);
        expect(result.feedback).toBeTruthy();
      });
    });

    describe("부실한 PRD (기준 미충족)", () => {
      it("score < 0.85이고 pass=false이다", async () => {
        const ai = createMockAi({
          scores: { "PR-1": 0.40, "PR-2": 0.30, "PR-3": 0.20, "PR-4": 0.50, "PR-5": 0.30 },
          feedback: "문제 정의와 성공 기준이 부족합니다.",
          readyForExecution: false,
        });
        const adapter = new PrdQsaAdapter(ai as unknown as Ai);

        const result = await adapter.discriminate(WEAK_PRD, adapter.getDefaultRubric());
        expect(result.score).toBeLessThan(0.85);
        expect(result.pass).toBe(false);
      });
    });

    describe("가중치 계산", () => {
      it("PR-1(0.25)과 PR-2(0.25)가 합산의 절반을 차지한다", async () => {
        // PR-1=1.0, PR-2=1.0, 나머지=0 → 예상 score = 0.25+0.25 = 0.50
        const ai = createMockAi({
          scores: { "PR-1": 1.0, "PR-2": 1.0, "PR-3": 0.0, "PR-4": 0.0, "PR-5": 0.0 },
          feedback: "",
          readyForExecution: false,
        });
        const adapter = new PrdQsaAdapter(ai as unknown as Ai);

        const result = await adapter.discriminate("some PRD", "rubric");
        expect(result.score).toBeCloseTo(0.50, 1);
      });
    });

    describe("readyForExecution=false이면 score >= 0.85여도 pass=false", () => {
      it("착수 불가 판정이 score를 override한다", async () => {
        const ai = createMockAi({
          scores: { "PR-1": 1.0, "PR-2": 1.0, "PR-3": 1.0, "PR-4": 1.0, "PR-5": 1.0 },
          feedback: "기술팀 검토 필요",
          readyForExecution: false, // 명시적 착수 불가
        });
        const adapter = new PrdQsaAdapter(ai as unknown as Ai);

        const result = await adapter.discriminate("PRD content", "rubric");
        expect(result.score).toBeGreaterThanOrEqual(0.85);
        expect(result.pass).toBe(false);
      });
    });

    describe("AI 응답 파싱 실패", () => {
      it("JSON 파싱 실패 시 fallback score=0.5, pass=false를 반환한다", async () => {
        const ai = { run: vi.fn().mockResolvedValue({ response: "invalid json response" }) };
        const adapter = new PrdQsaAdapter(ai as unknown as Ai);

        const result = await adapter.discriminate("PRD content", "rubric");
        expect(result.score).toBe(0.5);
        expect(result.pass).toBe(false);
        expect(result.feedback).toBeTruthy();
      });

      it("AI 응답이 undefined이면 fallback을 반환한다", async () => {
        const ai = { run: vi.fn().mockResolvedValue({ response: undefined }) };
        const adapter = new PrdQsaAdapter(ai as unknown as Ai);

        const result = await adapter.discriminate("PRD content", "rubric");
        expect(result.score).toBe(0.5);
        expect(result.pass).toBe(false);
      });
    });
  });
});
