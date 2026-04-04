import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { ShapingOrchestratorService } from "../services/shaping-orchestrator-service.js";

describe("ShapingOrchestratorService (F312)", () => {
  let db: ReturnType<typeof createMockD1>;
  let orchestrator: ShapingOrchestratorService;

  function createPipelineRun(status = "shaping_queued") {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO discovery_pipeline_runs (id, tenant_id, biz_item_id, status, trigger_mode, created_by)
       VALUES (?, 'org_test', 'biz-1', ?, 'auto', 'user-1')`,
    ).bind(id, status).run();
    return id;
  }

  function seedArtifacts(bizItemId: string, count = 3) {
    for (let i = 0; i < count; i++) {
      db.prepare(
        `INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, status, output_text, model, created_by, created_at, updated_at)
         VALUES (?, 'org_test', ?, ?, ?, 1, 'completed', 'output text', 'test-model', 'user-1', datetime('now'), datetime('now'))`,
      ).bind(crypto.randomUUID(), bizItemId, `skill-${i}`, `2-${i}`).run();
    }
  }

  beforeEach(() => {
    db = createMockD1();
    orchestrator = new ShapingOrchestratorService(db as unknown as D1Database);
  });

  it("collectDiscoveryArtifacts returns bundled artifacts", async () => {
    seedArtifacts("biz-1", 5);
    const bundle = await orchestrator.collectDiscoveryArtifacts("biz-1");
    expect(bundle.bizItemId).toBe("biz-1");
    expect(bundle.artifacts).toHaveLength(5);
    expect(bundle.summary).toContain("2-0");
  });

  it("collectDiscoveryArtifacts returns empty for no artifacts", async () => {
    const bundle = await orchestrator.collectDiscoveryArtifacts("biz-empty");
    expect(bundle.artifacts).toHaveLength(0);
    expect(bundle.summary).toBe("");
  });

  it("startAutoShaping creates shaping run + Phase A log", async () => {
    const pipelineRunId = createPipelineRun("shaping_queued");
    seedArtifacts("biz-1", 3);

    const shapingRunId = await orchestrator.startAutoShaping(
      pipelineRunId,
      "biz-1",
      "org_test",
      { mode: "auto", maxIterations: 3 },
    );

    expect(shapingRunId).toBeDefined();

    // Verify shaping_runs created
    const run = await db.prepare("SELECT * FROM shaping_runs WHERE id = ?").bind(shapingRunId).first();
    expect(run).not.toBeNull();
    expect((run as any).mode).toBe("auto");

    // Verify phase log created for Phase A
    const logs = await db.prepare("SELECT * FROM shaping_phase_logs WHERE run_id = ?").bind(shapingRunId).all();
    expect(logs.results).toHaveLength(1);
    expect((logs.results[0] as any).phase).toBe("A");
  });

  it("startAutoShaping links shaping_run_id to pipeline run", async () => {
    const pipelineRunId = createPipelineRun("shaping_queued");
    seedArtifacts("biz-1");

    const shapingRunId = await orchestrator.startAutoShaping(
      pipelineRunId,
      "biz-1",
      "org_test",
    );

    const pipelineRun = await db.prepare(
      "SELECT shaping_run_id FROM discovery_pipeline_runs WHERE id = ?",
    ).bind(pipelineRunId).first();
    expect((pipelineRun as any).shaping_run_id).toBe(shapingRunId);
  });

  it("advancePhase A→B creates next phase log", async () => {
    const pipelineRunId = createPipelineRun("shaping_running");
    seedArtifacts("biz-1");

    const shapingRunId = await orchestrator.startAutoShaping(
      pipelineRunId,
      "biz-1",
      "org_test",
    );

    // Advance to fix pipeline status for SHAPING_PHASE_COMPLETE
    await db.prepare("UPDATE discovery_pipeline_runs SET status = 'shaping_running' WHERE id = ?").bind(pipelineRunId).run();

    const result = await orchestrator.advancePhase(shapingRunId, pipelineRunId, "A", "PASS", 0.95);
    expect(result.nextPhase).toBe("B");
    expect(result.completed).toBe(false);

    // Verify phase B log exists
    const logs = await db.prepare(
      "SELECT * FROM shaping_phase_logs WHERE run_id = ? AND phase = 'B'",
    ).bind(shapingRunId).all();
    expect(logs.results).toHaveLength(1);
  });

  it("advancePhase F completes the pipeline", async () => {
    const pipelineRunId = createPipelineRun("shaping_running");
    seedArtifacts("biz-1");

    const shapingRunId = await orchestrator.startAutoShaping(
      pipelineRunId,
      "biz-1",
      "org_test",
    );

    await db.prepare("UPDATE discovery_pipeline_runs SET status = 'shaping_running' WHERE id = ?").bind(pipelineRunId).run();

    const result = await orchestrator.advancePhase(shapingRunId, pipelineRunId, "F", "PASS", 0.98);
    expect(result.nextPhase).toBeNull();
    expect(result.completed).toBe(true);

    // Verify shaping run completed
    const run = await db.prepare("SELECT status FROM shaping_runs WHERE id = ?").bind(shapingRunId).first();
    expect((run as any).status).toBe("completed");
  });
});
