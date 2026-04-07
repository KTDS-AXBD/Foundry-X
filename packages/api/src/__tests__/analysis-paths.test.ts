import { describe, it, expect } from "vitest";
import {
  STARTING_POINTS,
  ANALYSIS_PATHS,
  getAnalysisPath,
  type StartingPointType,
} from "../core/discovery/services/analysis-paths.js";

describe("analysis-paths", () => {
  it("getAnalysisPath(idea) — 8단계", () => {
    const path = getAnalysisPath("idea");
    expect(path.startingPoint).toBe("idea");
    expect(path.label).toBe("아이디어에서 시작");
    expect(path.steps).toHaveLength(8);
    expect(path.steps[1]!.pmSkills).toContain("/brainstorm");
  });

  it("getAnalysisPath(market) — 7단계", () => {
    const path = getAnalysisPath("market");
    expect(path.startingPoint).toBe("market");
    expect(path.steps).toHaveLength(7);
    expect(path.steps[1]!.pmSkills).toContain("/interview");
  });

  it("getAnalysisPath(problem) — 9단계", () => {
    const path = getAnalysisPath("problem");
    expect(path.startingPoint).toBe("problem");
    expect(path.steps).toHaveLength(9);
    expect(path.steps[1]!.pmSkills).toContain("/market-scan");
  });

  it("getAnalysisPath(tech) — 8단계", () => {
    const path = getAnalysisPath("tech");
    expect(path.startingPoint).toBe("tech");
    expect(path.steps).toHaveLength(8);
    expect(path.steps[7]!.pmSkills).toContain("/pre-mortem");
  });

  it("getAnalysisPath(service) — 4단계", () => {
    const path = getAnalysisPath("service");
    expect(path.startingPoint).toBe("service");
    expect(path.steps).toHaveLength(4);
    expect(path.steps[1]!.pmSkills).toContain("/business-model");
  });

  it("모든 경로 — discoveryMapping 값이 1~9 범위", () => {
    for (const sp of STARTING_POINTS) {
      const path = ANALYSIS_PATHS[sp];
      for (const step of path.steps) {
        for (const mapping of step.discoveryMapping) {
          expect(mapping).toBeGreaterThanOrEqual(1);
          expect(mapping).toBeLessThanOrEqual(9);
        }
      }
    }
  });

  it("모든 경로 — order가 1부터 순차 증가", () => {
    for (const sp of STARTING_POINTS) {
      const path = ANALYSIS_PATHS[sp];
      path.steps.forEach((step, idx) => {
        expect(step.order).toBe(idx + 1);
      });
    }
  });
});
