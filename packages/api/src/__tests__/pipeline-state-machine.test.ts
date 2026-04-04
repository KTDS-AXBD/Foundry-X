import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PipelineStateMachine } from "../services/pipeline-state-machine.js";

describe("PipelineStateMachine (F313)", () => {
  let db: ReturnType<typeof createMockD1>;
  let fsm: PipelineStateMachine;

  function createRun(status = "idle", step: string | null = null, retryCount = 0) {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO discovery_pipeline_runs (id, tenant_id, biz_item_id, status, current_step, retry_count, max_retries, created_by)
       VALUES (?, 'org_test', 'biz-1', ?, ?, ?, 3, 'user-1')`,
    ).bind(id, status, step, retryCount).run();
    return id;
  }

  beforeEach(() => {
    db = createMockD1();
    fsm = new PipelineStateMachine(db as unknown as D1Database);
  });

  it("idle → discovery_running on START", async () => {
    const id = createRun("idle");
    const result = await fsm.transition(id, "START", { stepId: "2-0" });
    expect(result.valid).toBe(true);
    expect(result.fromStatus).toBe("idle");
    expect(result.toStatus).toBe("discovery_running");
  });

  it("discovery_running → discovery_complete on STEP_COMPLETE(2-10)", async () => {
    const id = createRun("discovery_running", "2-9");
    const result = await fsm.transition(id, "STEP_COMPLETE", { stepId: "2-10" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("discovery_complete");
  });

  it("discovery_running stays on STEP_COMPLETE(2-3) mid-step", async () => {
    const id = createRun("discovery_running", "2-2");
    const result = await fsm.transition(id, "STEP_COMPLETE", { stepId: "2-3" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("discovery_running");
  });

  it("discovery_running → failed on STEP_FAILED with retries exhausted", async () => {
    const id = createRun("discovery_running", "2-3", 3); // retryCount=3, maxRetries=3
    const result = await fsm.transition(id, "STEP_FAILED", { stepId: "2-3" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("failed");
  });

  it("discovery_running stays on STEP_FAILED with retries remaining", async () => {
    const id = createRun("discovery_running", "2-3", 1); // retryCount=1, maxRetries=3
    const result = await fsm.transition(id, "STEP_FAILED", { stepId: "2-3" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("discovery_running");
  });

  it("discovery_complete → shaping_queued on TRIGGER_SHAPING", async () => {
    const id = createRun("discovery_complete", "2-10");
    const result = await fsm.transition(id, "TRIGGER_SHAPING");
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("shaping_queued");
  });

  it("shaping_queued → shaping_running on START", async () => {
    const id = createRun("shaping_queued");
    const result = await fsm.transition(id, "START", { stepId: "phase-A" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("shaping_running");
  });

  it("shaping_running → shaping_complete on SHAPING_PHASE_COMPLETE(phase-F)", async () => {
    const id = createRun("shaping_running", "phase-E");
    const result = await fsm.transition(id, "SHAPING_PHASE_COMPLETE", { stepId: "phase-F" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("shaping_complete");
  });

  it("shaping_running stays on SHAPING_PHASE_COMPLETE(phase-B) mid-phase", async () => {
    const id = createRun("shaping_running", "phase-A");
    const result = await fsm.transition(id, "SHAPING_PHASE_COMPLETE", { stepId: "phase-B" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("shaping_running");
  });

  it("any non-terminal → aborted on ABORT", async () => {
    for (const status of ["discovery_running", "paused", "failed", "shaping_running"] as const) {
      const id = createRun(status);
      const result = await fsm.transition(id, "ABORT");
      expect(result.valid).toBe(true);
      expect(result.toStatus).toBe("aborted");
    }
  });

  it("rejects invalid transition from idle", async () => {
    const id = createRun("idle");
    const result = await fsm.transition(id, "STEP_COMPLETE", { stepId: "2-0" });
    expect(result.valid).toBe(false);
  });

  it("getValidEvents returns correct events for each status", () => {
    expect(fsm.getValidEvents("idle")).toContain("START");
    expect(fsm.getValidEvents("discovery_running")).toContain("STEP_COMPLETE");
    expect(fsm.getValidEvents("discovery_complete")).toContain("TRIGGER_SHAPING");
    expect(fsm.getValidEvents("shaping_complete")).toHaveLength(0);
  });

  it("isTerminal correctly identifies terminal states", () => {
    expect(fsm.isTerminal("shaping_complete")).toBe(true);
    expect(fsm.isTerminal("aborted")).toBe(true);
    expect(fsm.isTerminal("discovery_running")).toBe(false);
    expect(fsm.isTerminal("idle")).toBe(false);
  });

  it("records events in pipeline_events table", async () => {
    const id = createRun("idle");
    await fsm.transition(id, "START", { stepId: "2-0" }, "user-1");

    const events = await db.prepare(
      "SELECT * FROM pipeline_events WHERE pipeline_run_id = ?",
    ).bind(id).all();
    expect(events.results).toHaveLength(1);
    expect((events.results[0] as any).event_type).toBe("START");
    expect((events.results[0] as any).from_status).toBe("idle");
    expect((events.results[0] as any).to_status).toBe("discovery_running");
  });

  it("paused → discovery_running on RESUME with discovery step", async () => {
    const id = createRun("paused", "2-5");
    const result = await fsm.transition(id, "RESUME", { stepId: "2-5" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("discovery_running");
  });

  it("paused → shaping_running on RESUME with shaping step", async () => {
    const id = createRun("paused", "phase-C");
    const result = await fsm.transition(id, "RESUME", { stepId: "phase-C" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("shaping_running");
  });

  it("failed → discovery_running on RETRY with discovery step", async () => {
    const id = createRun("failed", "2-5");
    const result = await fsm.transition(id, "RETRY", { stepId: "2-5" });
    expect(result.valid).toBe(true);
    expect(result.toStatus).toBe("discovery_running");
  });
});
