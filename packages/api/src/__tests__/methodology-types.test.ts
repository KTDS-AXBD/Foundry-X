import { describe, it, expect, beforeEach } from "vitest";
import {
  registerMethodology,
  getMethodology,
  getAllMethodologies,
  recommendMethodology,
  clearRegistry,
  type MethodologyModule,
  type MethodologyRegistryEntry,
} from "../core/offering/services/methodology-types.js";

function createMockModule(id: string, name: string, baseScore: number): MethodologyModule {
  return {
    id,
    name,
    description: `${name} description`,
    version: "1.0.0",
    classifyItem: async () => ({
      methodologyId: id,
      entryPoint: "discovery",
      confidence: 0.8,
      reasoning: "test",
      metadata: {},
    }),
    getAnalysisSteps: () => [],
    getCriteria: () => [],
    checkGate: async () => ({
      gateStatus: "blocked" as const,
      completedCount: 0,
      totalCount: 5,
      requiredMissing: 5,
      details: [],
    }),
    getReviewMethods: () => [],
    matchScore: () => baseScore,
  };
}

describe("MethodologyRegistry (F193)", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registerMethodology + getMethodology", () => {
    const mod = createMockModule("test-1", "Test Method", 50);
    registerMethodology({
      id: mod.id, name: mod.name, description: mod.description,
      version: mod.version, isDefault: false,
      matchScore: mod.matchScore, module: mod,
    });

    const retrieved = getMethodology("test-1");
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe("test-1");
  });

  it("getMethodology — 미등록 시 undefined", () => {
    expect(getMethodology("nonexistent")).toBeUndefined();
  });

  it("getAllMethodologies — 빈 레지스트리", () => {
    expect(getAllMethodologies()).toEqual([]);
  });

  it("getAllMethodologies — 등록된 모듈 반환", () => {
    const mod1 = createMockModule("m1", "Method 1", 50);
    const mod2 = createMockModule("m2", "Method 2", 70);
    registerMethodology({ id: "m1", name: "Method 1", description: "", version: "1.0.0", isDefault: true, matchScore: mod1.matchScore, module: mod1 });
    registerMethodology({ id: "m2", name: "Method 2", description: "", version: "1.0.0", isDefault: false, matchScore: mod2.matchScore, module: mod2 });

    const all = getAllMethodologies();
    expect(all).toHaveLength(2);
  });

  it("recommendMethodology — 점수 내림차순 정렬", () => {
    const mod1 = createMockModule("low", "Low Score", 30);
    const mod2 = createMockModule("high", "High Score", 90);
    registerMethodology({ id: "low", name: "Low Score", description: "", version: "1.0.0", isDefault: false, matchScore: () => 30, module: mod1 });
    registerMethodology({ id: "high", name: "High Score", description: "", version: "1.0.0", isDefault: false, matchScore: () => 90, module: mod2 });

    const recs = recommendMethodology({ title: "test", description: null, source: "field" });
    expect(recs[0]!.id).toBe("high");
    expect(recs[0]!.score).toBe(90);
    expect(recs[1]!.id).toBe("low");
    expect(recs[1]!.score).toBe(30);
  });

  it("registerMethodology — 동일 ID 덮어쓰기", () => {
    const mod1 = createMockModule("dup", "Version 1", 50);
    const mod2 = createMockModule("dup", "Version 2", 80);
    registerMethodology({ id: "dup", name: "V1", description: "", version: "1.0.0", isDefault: false, matchScore: () => 50, module: mod1 });
    registerMethodology({ id: "dup", name: "V2", description: "", version: "2.0.0", isDefault: false, matchScore: () => 80, module: mod2 });

    const all = getAllMethodologies();
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe("V2");
  });
});
