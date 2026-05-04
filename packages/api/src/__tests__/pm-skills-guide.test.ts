import { describe, it, expect } from "vitest";
import { PM_SKILLS_GUIDES, getSkillGuide, getGuidesForCriterion } from "../core/discovery/services/pm-skills-guide.js";

describe("PmSkillsGuide (F184)", () => {
  it("PM_SKILLS_GUIDES — 10개 스킬 가이드 존재", () => {
    expect(PM_SKILLS_GUIDES).toHaveLength(10);
  });

  it("getSkillGuide — 존재하는 스킬 조회", () => {
    const guide = getSkillGuide("/interview");
    expect(guide).toBeDefined();
    expect(guide!.name).toBe("고객 인터뷰 설계 + 분석");
    expect(guide!.relatedCriteria).toContain(1);
  });

  it("getSkillGuide — 미존재 스킬 → undefined", () => {
    const guide = getSkillGuide("/nonexistent");
    expect(guide).toBeUndefined();
  });

  it("getGuidesForCriterion — 기준 1 관련 스킬", () => {
    const guides = getGuidesForCriterion(1);
    expect(guides.length).toBeGreaterThanOrEqual(2);
    const skills = guides.map((g) => g.skill);
    expect(skills).toContain("/interview");
    expect(skills).toContain("/research-users");
  });

  it("getGuidesForCriterion — 기준 5 관련 스킬", () => {
    const guides = getGuidesForCriterion(5);
    expect(guides.length).toBeGreaterThanOrEqual(1);
    expect(guides[0]!.skill).toBe("/business-model");
  });

  it("모든 스킬에 필수 필드 존재", () => {
    for (const guide of PM_SKILLS_GUIDES) {
      expect(guide.skill).toBeTruthy();
      expect(guide.name).toBeTruthy();
      expect(guide.purpose).toBeTruthy();
      expect(guide.inputExample).toBeTruthy();
      expect(guide.expectedOutput).toBeTruthy();
      expect(guide.tips.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(guide.relatedCriteria)).toBe(true);
    }
  });
});
