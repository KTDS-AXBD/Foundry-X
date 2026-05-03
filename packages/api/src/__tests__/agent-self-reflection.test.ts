import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AgentSelfReflection,
  type ReflectionMetadata,
} from "../agent/services/agent-self-reflection.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "../agent/services/execution-types.js";
import type { AgentRunner } from "../agent/services/agent-runner.js";

function makeRequest(overrides?: Partial<AgentExecutionRequest>): AgentExecutionRequest {
  return {
    taskId: "task-sr-001",
    agentId: "test-agent",
    taskType: "code-review",
    context: {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "master",
      targetFiles: ["src/index.ts"],
      instructions: "Review the code",
    },
    constraints: [],
    ...overrides,
  };
}

function makeResult(overrides?: Partial<AgentExecutionResult>): AgentExecutionResult {
  return {
    status: "success",
    output: { analysis: "Code looks good, no issues found." },
    tokensUsed: 100,
    model: "mock",
    duration: 50,
    ...overrides,
  };
}

function createMockRunner(executeFn?: AgentRunner["execute"]): AgentRunner {
  return {
    type: "mock",
    execute: executeFn ?? vi.fn().mockResolvedValue(makeResult()),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

function highScoreReflection(): AgentExecutionResult {
  return makeResult({
    output: {
      analysis: JSON.stringify({
        score: 85,
        confidence: 90,
        reasoning: "Output is thorough and correct",
        suggestions: [],
      }),
    },
  });
}

function lowScoreReflection(): AgentExecutionResult {
  return makeResult({
    output: {
      analysis: JSON.stringify({
        score: 30,
        confidence: 70,
        reasoning: "Output is incomplete",
        suggestions: ["Add error handling", "Cover edge cases"],
      }),
    },
  });
}

describe("AgentSelfReflection", () => {
  let reflection: AgentSelfReflection;

  beforeEach(() => {
    reflection = new AgentSelfReflection();
  });

  describe("reflect", () => {
    it("고품질 출력에 높은 점수를 반환해요", async () => {
      const runner = createMockRunner(vi.fn().mockResolvedValue(highScoreReflection()));
      const result = await reflection.reflect(runner, makeRequest(), makeResult());

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.reasoning).toBe("Output is thorough and correct");
      expect(result.suggestions).toHaveLength(0);
    });

    it("저품질 출력에 낮은 점수와 suggestions를 반환해요", async () => {
      const runner = createMockRunner(vi.fn().mockResolvedValue(lowScoreReflection()));
      const result = await reflection.reflect(runner, makeRequest(), makeResult());

      expect(result.score).toBeLessThan(60);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain("Add error handling");
    });

    it("JSON 파싱 실패 시 기본값을 반환해요", async () => {
      const runner = createMockRunner(
        vi.fn().mockResolvedValue(makeResult({ output: { analysis: "not json at all" } })),
      );
      const result = await reflection.reflect(runner, makeRequest(), makeResult());

      expect(result.score).toBe(50);
      expect(result.confidence).toBe(30);
      expect(result.reasoning).toBe("Failed to parse reflection output");
      expect(result.suggestions).toHaveLength(0);
    });

    it("runner 실행 실패 시 기본값을 반환해요", async () => {
      const runner = createMockRunner(vi.fn().mockRejectedValue(new Error("API error")));
      const result = await reflection.reflect(runner, makeRequest(), makeResult());

      expect(result.score).toBe(50);
      expect(result.confidence).toBe(30);
    });

    it("score/confidence를 0-100 범위로 클램핑해요", async () => {
      const runner = createMockRunner(
        vi.fn().mockResolvedValue(
          makeResult({
            output: {
              analysis: JSON.stringify({ score: 150, confidence: -20, reasoning: "test", suggestions: [] }),
            },
          }),
        ),
      );
      const result = await reflection.reflect(runner, makeRequest(), makeResult());

      expect(result.score).toBe(100);
      expect(result.confidence).toBe(0);
    });
  });

  describe("shouldRetry", () => {
    it("threshold 이상이면 false를 반환해요", () => {
      expect(reflection.shouldRetry(60)).toBe(false);
      expect(reflection.shouldRetry(80)).toBe(false);
      expect(reflection.shouldRetry(100)).toBe(false);
    });

    it("threshold 미만이면 true를 반환해요", () => {
      expect(reflection.shouldRetry(59)).toBe(true);
      expect(reflection.shouldRetry(0)).toBe(true);
    });

    it("커스텀 threshold를 적용해요", () => {
      const custom = new AgentSelfReflection({ threshold: 80 });
      expect(custom.shouldRetry(79)).toBe(true);
      expect(custom.shouldRetry(80)).toBe(false);
    });
  });

  describe("enhanceWithReflection", () => {
    it("고품질 출력 시 retryCount=0이에요", async () => {
      const executeFn = vi.fn()
        .mockResolvedValueOnce(makeResult()) // original execution
        .mockResolvedValueOnce(highScoreReflection()); // reflection (score 85 >= 60)

      const runner = createMockRunner(executeFn);
      const enhanced = reflection.enhanceWithReflection(runner);
      const result = await enhanced.execute(makeRequest());

      const metadata = extractMetadata(result);
      expect(metadata.retryCount).toBe(0);
      expect(metadata.score).toBe(85);
      expect(executeFn).toHaveBeenCalledTimes(2); // 1 exec + 1 reflection
    });

    it("저품질 출력 시 retryCount >= 1이에요", async () => {
      const executeFn = vi.fn()
        .mockResolvedValueOnce(makeResult()) // original execution
        .mockResolvedValueOnce(lowScoreReflection()) // reflection 1 (score 30 → retry)
        .mockResolvedValueOnce(makeResult()) // retry execution
        .mockResolvedValueOnce(highScoreReflection()); // reflection 2 (score 85 → stop)

      const runner = createMockRunner(executeFn);
      const enhanced = reflection.enhanceWithReflection(runner);
      const result = await enhanced.execute(makeRequest());

      const metadata = extractMetadata(result);
      expect(metadata.retryCount).toBeGreaterThanOrEqual(1);
    });

    it("maxRetries를 초과하지 않아요", async () => {
      const executeFn = vi.fn()
        .mockResolvedValue(makeResult()) // all executions return regular result
        ;
      // Override: all reflections return low score
      const reflectSpy = vi.spyOn(reflection, "reflect").mockResolvedValue({
        score: 20,
        confidence: 50,
        reasoning: "Still bad",
        suggestions: ["Try harder"],
      });

      const runner = createMockRunner(executeFn);
      const enhanced = reflection.enhanceWithReflection(runner);
      await enhanced.execute(makeRequest());

      // 1 initial + maxRetries(2) = 3 reflect calls
      expect(reflectSpy).toHaveBeenCalledTimes(3);
      reflectSpy.mockRestore();
    });

    it("bestResult를 선택해요 (가장 높은 점수의 결과)", async () => {
      const bestAnalysis = "This is the best analysis";
      const executeFn = vi.fn()
        .mockResolvedValueOnce(makeResult({ output: { analysis: "first attempt" } }))
        .mockResolvedValueOnce(lowScoreReflection()) // score 30
        .mockResolvedValueOnce(makeResult({ output: { analysis: bestAnalysis } }))
        .mockResolvedValueOnce(highScoreReflection()); // score 85 → best

      const runner = createMockRunner(executeFn);
      const enhanced = reflection.enhanceWithReflection(runner);
      const result = await enhanced.execute(makeRequest());

      expect(result.output.analysis).toContain(bestAnalysis);
    });

    it("reflection 메타데이터를 부착해요", async () => {
      const executeFn = vi.fn()
        .mockResolvedValueOnce(makeResult())
        .mockResolvedValueOnce(highScoreReflection());

      const runner = createMockRunner(executeFn);
      const enhanced = reflection.enhanceWithReflection(runner);
      const result = await enhanced.execute(makeRequest());

      const metadata = extractMetadata(result);
      expect(metadata).toBeDefined();
      expect(metadata.score).toBeDefined();
      expect(metadata.confidence).toBeDefined();
      expect(metadata.reasoning).toBeDefined();
      expect(metadata.suggestions).toBeDefined();
      expect(metadata.retryCount).toBeDefined();
      expect(metadata.history).toBeDefined();
    });

    it("history에 각 iteration을 기록해요", async () => {
      const executeFn = vi.fn()
        .mockResolvedValueOnce(makeResult())
        .mockResolvedValueOnce(lowScoreReflection()) // iteration 0, score 30
        .mockResolvedValueOnce(makeResult())
        .mockResolvedValueOnce(highScoreReflection()); // iteration 1, score 85

      const runner = createMockRunner(executeFn);
      const enhanced = reflection.enhanceWithReflection(runner);
      const result = await enhanced.execute(makeRequest());

      const metadata = extractMetadata(result);
      expect(metadata.history).toHaveLength(2);
      expect(metadata.history[0]).toEqual({ iteration: 0, score: 30, confidence: 70 });
      expect(metadata.history[1]).toEqual({ iteration: 1, score: 85, confidence: 90 });
    });

    it("isAvailable를 원본 runner에 위임해요", async () => {
      const runner = createMockRunner();
      (runner.isAvailable as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const enhanced = reflection.enhanceWithReflection(runner);
      const available = await enhanced.isAvailable();

      expect(available).toBe(false);
      expect(runner.isAvailable).toHaveBeenCalled();
    });

    it("supportsTaskType을 원본 runner에 위임해요", async () => {
      const runner = createMockRunner();
      (runner.supportsTaskType as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const enhanced = reflection.enhanceWithReflection(runner);
      const supports = enhanced.supportsTaskType("code-review");

      expect(supports).toBe(false);
      expect(runner.supportsTaskType).toHaveBeenCalledWith("code-review");
    });

    it("재시도 시 suggestions를 instructions에 추가해요", async () => {
      const executeFn = vi.fn()
        .mockResolvedValueOnce(makeResult())
        .mockResolvedValueOnce(lowScoreReflection()) // suggestions: ["Add error handling", "Cover edge cases"]
        .mockResolvedValueOnce(makeResult())
        .mockResolvedValueOnce(highScoreReflection());

      const runner = createMockRunner(executeFn);
      const enhanced = reflection.enhanceWithReflection(runner);
      await enhanced.execute(makeRequest());

      // Second execute call (retry) should have suggestions appended
      const retryRequest = executeFn.mock.calls[2]![0] as AgentExecutionRequest;
      expect(retryRequest.context.instructions).toContain("Add error handling");
      expect(retryRequest.context.instructions).toContain("Cover edge cases");
    });
  });

  describe("HARD_MAX_RETRIES 클램핑", () => {
    it("config.maxRetries가 HARD_MAX_RETRIES를 초과하면 클램핑해요", () => {
      const sr = new AgentSelfReflection({ maxRetries: 10 });
      // Verify by running enhance — should only retry up to 3 times
      expect(AgentSelfReflection.HARD_MAX_RETRIES).toBe(3);

      // We test indirectly: all reflections return low score
      const executeFn = vi.fn().mockResolvedValue(makeResult());
      const reflectSpy = vi.spyOn(sr, "reflect").mockResolvedValue({
        score: 10,
        confidence: 50,
        reasoning: "Bad",
        suggestions: ["Fix it"],
      });

      const runner = createMockRunner(executeFn);
      const enhanced = sr.enhanceWithReflection(runner);

      return enhanced.execute(makeRequest()).then((result) => {
        // 1 initial + 3 retries (clamped from 10) = 4 reflect calls
        expect(reflectSpy).toHaveBeenCalledTimes(4);
        const metadata = extractMetadata(result);
        expect(metadata.retryCount).toBe(3);
        reflectSpy.mockRestore();
      });
    });
  });

  describe("기본값", () => {
    it("DEFAULT_THRESHOLD는 60이에요", () => {
      expect(AgentSelfReflection.DEFAULT_THRESHOLD).toBe(60);
    });

    it("DEFAULT_MAX_RETRIES는 2예요", () => {
      expect(AgentSelfReflection.DEFAULT_MAX_RETRIES).toBe(2);
    });

    it("HARD_MAX_RETRIES는 3이에요", () => {
      expect(AgentSelfReflection.HARD_MAX_RETRIES).toBe(3);
    });
  });
});

/** result.reflection 필드에서 메타데이터를 추출하는 헬퍼 */
function extractMetadata(result: AgentExecutionResult): ReflectionMetadata {
  if (!result.reflection) throw new Error("No reflection metadata found in result");
  return result.reflection as ReflectionMetadata;
}
