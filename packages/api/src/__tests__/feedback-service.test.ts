import { describe, it, expect, beforeEach } from "vitest";
import { FeedbackService } from "../modules/portal/services/feedback.js";
import { createMockD1 } from "./helpers/mock-d1.js";

describe("FeedbackService", () => {
  let db: D1Database;
  let service: FeedbackService;

  beforeEach(() => {
    db = createMockD1() as unknown as D1Database;
    service = new FeedbackService(db);
  });

  it("submit: stores feedback and returns id", async () => {
    const result = await service.submit("org_test", "user-1", 8, "Great product!");

    expect(result.id).toMatch(/^fb-/);
    expect(result.npsScore).toBe(8);

    // Verify stored in DB
    const summary = await service.getSummary("org_test");
    expect(summary.totalResponses).toBe(1);
    expect(summary.recentFeedback[0]!.comment).toBe("Great product!");
  });

  it("submit: same user can submit multiple times", async () => {
    await service.submit("org_test", "user-1", 7, "First");
    await service.submit("org_test", "user-1", 9, "Second");

    const summary = await service.getSummary("org_test");
    expect(summary.totalResponses).toBe(2);
  });

  it("getSummary: calculates average correctly", async () => {
    await service.submit("org_test", "user-1", 8);
    await service.submit("org_test", "user-2", 6);
    await service.submit("org_test", "user-3", 10);

    const summary = await service.getSummary("org_test");
    expect(summary.averageNps).toBe(8); // (8+6+10)/3 = 8.0
    expect(summary.totalResponses).toBe(3);
    expect(summary.recentFeedback).toHaveLength(3);
  });

  it("getSummary: returns defaults when no data", async () => {
    const summary = await service.getSummary("org_test");

    expect(summary.averageNps).toBe(0);
    expect(summary.totalResponses).toBe(0);
    expect(summary.recentFeedback).toEqual([]);
  });
});
