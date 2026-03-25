import { describe, it, expect } from "vitest";
import {
  TURN_SEQUENCE, HAT_CONFIGS, MAX_PRD_SUMMARY_LENGTH,
  summarizePrd, buildTurnPrompt,
  type HatColor,
} from "../services/sixhats-prompts.js";

describe("SixHatsPrompts (F188)", () => {
  it("TURN_SEQUENCE has exactly 20 turns", () => {
    expect(TURN_SEQUENCE).toHaveLength(20);
  });

  it("TURN_SEQUENCE contains all 6 hat colors", () => {
    const colors = new Set<HatColor>(TURN_SEQUENCE);
    expect(colors.size).toBe(6);
    expect(colors).toContain("white");
    expect(colors).toContain("red");
    expect(colors).toContain("black");
    expect(colors).toContain("yellow");
    expect(colors).toContain("green");
    expect(colors).toContain("blue");
  });

  it("TURN_SEQUENCE ends with green(19) + blue(20)", () => {
    expect(TURN_SEQUENCE[18]).toBe("green");
    expect(TURN_SEQUENCE[19]).toBe("blue");
  });

  it("HAT_CONFIGS has all 6 colors with required fields", () => {
    const colors: HatColor[] = ["white", "red", "black", "yellow", "green", "blue"];
    for (const color of colors) {
      const cfg = HAT_CONFIGS[color];
      expect(cfg.color).toBe(color);
      expect(cfg.emoji).toBeTruthy();
      expect(cfg.label).toBeTruthy();
      expect(cfg.role).toBeTruthy();
      expect(cfg.systemPrompt.length).toBeGreaterThan(20);
    }
  });

  it("summarizePrd returns content as-is when under limit", () => {
    const short = "A".repeat(2000);
    expect(summarizePrd(short)).toBe(short);
  });

  it("summarizePrd truncates content exceeding limit", () => {
    const long = "B".repeat(MAX_PRD_SUMMARY_LENGTH + 500);
    const result = summarizePrd(long);
    expect(result.length).toBeLessThan(long.length);
    expect(result).toContain("[...중략...]");
  });

  it("buildTurnPrompt — Round 1 label is 기본 분석", () => {
    const { user } = buildTurnPrompt({
      turnNumber: 1,
      hat: HAT_CONFIGS.white,
      prdSummary: "Test PRD",
      previousTurns: [],
      roundInfo: "",
    });
    expect(user).toContain("기본 분석");
    expect(user).toContain("Turn 1/20");
  });

  it("buildTurnPrompt — Round 2 includes 심화 토론", () => {
    const { user } = buildTurnPrompt({
      turnNumber: 7,
      hat: HAT_CONFIGS.red,
      prdSummary: "Test PRD",
      previousTurns: [{ hat: "White Hat", content: "이전 분석 내용" }],
      roundInfo: "",
    });
    expect(user).toContain("심화 토론");
    expect(user).toContain("이전 분석 내용");
  });

  it("buildTurnPrompt — Round 3 includes 합의 수렴", () => {
    const { user } = buildTurnPrompt({
      turnNumber: 13,
      hat: HAT_CONFIGS.black,
      prdSummary: "Test PRD",
      previousTurns: [],
      roundInfo: "",
    });
    expect(user).toContain("합의 수렴");
  });

  it("buildTurnPrompt — Turn 20 includes 최종 종합", () => {
    const { system, user } = buildTurnPrompt({
      turnNumber: 20,
      hat: HAT_CONFIGS.blue,
      prdSummary: "Test PRD",
      previousTurns: [],
      roundInfo: "",
    });
    expect(user).toContain("최종 종합");
    expect(system).toContain("Blue Hat");
  });
});
