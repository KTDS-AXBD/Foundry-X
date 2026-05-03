import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { SkillPipelineRunner } from "../agent/services/skill-pipeline-runner.js";
import { DiscoveryPipelineService } from "../core/discovery/services/discovery-pipeline-service.js";

describe("SkillPipelineRunner (F314)", () => {
  let db: ReturnType<typeof createMockD1>;
  let runner: SkillPipelineRunner;
  let pipelineService: DiscoveryPipelineService;
  let runId: string;

  beforeEach(async () => {
    db = createMockD1();
    // apiKey 없이 생성 → skillExecutor null (스킬 실행 skip)
    runner = new SkillPipelineRunner(db as unknown as D1Database);
    pipelineService = new DiscoveryPipelineService(db as unknown as D1Database);

    const run = await pipelineService.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "auto",
      maxRetries: 3,
    });
    await pipelineService.startRun(run.id, "user-1");
    runId = run.id;
  });

  it("advances from 2-0 and stops at checkpoint 2-1", async () => {
    const result = await runner.runNextStep(runId, "org_test", "user-1");

    expect(result.stepId).toBe("2-0");
    expect(result.status).toBe("checkpoint_pending");
    expect(result.nextStep).toBe("2-1");
    expect(result.checkpointId).toBeDefined();
    expect(result.autoAdvance).toBe(false);
  });

  it("skips checkpoints when skipCheckpoints=true", async () => {
    const result = await runner.runNextStep(runId, "org_test", "user-1", true);

    // 2-0 → 2-1 without checkpoint
    expect(result.stepId).toBe("2-0");
    expect(result.status).toBe("completed");
    expect(result.nextStep).toBe("2-1");
    expect(result.autoAdvance).toBe(true);
  });

  it("advances through non-checkpoint steps with autoAdvance=true", async () => {
    // Step 2-0 → checkpoint 2-1 (skip)
    await runner.runNextStep(runId, "org_test", "user-1", true);

    // Now at 2-1, next is 2-2 (non-checkpoint)
    const result = await runner.runNextStep(runId, "org_test", "user-1", true);
    expect(result.stepId).toBe("2-1");
    expect(result.status).toBe("completed");
    expect(result.nextStep).toBe("2-2");
    expect(result.autoAdvance).toBe(true);
  });

  it("signals shaping_triggered when reaching end (2-10)", async () => {
    // Fast-forward to 2-10 by skipping all checkpoints
    for (let i = 0; i < 10; i++) {
      const result = await runner.runNextStep(runId, "org_test", "user-1", true);
      if (result.status === "shaping_triggered") {
        expect(result.stepId).toBe(`2-${i}`);
        return;
      }
    }

    // 2-10 → shaping
    const finalResult = await runner.runNextStep(runId, "org_test", "user-1", true);
    expect(finalResult.status).toBe("shaping_triggered");
    expect(finalResult.autoAdvance).toBe(false);
  });

  it("throws when pipeline run is not found", async () => {
    await expect(
      runner.runNextStep("nonexistent", "org_test", "user-1"),
    ).rejects.toThrow("not found");
  });

  it("stops at 2-3 checkpoint after resuming from 2-1", async () => {
    // 2-0 → checkpoint 2-1
    await runner.runNextStep(runId, "org_test", "user-1");

    // Resume pipeline manually
    await pipelineService.resumeRun(runId, "user-1");
    // Update current_step to 2-1
    await db.prepare("UPDATE discovery_pipeline_runs SET current_step = ? WHERE id = ?").bind("2-1", runId).run();

    // 2-1 → 2-2 (non-checkpoint, skip)
    await runner.runNextStep(runId, "org_test", "user-1", false);

    // Resume + advance to 2-2
    await db.prepare("UPDATE discovery_pipeline_runs SET current_step = ? WHERE id = ?").bind("2-2", runId).run();

    // 2-2 → checkpoint 2-3
    const result = await runner.runNextStep(runId, "org_test", "user-1");
    expect(result.status).toBe("checkpoint_pending");
    expect(result.nextStep).toBe("2-3");
  });
});
