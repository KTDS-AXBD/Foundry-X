import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DiscoveryPipelineService } from "../core/discovery/services/discovery-pipeline-service.js";

describe("DiscoveryPipelineService (F312)", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: DiscoveryPipelineService;

  beforeEach(() => {
    db = createMockD1();
    svc = new DiscoveryPipelineService(db as unknown as D1Database);
  });

  it("creates a pipeline run with idle status", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "manual",
      maxRetries: 3,
    });
    expect(run.id).toBeDefined();
    expect(run.status).toBe("idle");
    expect(run.bizItemId).toBe("biz-1");
    expect(run.triggerMode).toBe("manual");
  });

  it("starts a run transitioning idle → discovery_running", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "manual",
      maxRetries: 3,
    });
    const result = await svc.startRun(run.id, "user-1");
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("discovery_running");
  });

  it("getRun returns run with events", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "manual",
      maxRetries: 3,
    });
    await svc.startRun(run.id, "user-1");

    const detail = await svc.getRun(run.id, "org_test");
    expect(detail).not.toBeNull();
    expect(detail!.events.length).toBeGreaterThan(0);
    expect(detail!.validEvents).toContain("STEP_COMPLETE");
  });

  it("getRun returns null for non-existent id", async () => {
    const detail = await svc.getRun("nonexistent", "org_test");
    expect(detail).toBeNull();
  });

  it("listRuns paginates correctly", async () => {
    for (let i = 0; i < 3; i++) {
      await svc.createRun("org_test", "user-1", {
        bizItemId: `biz-${i}`,
        triggerMode: "manual",
        maxRetries: 3,
      });
    }
    const result = await svc.listRuns("org_test", { limit: 2, offset: 0 });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  it("reportStepComplete on 2-10 signals shouldTriggerShaping", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "auto",
      maxRetries: 3,
    });
    await svc.startRun(run.id, "user-1");

    // simulate mid-steps
    for (let i = 0; i <= 9; i++) {
      await svc.reportStepComplete(run.id, `2-${i}`, undefined, "user-1");
    }

    // step 2-10 → should trigger shaping
    const result = await svc.reportStepComplete(run.id, "2-10", { summary: "done" }, "user-1");
    expect(result.shouldTriggerShaping).toBe(true);
    expect(result.toStatus).toBe("discovery_complete");
  });

  it("reportStepFailed increases retry count", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "manual",
      maxRetries: 3,
    });
    await svc.startRun(run.id, "user-1");

    const result = await svc.reportStepFailed(run.id, "2-3", "NET_ERR", "Connection timeout", "user-1");
    expect(result.retryCount).toBe(1);
    expect(result.retryable).toBe(true);
  });

  it("handleAction with abort transitions to aborted", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "manual",
      maxRetries: 3,
    });
    await svc.startRun(run.id, "user-1");

    const result = await svc.handleAction(run.id, { action: "abort", reason: "user requested" }, "user-1");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("aborted");
  });

  it("pauseRun and resumeRun work correctly", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "manual",
      maxRetries: 3,
    });
    await svc.startRun(run.id, "user-1");

    const pauseResult = await svc.pauseRun(run.id, "user-1");
    expect(pauseResult.valid).toBe(true);
    expect(pauseResult.toStatus).toBe("paused");

    const resumeResult = await svc.resumeRun(run.id, "user-1");
    expect(resumeResult.valid).toBe(true);
  });

  it("triggerShaping moves discovery_complete → shaping_queued", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "manual",
      maxRetries: 3,
    });
    await svc.startRun(run.id, "user-1");

    // go through discovery
    for (let i = 0; i <= 10; i++) {
      await svc.reportStepComplete(run.id, `2-${i}`, undefined, "user-1");
    }

    const result = await svc.triggerShaping(run.id, "user-1");
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("shaping_queued");
  });

  it("getEvents returns all events for a run", async () => {
    const run = await svc.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "manual",
      maxRetries: 3,
    });
    await svc.startRun(run.id, "user-1");
    await svc.reportStepComplete(run.id, "2-0", undefined, "user-1");

    const events = await svc.getEvents(run.id);
    expect(events.length).toBeGreaterThanOrEqual(2); // START + STEP_COMPLETE
    expect(events[0]!.eventType).toBe("START");
  });
});
