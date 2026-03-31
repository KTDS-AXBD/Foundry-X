import { describe, it, expect } from "vitest";
import { buildTourSteps, BASE_STEPS, ADMIN_EXTRA_STEPS, MEMBER_EXTRA_STEPS } from "../components/feature/OnboardingTour";

describe("OnboardingTour role-based steps (F252)", () => {
  it("admin tour has base + admin extra + finish = 11 steps", () => {
    const steps = buildTourSteps(true);
    expect(steps).toHaveLength(BASE_STEPS.length + ADMIN_EXTRA_STEPS.length + 1);
    expect(steps).toHaveLength(11);
    expect(steps[steps.length - 1].title).toContain("투어 완료");
  });

  it("member tour has base + member extra + finish = 8 steps", () => {
    const steps = buildTourSteps(false);
    expect(steps).toHaveLength(BASE_STEPS.length + MEMBER_EXTRA_STEPS.length + 1);
    expect(steps).toHaveLength(8);
    expect(steps[steps.length - 1].title).toContain("투어 완료");
  });

  it("admin tour includes settings and agent steps", () => {
    const steps = buildTourSteps(true);
    const targets = steps.map((s) => s.target);
    expect(targets).toContain("settings");
    expect(targets).toContain("agents");
    expect(targets).toContain("tokens");
  });

  it("member tour does not include admin-specific steps", () => {
    const steps = buildTourSteps(false);
    const targets = steps.map((s) => s.target);
    expect(targets).not.toContain("agents");
    expect(targets).not.toContain("tokens");
  });

  it("both tours start with getting-started", () => {
    expect(buildTourSteps(true)[0].target).toBe("getting-started");
    expect(buildTourSteps(false)[0].target).toBe("getting-started");
  });
});
