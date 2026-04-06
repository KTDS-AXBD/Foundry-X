import { describe, it, expect } from "vitest";
import { PrototypeFallbackStrategy } from "../services/prototype-fallback.js";

describe("PrototypeFallbackStrategy", () => {
  describe("next()", () => {
    it("CLI 실패 시 API Fallback을 결정해요", () => {
      const decision = PrototypeFallbackStrategy.next("cli", "CLI timeout");
      expect(decision.level).toBe("api");
      expect(decision.model).toBe("sonnet");
      expect(decision.reason).toBe("CLI timeout");
    });

    it("API 실패 시 dead_letter를 결정해요", () => {
      const decision = PrototypeFallbackStrategy.next("api", "Rate limit exceeded");
      expect(decision.level).toBe("dead_letter");
      expect(decision.reason).toBe("Rate limit exceeded");
    });

    it("이미 dead_letter면 dead_letter를 유지해요", () => {
      const decision = PrototypeFallbackStrategy.next("dead_letter", "Already dead");
      expect(decision.level).toBe("dead_letter");
    });
  });

  describe("calculateCost()", () => {
    it("Haiku 비용을 계산해요 (~$0.5~1 for 30 turns)", () => {
      // 30턴 추정: 입력 100K, 출력 50K tokens
      const cost = PrototypeFallbackStrategy.calculateCost("haiku", 100000, 50000);
      // input: 100K/1M * 0.80 = 0.08, output: 50K/1M * 4.00 = 0.20
      expect(cost).toBeCloseTo(0.28, 2);
    });

    it("Sonnet 비용을 계산해요 (~$2~5 for 30 turns)", () => {
      const cost = PrototypeFallbackStrategy.calculateCost("sonnet", 100000, 50000);
      // input: 100K/1M * 3.00 = 0.30, output: 50K/1M * 15.00 = 0.75
      expect(cost).toBeCloseTo(1.05, 2);
    });

    it("알 수 없는 모델은 Haiku 비용으로 계산해요", () => {
      const cost = PrototypeFallbackStrategy.calculateCost("unknown-model", 100000, 50000);
      expect(cost).toBeCloseTo(0.28, 2);
    });

    it("0 토큰이면 0 비용이에요", () => {
      const cost = PrototypeFallbackStrategy.calculateCost("haiku", 0, 0);
      expect(cost).toBe(0);
    });
  });
});
