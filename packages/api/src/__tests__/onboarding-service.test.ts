import { describe, it, expect, beforeEach } from "vitest";
import { OnboardingProgressService, ONBOARDING_STEPS } from "../modules/portal/services/onboarding-progress.js";
import { createMockD1 } from "./helpers/mock-d1.js";

describe("OnboardingProgressService", () => {
  let db: D1Database;
  let service: OnboardingProgressService;

  beforeEach(() => {
    db = createMockD1() as unknown as D1Database;
    service = new OnboardingProgressService(db);
  });

  it("getProgress: new user gets 0% with all steps incomplete", async () => {
    const progress = await service.getProgress("org_test", "new-user");

    expect(progress.userId).toBe("new-user");
    expect(progress.completedSteps).toEqual([]);
    expect(progress.totalSteps).toBe(5);
    expect(progress.progressPercent).toBe(0);
    expect(progress.steps).toHaveLength(5);
    expect(progress.steps.every((s) => s.completed === false)).toBe(true);
  });

  it("completeStep: marks step complete, updates progressPercent", async () => {
    const result = await service.completeStep("org_test", "user-1", "view_dashboard");

    expect(result.success).toBe(true);
    expect(result.stepId).toBe("view_dashboard");
    expect(result.progressPercent).toBe(20); // 1/5 = 20%
    expect(result.allComplete).toBe(false);

    // Verify via getProgress
    const progress = await service.getProgress("org_test", "user-1");
    expect(progress.completedSteps).toContain("view_dashboard");
    const dashStep = progress.steps.find((s) => s.id === "view_dashboard");
    expect(dashStep?.completed).toBe(true);
  });

  it("completeStep: invalid stepId throws error", async () => {
    await expect(
      service.completeStep("org_test", "user-1", "invalid_step"),
    ).rejects.toThrow("Invalid stepId: invalid_step");
  });

  it("completeStep: completing all steps returns allComplete true", async () => {
    for (const step of ONBOARDING_STEPS) {
      await service.completeStep("org_test", "user-1", step.id);
    }

    // Complete last step again to get the result
    const lastStep = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]!;
    const result = await service.completeStep("org_test", "user-1", lastStep.id);
    expect(result.allComplete).toBe(true);
    expect(result.progressPercent).toBe(100);
  });
});
