/**
 * Sprint 59 F191: MethodologyRegistry unit tests
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MethodologyRegistry } from "../services/methodology-registry.js";
import type { MethodologyModule, BizItemContext } from "../services/methodology-module.js";

function createMockModule(overrides: Partial<MethodologyModule> & { id: string }): MethodologyModule {
  return {
    name: overrides.id,
    description: `${overrides.id} module`,
    version: "1.0.0",
    matchScore: vi.fn().mockResolvedValue(0.5),
    classifyItem: vi.fn(),
    getAnalysisSteps: () => [],
    getCriteria: () => [],
    checkGate: vi.fn(),
    getReviewMethods: () => [],
    ...overrides,
  };
}

const testItem: BizItemContext = {
  id: "item-1",
  title: "테스트 아이템",
  description: "설명",
  source: "field",
};

describe("MethodologyRegistry", () => {
  beforeEach(() => {
    MethodologyRegistry.resetForTest();
  });

  it("getInstance returns singleton", () => {
    const a = MethodologyRegistry.getInstance();
    const b = MethodologyRegistry.getInstance();
    expect(a).toBe(b);
  });

  it("register and get", () => {
    const reg = MethodologyRegistry.getInstance();
    const mod = createMockModule({ id: "bdp" });
    reg.register(mod);
    expect(reg.get("bdp")).toBe(mod);
  });

  it("duplicate register throws", () => {
    const reg = MethodologyRegistry.getInstance();
    reg.register(createMockModule({ id: "bdp" }));
    expect(() => reg.register(createMockModule({ id: "bdp" }))).toThrow("already registered");
  });

  it("unregister removes module", () => {
    const reg = MethodologyRegistry.getInstance();
    reg.register(createMockModule({ id: "bdp" }));
    expect(reg.unregister("bdp")).toBe(true);
    expect(reg.get("bdp")).toBeUndefined();
  });

  it("getAll returns all modules", () => {
    const reg = MethodologyRegistry.getInstance();
    reg.register(createMockModule({ id: "a" }));
    reg.register(createMockModule({ id: "b" }));
    expect(reg.getAll()).toHaveLength(2);
  });

  it("getAllMeta returns metadata with counts", () => {
    const reg = MethodologyRegistry.getInstance();
    reg.register(
      createMockModule({
        id: "bdp",
        getCriteria: () => [
          { id: 1, name: "c1", condition: "cond", relatedTools: [] },
          { id: 2, name: "c2", condition: "cond", relatedTools: [] },
        ],
        getReviewMethods: () => [
          { id: "r1", name: "리뷰1", type: "ai-review", description: "desc" },
        ],
      }),
    );
    const meta = reg.getAllMeta();
    expect(meta).toHaveLength(1);
    expect(meta[0]!.criteriaCount).toBe(2);
    expect(meta[0]!.reviewMethodCount).toBe(1);
    expect(meta[0]!.isActive).toBe(true);
  });

  it("recommend returns sorted by matchScore descending", async () => {
    const reg = MethodologyRegistry.getInstance();
    reg.register(createMockModule({ id: "low", matchScore: vi.fn().mockResolvedValue(0.3) }));
    reg.register(createMockModule({ id: "high", matchScore: vi.fn().mockResolvedValue(0.9) }));
    reg.register(createMockModule({ id: "mid", matchScore: vi.fn().mockResolvedValue(0.6) }));

    const recs = await reg.recommend(testItem);
    expect(recs.map((r) => r.methodologyId)).toEqual(["high", "mid", "low"]);
    expect(recs[0]!.matchScore).toBe(0.9);
  });

  it("findBest returns highest score module", async () => {
    const reg = MethodologyRegistry.getInstance();
    reg.register(createMockModule({ id: "a", matchScore: vi.fn().mockResolvedValue(0.4) }));
    reg.register(createMockModule({ id: "b", matchScore: vi.fn().mockResolvedValue(0.8) }));

    const best = await reg.findBest(testItem);
    expect(best?.methodologyId).toBe("b");
    expect(best?.matchScore).toBe(0.8);
  });

  it("resetForTest clears singleton", () => {
    const a = MethodologyRegistry.getInstance();
    a.register(createMockModule({ id: "x" }));
    MethodologyRegistry.resetForTest();
    const b = MethodologyRegistry.getInstance();
    expect(b.getAll()).toHaveLength(0);
  });
});
