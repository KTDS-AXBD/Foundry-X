import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseReviewResponse,
  clampScore,
  toVerdict,
  buildReviewUserPrompt,
  ChatGptProvider,
  GeminiProvider,
  DeepSeekProvider,
  ExternalAiError,
} from "../src/services/external-ai-reviewer.js";

// ─── Sample valid review JSON ───

const VALID_REVIEW = {
  sections: [
    { name: "핵심 문제 정의", score: 8, grade: "충실", feedback: "명확한 문제 정의" },
    { name: "솔루션 설계", score: 7, grade: "적정", feedback: "기본 구조 양호" },
    { name: "시장 분석", score: 6, grade: "적정", feedback: "시장 데이터 보완 필요" },
    { name: "사용자/고객 정의", score: 5, grade: "최소", feedback: "페르소나 추가 필요" },
    { name: "기술 실현 가능성", score: 9, grade: "충실", feedback: "우수한 기술 분석" },
    { name: "비즈니스 모델", score: 4, grade: "최소", feedback: "수익 모델 구체화 필요" },
    { name: "리스크 분석", score: 7, grade: "적정", feedback: "주요 리스크 식별됨" },
    { name: "실행 계획", score: 6, grade: "적정", feedback: "마일스톤 상세화 필요" },
  ],
  overallScore: 72,
  verdict: "conditional",
  summary: "전반적으로 기술 분석은 우수하나 비즈니스 모델 보완 필요",
  improvements: ["비즈니스 모델 구체화", "페르소나 추가"],
};

// ─── Helpers ───

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ─── parseReviewResponse ───

describe("parseReviewResponse", () => {
  it("정상 JSON 파싱", () => {
    const result = parseReviewResponse(JSON.stringify(VALID_REVIEW));
    expect(result.overallScore).toBe(72);
    expect(result.verdict).toBe("conditional");
    expect(result.sections).toHaveLength(8);
    expect(result.sections[0]!.name).toBe("핵심 문제 정의");
    expect(result.sections[0]!.score).toBe(8);
    expect(result.sections[0]!.grade).toBe("충실");
    expect(result.improvements).toHaveLength(2);
  });

  it("code block 감싼 JSON 파싱", () => {
    const wrapped = "```json\n" + JSON.stringify(VALID_REVIEW) + "\n```";
    const result = parseReviewResponse(wrapped);
    expect(result.overallScore).toBe(72);
    expect(result.verdict).toBe("conditional");
    expect(result.sections).toHaveLength(8);
  });

  it("잘못된 JSON → ExternalAiError", () => {
    expect(() => parseReviewResponse("not json at all")).toThrow(ExternalAiError);
  });

  it("sections 누락 시 빈 배열", () => {
    const result = parseReviewResponse(JSON.stringify({ overallScore: 50, verdict: "go", summary: "ok" }));
    expect(result.sections).toEqual([]);
    expect(result.overallScore).toBe(50);
  });

  it("improvements 누락 시 빈 배열", () => {
    const result = parseReviewResponse(JSON.stringify({ overallScore: 50, verdict: "go", summary: "ok", sections: [] }));
    expect(result.improvements).toEqual([]);
  });
});

// ─── clampScore ───

describe("clampScore", () => {
  it("범위 내 값 유지", () => {
    expect(clampScore(5)).toBe(5);
    expect(clampScore(1)).toBe(1);
    expect(clampScore(10)).toBe(10);
  });

  it("범위 초과 → clamped", () => {
    expect(clampScore(0)).toBe(1);
    expect(clampScore(15)).toBe(10);
    expect(clampScore(-3)).toBe(1);
  });

  it("NaN → 기본값 5, null → clamped to 1", () => {
    expect(clampScore("abc")).toBe(5);
    expect(clampScore(undefined)).toBe(5);
    // Number(null) === 0, so clamp → 1
    expect(clampScore(null)).toBe(1);
  });

  it("소수점 → 반올림", () => {
    expect(clampScore(7.6)).toBe(8);
    expect(clampScore(3.2)).toBe(3);
  });
});

// ─── toVerdict ───

describe("toVerdict", () => {
  it("go/conditional/reject 정상 변환", () => {
    expect(toVerdict("go")).toBe("go");
    expect(toVerdict("reject")).toBe("reject");
    expect(toVerdict("conditional")).toBe("conditional");
  });

  it("대소문자 무시", () => {
    expect(toVerdict("GO")).toBe("go");
    expect(toVerdict("Reject")).toBe("reject");
  });

  it("unknown → conditional fallback", () => {
    expect(toVerdict("unknown")).toBe("conditional");
    expect(toVerdict("")).toBe("conditional");
    expect(toVerdict(null)).toBe("conditional");
  });
});

// ─── buildReviewUserPrompt ───

describe("buildReviewUserPrompt", () => {
  it("8000자 이하 → 원문 유지", () => {
    const short = "짧은 PRD 내용";
    const result = buildReviewUserPrompt(short);
    expect(result).toContain(short);
    expect(result).not.toContain("[...중략...]");
  });

  it("8000자 초과 → 앞뒤 4000자 트림", () => {
    const long = "A".repeat(10000);
    const result = buildReviewUserPrompt(long);
    expect(result).toContain("[...중략...]");
    // 4000 + 4000 + 중략 텍스트
    expect(result.length).toBeLessThan(long.length + 500);
  });
});

// ─── ChatGptProvider ───

describe("ChatGptProvider", () => {
  it("fetch 성공 → 파싱된 결과 반환", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: JSON.stringify(VALID_REVIEW) } }],
      }),
    });

    const provider = new ChatGptProvider("test-key");
    const result = await provider.review("테스트 PRD");
    expect(result.overallScore).toBe(72);
    expect(result.verdict).toBe("conditional");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs![0]).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("fetch 실패 → ExternalAiError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    const provider = new ChatGptProvider("test-key");
    await expect(provider.review("테스트")).rejects.toThrow(ExternalAiError);
  });
});

// ─── GeminiProvider ───

describe("GeminiProvider", () => {
  it("fetch 성공 → Gemini 응답 파싱", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: JSON.stringify(VALID_REVIEW) }] } }],
      }),
    });

    const provider = new GeminiProvider("test-key");
    const result = await provider.review("테스트 PRD");
    expect(result.overallScore).toBe(72);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs![0]).toContain("generativelanguage.googleapis.com");
  });

  it("fetch 실패 → ExternalAiError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const provider = new GeminiProvider("test-key");
    await expect(provider.review("테스트")).rejects.toThrow(ExternalAiError);
  });
});

// ─── DeepSeekProvider ───

describe("DeepSeekProvider", () => {
  it("fetch 성공 → OpenAI-compatible 응답 파싱", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: JSON.stringify(VALID_REVIEW) } }],
      }),
    });

    const provider = new DeepSeekProvider("test-key");
    const result = await provider.review("테스트 PRD");
    expect(result.overallScore).toBe(72);

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs![0]).toBe("https://api.deepseek.com/chat/completions");
  });

  it("fetch 실패 → ExternalAiError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const provider = new DeepSeekProvider("test-key");
    await expect(provider.review("테스트")).rejects.toThrow(ExternalAiError);
  });
});
