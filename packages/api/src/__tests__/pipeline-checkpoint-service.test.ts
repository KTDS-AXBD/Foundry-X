import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PipelineCheckpointService } from "../modules/launch/services/pipeline-checkpoint-service.js";
import { DiscoveryPipelineService } from "../core/discovery/services/discovery-pipeline-service.js";

describe("PipelineCheckpointService (F314)", () => {
  let db: ReturnType<typeof createMockD1>;
  let cpService: PipelineCheckpointService;
  let pipelineService: DiscoveryPipelineService;
  let runId: string;

  beforeEach(async () => {
    db = createMockD1();
    cpService = new PipelineCheckpointService(db as unknown as D1Database);
    pipelineService = new DiscoveryPipelineService(db as unknown as D1Database);

    // 파이프라인 run 생성 + 시작
    const run = await pipelineService.createRun("org_test", "user-1", {
      bizItemId: "biz-1",
      triggerMode: "auto",
      maxRetries: 3,
    });
    await pipelineService.startRun(run.id, "user-1");
    runId = run.id;
  });

  describe("isCheckpointStep", () => {
    it("returns true for checkpoint steps (2-1, 2-3, 2-5, 2-7)", () => {
      expect(cpService.isCheckpointStep("2-1")).toBe(true);
      expect(cpService.isCheckpointStep("2-3")).toBe(true);
      expect(cpService.isCheckpointStep("2-5")).toBe(true);
      expect(cpService.isCheckpointStep("2-7")).toBe(true);
    });

    it("returns false for non-checkpoint steps", () => {
      expect(cpService.isCheckpointStep("2-0")).toBe(false);
      expect(cpService.isCheckpointStep("2-2")).toBe(false);
      expect(cpService.isCheckpointStep("2-4")).toBe(false);
      expect(cpService.isCheckpointStep("2-6")).toBe(false);
    });
  });

  describe("createCheckpoint", () => {
    it("creates a checkpoint with questions and deadline", async () => {
      const cp = await cpService.createCheckpoint(runId, "2-1");

      expect(cp.id).toBeDefined();
      expect(cp.pipelineRunId).toBe(runId);
      expect(cp.stepId).toBe("2-1");
      expect(cp.checkpointType).toBe("viability");
      expect(cp.status).toBe("pending");
      expect(cp.questions).toHaveLength(2);
      expect(cp.questions[0]!.question).toContain("역량");
      expect(cp.deadline).toBeDefined();
    });

    it("creates commit_gate checkpoint at 2-5 with 4 required questions", async () => {
      const cp = await cpService.createCheckpoint(runId, "2-5");

      expect(cp.checkpointType).toBe("commit_gate");
      expect(cp.questions).toHaveLength(4);
      expect(cp.questions.every((q) => q.required)).toBe(true);
    });

    it("throws on non-checkpoint step", async () => {
      await expect(cpService.createCheckpoint(runId, "2-2")).rejects.toThrow("Not a checkpoint step");
    });

    it("pauses the pipeline on checkpoint creation", async () => {
      await cpService.createCheckpoint(runId, "2-1");

      const run = await pipelineService.getRun(runId, "org_test");
      expect(run!.status).toBe("paused");
    });
  });

  describe("approve", () => {
    it("approves a checkpoint and resumes pipeline", async () => {
      const cp = await cpService.createCheckpoint(runId, "2-1");

      const result = await cpService.approve(cp.id, "user-1", {
        decision: "approved",
        responses: [
          { question: "역량 부합?", answer: "예" },
          { question: "시너지?", answer: "있음" },
        ],
      });

      expect(result.checkpoint.status).toBe("approved");
      expect(result.resumed).toBe(true);
    });

    it("does not re-approve already approved checkpoint", async () => {
      const cp = await cpService.createCheckpoint(runId, "2-1");
      await cpService.approve(cp.id, "user-1", { decision: "approved" });

      // 이미 approved → UPDATE WHERE status='pending' is 0 rows, but SELECT still returns approved row
      const result = await cpService.approve(cp.id, "user-1", { decision: "approved" });
      expect(result.checkpoint.status).toBe("approved");
      // RESUME on already-running pipeline won't succeed
      expect(result.resumed).toBe(false);
    });
  });

  describe("reject", () => {
    it("rejects a checkpoint with reason", async () => {
      const cp = await cpService.createCheckpoint(runId, "2-1");

      const result = await cpService.reject(cp.id, "user-1", "사업성 부족");

      expect(result.status).toBe("rejected");
      expect(result.decidedBy).toBe("user-1");
    });
  });

  describe("listByRun", () => {
    it("returns checkpoints in creation order", async () => {
      await cpService.createCheckpoint(runId, "2-1");

      // resume pipeline to allow another checkpoint
      const run2 = await pipelineService.resumeRun(runId, "user-1");
      await cpService.createCheckpoint(runId, "2-3");

      const list = await cpService.listByRun(runId);
      expect(list).toHaveLength(2);
      expect(list[0]!.stepId).toBe("2-1");
      expect(list[1]!.stepId).toBe("2-3");
    });
  });

  describe("getActive", () => {
    it("returns the active pending checkpoint", async () => {
      await cpService.createCheckpoint(runId, "2-1");

      const active = await cpService.getActive(runId);
      expect(active).not.toBeNull();
      expect(active!.stepId).toBe("2-1");
      expect(active!.status).toBe("pending");
    });

    it("returns null when no pending checkpoint", async () => {
      const active = await cpService.getActive(runId);
      expect(active).toBeNull();
    });
  });
});
