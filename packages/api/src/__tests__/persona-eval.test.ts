/**
 * Sprint 155 F344+F345: 멀티 페르소나 평가 API 테스트
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PersonaConfigService } from "../services/persona-config-service.js";
import { PersonaEvalService } from "../services/persona-eval-service.js";
import { DEMO_EVAL_DATA, getDemoFinalResult } from "../services/persona-eval-demo.js";
import { StartEvalSchema, ScoresSchema, VerdictEnum } from "../schemas/persona-eval.js";
import { WeightsSchema, PersonaConfigSchema, UpsertPersonaConfigsSchema } from "../schemas/persona-config.js";

// ─── Mock DB ───

function makeMockDb() {
  const store: Record<string, unknown[]> = {};
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ success: true }),
    }),
    batch: vi.fn().mockResolvedValue([]),
  } as unknown as D1Database;
}

// ─── Zod Schema Tests ───

describe("Zod Schemas", () => {
  it("WeightsSchema accepts valid weights", () => {
    const result = WeightsSchema.safeParse({
      businessViability: 15, strategicFit: 15, customerValue: 15,
      techMarket: 15, execution: 15, financialFeasibility: 15, competitiveDiff: 10,
    });
    expect(result.success).toBe(true);
  });

  it("WeightsSchema rejects out-of-range", () => {
    const result = WeightsSchema.safeParse({
      businessViability: 150, strategicFit: 15, customerValue: 15,
      techMarket: 15, execution: 15, financialFeasibility: 15, competitiveDiff: 10,
    });
    expect(result.success).toBe(false);
  });

  it("ScoresSchema accepts valid scores", () => {
    const result = ScoresSchema.safeParse({
      businessViability: 8.5, strategicFit: 9.0, customerValue: 7.5,
      techMarket: 8.0, execution: 7.0, financialFeasibility: 7.5,
      competitiveDiff: 8.5, scalability: 8.0,
    });
    expect(result.success).toBe(true);
  });

  it("VerdictEnum accepts valid values", () => {
    expect(VerdictEnum.safeParse("green").success).toBe(true);
    expect(VerdictEnum.safeParse("keep").success).toBe(true);
    expect(VerdictEnum.safeParse("red").success).toBe(true);
    expect(VerdictEnum.safeParse("invalid").success).toBe(false);
  });

  it("StartEvalSchema requires itemId", () => {
    const result = StartEvalSchema.safeParse({ configs: [], briefing: "" });
    expect(result.success).toBe(false);
  });

  it("PersonaConfigSchema accepts valid config", () => {
    const result = PersonaConfigSchema.safeParse({
      personaId: "strategy",
      weights: { businessViability: 15, strategicFit: 15, customerValue: 15, techMarket: 15, execution: 15, financialFeasibility: 15, competitiveDiff: 10 },
      context: { situation: "test", priorities: [], style: "neutral", redLines: [] },
    });
    expect(result.success).toBe(true);
  });

  it("UpsertPersonaConfigsSchema requires at least 1 config", () => {
    expect(UpsertPersonaConfigsSchema.safeParse({ configs: [] }).success).toBe(false);
    expect(UpsertPersonaConfigsSchema.safeParse({
      configs: [{ personaId: "strategy", weights: { businessViability: 15, strategicFit: 15, customerValue: 15, techMarket: 15, execution: 15, financialFeasibility: 15, competitiveDiff: 10 }, context: {} }],
    }).success).toBe(true);
  });
});

// ─── Demo Data Tests ───

describe("Demo Data", () => {
  it("DEMO_EVAL_DATA has 8 personas", () => {
    expect(Object.keys(DEMO_EVAL_DATA)).toHaveLength(8);
  });

  it("each demo persona has valid scores", () => {
    for (const [id, data] of Object.entries(DEMO_EVAL_DATA)) {
      expect(data.personaId).toBe(id);
      expect(Object.keys(data.scores)).toHaveLength(8);
      for (const score of Object.values(data.scores)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
      expect(["green", "keep", "red"]).toContain(data.verdict);
      expect(data.summary).toBeTruthy();
      expect(Array.isArray(data.concerns)).toBe(true);
    }
  });

  it("getDemoFinalResult computes correct verdict", () => {
    const result = getDemoFinalResult();
    expect(["green", "keep", "red"]).toContain(result.verdict);
    expect(result.avgScore).toBeGreaterThan(0);
    expect(result.scores).toHaveLength(8);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ─── PersonaConfigService Tests ───

describe("PersonaConfigService", () => {
  let db: D1Database;
  let service: PersonaConfigService;

  beforeEach(() => {
    db = makeMockDb();
    service = new PersonaConfigService(db);
  });

  it("getByItemId calls DB with correct params", async () => {
    await service.getByItemId("item-1", "org-1");
    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM ax_persona_configs"),
    );
  });

  it("upsertConfigs batches insert statements", async () => {
    await service.upsertConfigs("item-1", "org-1", [
      { personaId: "strategy", weights: { businessViability: 20, strategicFit: 15, customerValue: 15, techMarket: 15, execution: 15, financialFeasibility: 10, competitiveDiff: 10 }, context: { situation: "", priorities: [], style: "neutral", redLines: [] } },
      { personaId: "sales", weights: { businessViability: 15, strategicFit: 15, customerValue: 15, techMarket: 15, execution: 15, financialFeasibility: 15, competitiveDiff: 10 }, context: { situation: "", priorities: [], style: "neutral", redLines: [] } },
    ]);
    expect(db.batch).toHaveBeenCalledWith(expect.any(Array));
  });
});

// ─── PersonaEvalService Tests ───

describe("PersonaEvalService", () => {
  let db: D1Database;
  let service: PersonaEvalService;

  beforeEach(() => {
    db = makeMockDb();
    service = new PersonaEvalService(db);
  });

  it("getByItemId calls DB with correct params", async () => {
    await service.getByItemId("item-1", "org-1");
    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM ax_persona_evals"),
    );
  });

  it("createEvalStream returns a ReadableStream", () => {
    const stream = service.createEvalStream(
      "item-1", "org-1",
      [{ personaId: "strategy", weights: { businessViability: 15, strategicFit: 15, customerValue: 15, techMarket: 15, execution: 15, financialFeasibility: 15, competitiveDiff: 10 }, context: { situation: "", priorities: [], style: "neutral", redLines: [] } }],
      "test briefing",
      true, // demo mode
    );
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it("demo mode stream emits correct events", async () => {
    const stream = service.createEvalStream(
      "item-1", "org-1",
      [{ personaId: "strategy", weights: { businessViability: 15, strategicFit: 15, customerValue: 15, techMarket: 15, execution: 15, financialFeasibility: 15, competitiveDiff: 10 }, context: { situation: "", priorities: [], style: "neutral", redLines: [] } }],
      "test",
      true,
    );

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let output = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value);
    }

    expect(output).toContain("event: eval_start");
    expect(output).toContain("event: eval_complete");
    expect(output).toContain("event: final_result");
    expect(output).toContain("event: done");
    expect(output).toContain('"personaId":"strategy"');
  });
});
