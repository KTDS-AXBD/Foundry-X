import { describe, it, expect } from "vitest";
import {
  detectEntryPoint,
  buildAnalysisSteps,
  getNextExecutableSkills,
  computeSkillScores,
  SKILL_DEPENDENCIES,
  ENTRY_POINT_ORDERS,
} from "../services/pm-skills-pipeline.js";

describe("PmSkillsPipeline (F193)", () => {
  describe("detectEntryPoint", () => {
    it("기본값 — discovery", () => {
      const entry = detectEntryPoint({ title: "새로운 사업 아이디어", description: null });
      expect(entry).toBe("discovery");
    });

    it("검증 키워드 → validation", () => {
      expect(detectEntryPoint({ title: "가설 검증 프로젝트", description: null })).toBe("validation");
      expect(detectEntryPoint({ title: "MVP 테스트", description: null })).toBe("validation");
      expect(detectEntryPoint({ title: "피봇 검토", description: null })).toBe("validation");
    });

    it("확장 키워드 → expansion", () => {
      expect(detectEntryPoint({ title: "기존 서비스 확장", description: null })).toBe("expansion");
      expect(detectEntryPoint({ title: "업그레이드 계획", description: null })).toBe("expansion");
    });

    it("description 포함 검색", () => {
      const entry = detectEntryPoint({ title: "프로젝트 A", description: "기존 운영 시스템 개선" });
      expect(entry).toBe("expansion");
    });
  });

  describe("buildAnalysisSteps", () => {
    it("discovery — 9개 스텝", () => {
      const steps = buildAnalysisSteps("discovery");
      expect(steps).toHaveLength(9);
      expect(steps[0]!.skill).toBe("/interview");
      expect(steps[0]!.order).toBe(1);
    });

    it("validation — 5개 스텝", () => {
      const steps = buildAnalysisSteps("validation");
      expect(steps).toHaveLength(5);
      expect(steps[0]!.skill).toBe("/pre-mortem");
    });

    it("expansion — 5개 스텝", () => {
      const steps = buildAnalysisSteps("expansion");
      expect(steps).toHaveLength(5);
      expect(steps[0]!.skill).toBe("/market-scan");
    });

    it("completedSkills 반영", () => {
      const steps = buildAnalysisSteps("discovery", ["/interview"]);
      expect(steps[0]!.isCompleted).toBe(true);
      expect(steps[1]!.isCompleted).toBe(false);
    });

    it("각 스텝에 dependencies 존재", () => {
      const steps = buildAnalysisSteps("discovery");
      for (const step of steps) {
        expect(Array.isArray(step.dependencies)).toBe(true);
      }
    });
  });

  describe("getNextExecutableSkills", () => {
    it("초기 — 의존성 없는 스킬만 반환", () => {
      const next = getNextExecutableSkills("discovery", []);
      expect(next).toContain("/interview");
      expect(next).toContain("/research-users");
      expect(next).toContain("/market-scan");
      expect(next).not.toContain("/competitive-analysis"); // market-scan 의존
    });

    it("market-scan 완료 후 — competitive-analysis 실행 가능", () => {
      const next = getNextExecutableSkills("discovery", ["/market-scan"]);
      expect(next).toContain("/competitive-analysis");
    });

    it("모든 의존성 충족 시 — value-proposition 실행 가능", () => {
      const next = getNextExecutableSkills("discovery", [
        "/interview", "/market-scan", "/competitive-analysis",
      ]);
      expect(next).toContain("/value-proposition");
    });

    it("이미 완료된 스킬은 제외", () => {
      const next = getNextExecutableSkills("discovery", ["/interview"]);
      expect(next).not.toContain("/interview");
    });
  });

  describe("computeSkillScores", () => {
    it("기본 점수 50 — 키워드 없는 경우", () => {
      const scores = computeSkillScores({ title: "아무 관련 없는 주제", description: null });
      expect(scores["/interview"]).toBe(50);
    });

    it("키워드 매칭 시 점수 증가", () => {
      const scores = computeSkillScores({ title: "고객 인터뷰 기반 pain point 분석", description: null });
      expect(scores["/interview"]).toBeGreaterThan(50);
    });

    it("최대 100 제한", () => {
      const scores = computeSkillScores({
        title: "고객 인터뷰 pain 문제 니즈 jtbd 분석",
        description: "고객 pain point 문제 분석 니즈 jtbd",
      });
      expect(scores["/interview"]).toBeLessThanOrEqual(100);
    });

    it("모든 스킬에 점수 존재", () => {
      const scores = computeSkillScores({ title: "test", description: null });
      expect(Object.keys(scores).length).toBe(10);
    });
  });

  describe("SKILL_DEPENDENCIES", () => {
    it("루트 스킬은 의존성 없음", () => {
      expect(SKILL_DEPENDENCIES["/interview"]).toEqual([]);
      expect(SKILL_DEPENDENCIES["/research-users"]).toEqual([]);
      expect(SKILL_DEPENDENCIES["/market-scan"]).toEqual([]);
      expect(SKILL_DEPENDENCIES["/brainstorm"]).toEqual([]);
    });

    it("파생 스킬은 의존성 있음", () => {
      expect(SKILL_DEPENDENCIES["/competitive-analysis"]).toContain("/market-scan");
      expect(SKILL_DEPENDENCIES["/value-proposition"]).toContain("/interview");
    });
  });

  describe("ENTRY_POINT_ORDERS", () => {
    it("3가지 진입점 존재", () => {
      expect(Object.keys(ENTRY_POINT_ORDERS)).toEqual(["discovery", "validation", "expansion"]);
    });
  });
});
