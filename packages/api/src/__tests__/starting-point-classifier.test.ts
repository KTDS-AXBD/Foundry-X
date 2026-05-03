import { describe, it, expect, vi } from "vitest";
import { StartingPointClassifier, StartingPointError } from "../core/discovery/services/starting-point-classifier.js";
import type { AgentRunner } from "../services/agent/agent-runner.js";
import type { AgentExecutionResult } from "../services/agent/execution-types.js";

function mockRunner(analysis: string, status: "success" | "failed" = "success"): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status,
      output: { analysis },
      tokensUsed: 100,
      model: "mock",
      duration: 500,
    } satisfies AgentExecutionResult),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

describe("StartingPointClassifier", () => {
  it("정상 분류 — idea", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "idea", confidence: 0.85, reasoning: "아이디어 위주 설명" }));
    const classifier = new StartingPointClassifier(runner);
    const result = await classifier.classify({ title: "AI 챗봇", description: "이런 걸 만들면 좋겠다", source: "field" });
    expect(result.startingPoint).toBe("idea");
    expect(result.confidence).toBe(0.85);
    expect(result.reasoning).toBe("아이디어 위주 설명");
    expect(result.needsConfirmation).toBe(false);
  });

  it("정상 분류 — tech", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "tech", confidence: 0.9, reasoning: "기술 기반" }));
    const classifier = new StartingPointClassifier(runner);
    const result = await classifier.classify({ title: "블록체인 DID", description: "분산ID 기술", source: "agent" });
    expect(result.startingPoint).toBe("tech");
  });

  it("정상 분류 — market", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "market", confidence: 0.75, reasoning: "시장 분석 기반" }));
    const classifier = new StartingPointClassifier(runner);
    const result = await classifier.classify({ title: "헬스케어 시장", description: "고령화 시장", source: "field" });
    expect(result.startingPoint).toBe("market");
  });

  it("정상 분류 — problem", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "problem", confidence: 0.8, reasoning: "고객 Pain Point" }));
    const classifier = new StartingPointClassifier(runner);
    const result = await classifier.classify({ title: "보고서 자동화", description: "수작업 비효율", source: "field" });
    expect(result.startingPoint).toBe("problem");
  });

  it("정상 분류 — service", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "service", confidence: 0.7, reasoning: "기존 서비스 확장" }));
    const classifier = new StartingPointClassifier(runner);
    const result = await classifier.classify({ title: "기존 CRM 확장", description: "CRM 서비스 피봇", source: "field" });
    expect(result.startingPoint).toBe("service");
  });

  it("confidence < 0.6 → needsConfirmation=true", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "tech", confidence: 0.5, reasoning: "복합적" }));
    const classifier = new StartingPointClassifier(runner);
    const result = await classifier.classify({ title: "테스트", description: null, source: "field" });
    expect(result.needsConfirmation).toBe(true);
    expect(result.confidence).toBe(0.5);
  });

  it("confidence >= 0.6 → needsConfirmation=false", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "idea", confidence: 0.6, reasoning: "확실" }));
    const classifier = new StartingPointClassifier(runner);
    const result = await classifier.classify({ title: "테스트", description: null, source: "field" });
    expect(result.needsConfirmation).toBe(false);
  });

  it("LLM 실패 → StartingPointError (LLM_EXECUTION_FAILED)", async () => {
    const runner = mockRunner("", "failed");
    const classifier = new StartingPointClassifier(runner);
    await expect(
      classifier.classify({ title: "테스트", description: null, source: "field" }),
    ).rejects.toThrow(StartingPointError);

    try {
      await classifier.classify({ title: "테스트", description: null, source: "field" });
    } catch (e) {
      expect((e as StartingPointError).code).toBe("LLM_EXECUTION_FAILED");
    }
  });

  it("JSON 파싱 실패 → StartingPointError (LLM_PARSE_ERROR)", async () => {
    const runner = mockRunner("이건 JSON이 아닙니다");
    const classifier = new StartingPointClassifier(runner);
    await expect(
      classifier.classify({ title: "테스트", description: null, source: "field" }),
    ).rejects.toThrow(StartingPointError);

    try {
      await classifier.classify({ title: "테스트", description: null, source: "field" });
    } catch (e) {
      expect((e as StartingPointError).code).toBe("LLM_PARSE_ERROR");
    }
  });

  it("잘못된 startingPoint 값 → StartingPointError (LLM_PARSE_ERROR)", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "unknown", confidence: 0.8, reasoning: "잘못됨" }));
    const classifier = new StartingPointClassifier(runner);
    await expect(
      classifier.classify({ title: "테스트", description: null, source: "field" }),
    ).rejects.toThrow(StartingPointError);
  });

  it("confidence 범위 초과 → StartingPointError (LLM_PARSE_ERROR)", async () => {
    const runner = mockRunner(JSON.stringify({ startingPoint: "idea", confidence: 1.5, reasoning: "범위 초과" }));
    const classifier = new StartingPointClassifier(runner);
    await expect(
      classifier.classify({ title: "테스트", description: null, source: "field" }),
    ).rejects.toThrow(StartingPointError);
  });

  it("markdown 코드블록 래핑 JSON 파싱", async () => {
    const json = JSON.stringify({ startingPoint: "market", confidence: 0.75, reasoning: "코드블록 테스트" });
    const runner = mockRunner(`\`\`\`json\n${json}\n\`\`\``);
    const classifier = new StartingPointClassifier(runner);
    const result = await classifier.classify({ title: "테스트", description: null, source: "field" });
    expect(result.startingPoint).toBe("market");
    expect(result.confidence).toBe(0.75);
  });
});
