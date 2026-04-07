import { describe, it, expect } from "vitest";
import {
  getAnalysisPathV82,
  ANALYSIS_PATH_MAP,
  VIABILITY_QUESTIONS,
  COMMIT_GATE_QUESTIONS,
  STAGES,
  DISCOVERY_TYPES,
  DISCOVERY_TYPE_NAMES,
  STAGE_NAMES,
  type DiscoveryType,
  type Stage,
} from "../core/discovery/services/analysis-path-v82.js";

describe("analysis-path-v82", () => {
  describe("ANALYSIS_PATH_MAP", () => {
    it("has all 7 stages", () => {
      expect(Object.keys(ANALYSIS_PATH_MAP)).toHaveLength(7);
    });

    it("has all 5 discovery types per stage", () => {
      for (const stage of STAGES) {
        expect(Object.keys(ANALYSIS_PATH_MAP[stage])).toHaveLength(5);
        for (const type of DISCOVERY_TYPES) {
          expect(["core", "normal", "light"]).toContain(ANALYSIS_PATH_MAP[stage][type]);
        }
      }
    });

    it("I type: 2-1 is light, 2-2 is core", () => {
      expect(ANALYSIS_PATH_MAP["2-1"].I).toBe("light");
      expect(ANALYSIS_PATH_MAP["2-2"].I).toBe("core");
    });

    it("T type: 2-1 is core (기술 기반 산업별 문제 조사)", () => {
      expect(ANALYSIS_PATH_MAP["2-1"].T).toBe("core");
    });

    it("S type: 2-1 is core, 2-2 is light, 2-7 is core", () => {
      expect(ANALYSIS_PATH_MAP["2-1"].S).toBe("core");
      expect(ANALYSIS_PATH_MAP["2-2"].S).toBe("light");
      expect(ANALYSIS_PATH_MAP["2-7"].S).toBe("core");
    });
  });

  describe("VIABILITY_QUESTIONS", () => {
    it("has questions for all 7 stages", () => {
      expect(Object.keys(VIABILITY_QUESTIONS)).toHaveLength(7);
    });

    it("2-5 is Commit Gate (별도 플로우)", () => {
      expect(VIABILITY_QUESTIONS["2-5"]).toContain("Commit Gate");
    });

    it("2-1 question matches v8.2 spec", () => {
      expect(VIABILITY_QUESTIONS["2-1"]).toContain("뭔가 다르게 할 수 있는 부분");
    });
  });

  describe("COMMIT_GATE_QUESTIONS", () => {
    it("has exactly 4 questions", () => {
      expect(COMMIT_GATE_QUESTIONS).toHaveLength(4);
    });

    it("first question asks about 4-week investment", () => {
      expect(COMMIT_GATE_QUESTIONS[0]).toContain("4주");
    });
  });

  describe("getAnalysisPathV82", () => {
    it("returns correct path for type I", () => {
      const path = getAnalysisPathV82("I");
      expect(path.discoveryType).toBe("I");
      expect(path.typeName).toBe("아이디어형");
      expect(path.stages).toHaveLength(7);
      expect(path.commitGateQuestions).toHaveLength(4);
    });

    it("returns correct path for type P with core stages", () => {
      const path = getAnalysisPathV82("P");
      expect(path.typeName).toBe("고객문제형");

      // P type has most stages as core
      const coreStages = path.stages.filter((s) => s.intensity === "core");
      expect(coreStages.length).toBeGreaterThanOrEqual(5);
    });

    it("each stage has correct name and question", () => {
      const path = getAnalysisPathV82("M");
      for (const stage of path.stages) {
        expect(STAGE_NAMES[stage.stage as Stage]).toBe(stage.stageName);
        expect(VIABILITY_QUESTIONS[stage.stage as Stage]).toBe(stage.question);
      }
    });

    it("all discovery types produce valid paths", () => {
      for (const type of DISCOVERY_TYPES) {
        const path = getAnalysisPathV82(type);
        expect(path.discoveryType).toBe(type);
        expect(path.typeName).toBe(DISCOVERY_TYPE_NAMES[type]);
        expect(path.stages).toHaveLength(7);
      }
    });
  });
});
