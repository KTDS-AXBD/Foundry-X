import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { discoveryPipelineRoute } from "../routes/discovery-pipeline.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTestApp(db: any) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).env = { DB: db, ANTHROPIC_API_KEY: undefined };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("orgId" as any, "org_test");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("jwtPayload" as any, { sub: "test-user" });
    await next();
  });
  app.route("/api", discoveryPipelineRoute);
  return app;
}

function post(app: Hono, path: string, body?: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

describe("discovery-pipeline F314 extended routes", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;
  let runId: string;

  beforeEach(async () => {
    db = createMockD1();
    app = createTestApp(db);

    // Create and start a pipeline run
    const res = await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "auto",
    });
    const body = await json(res);
    runId = body.id;
  });

  describe("POST /auto-advance", () => {
    it("executes next step and returns result", async () => {
      const res = await post(app, `/api/discovery-pipeline/runs/${runId}/auto-advance`);
      expect(res.status).toBe(200);

      const body = await json(res);
      expect(body.stepId).toBe("2-0");
      expect(body.status).toBeDefined();
    });

    it("stops at checkpoint when not skipping", async () => {
      const res = await post(app, `/api/discovery-pipeline/runs/${runId}/auto-advance`, {
        skipCheckpoints: false,
      });
      const body = await json(res);

      expect(body.status).toBe("checkpoint_pending");
      expect(body.nextStep).toBe("2-1");
      expect(body.checkpointId).toBeDefined();
    });

    it("skips checkpoints when requested", async () => {
      const res = await post(app, `/api/discovery-pipeline/runs/${runId}/auto-advance`, {
        skipCheckpoints: true,
      });
      const body = await json(res);

      expect(body.status).toBe("completed");
      expect(body.nextStep).toBe("2-1");
      expect(body.autoAdvance).toBe(true);
    });
  });

  describe("GET /checkpoints", () => {
    it("returns empty list initially", async () => {
      const res = await app.request(`/api/discovery-pipeline/runs/${runId}/checkpoints`);
      expect(res.status).toBe(200);

      const body = await json(res);
      expect(body.checkpoints).toHaveLength(0);
    });

    it("returns checkpoints after auto-advance creates one", async () => {
      // Trigger checkpoint at 2-1
      await post(app, `/api/discovery-pipeline/runs/${runId}/auto-advance`);

      const res = await app.request(`/api/discovery-pipeline/runs/${runId}/checkpoints`);
      const body = await json(res);

      expect(body.checkpoints).toHaveLength(1);
      expect(body.checkpoints[0].stepId).toBe("2-1");
      expect(body.checkpoints[0].status).toBe("pending");
    });
  });

  describe("POST /checkpoints/:cpId/approve", () => {
    it("approves a pending checkpoint", async () => {
      // Create checkpoint
      const advRes = await post(app, `/api/discovery-pipeline/runs/${runId}/auto-advance`);
      const advBody = await json(advRes);
      const cpId = advBody.checkpointId;

      // Approve
      const res = await post(app, `/api/discovery-pipeline/runs/${runId}/checkpoints/${cpId}/approve`, {
        decision: "approved",
        responses: [
          { question: "역량 부합?", answer: "예" },
          { question: "시너지?", answer: "있음" },
        ],
      });
      expect(res.status).toBe(200);

      const body = await json(res);
      expect(body.checkpoint.status).toBe("approved");
      expect(body.resumed).toBe(true);
    });

    it("returns 400 on invalid input", async () => {
      const advRes = await post(app, `/api/discovery-pipeline/runs/${runId}/auto-advance`);
      const advBody = await json(advRes);
      const cpId = advBody.checkpointId;

      const res = await post(app, `/api/discovery-pipeline/runs/${runId}/checkpoints/${cpId}/approve`, {
        decision: "invalid",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /checkpoints/:cpId/reject", () => {
    it("rejects a pending checkpoint with reason", async () => {
      // Create checkpoint
      const advRes = await post(app, `/api/discovery-pipeline/runs/${runId}/auto-advance`);
      const advBody = await json(advRes);
      const cpId = advBody.checkpointId;

      // Reject
      const res = await post(app, `/api/discovery-pipeline/runs/${runId}/checkpoints/${cpId}/reject`, {
        reason: "사업성이 낮음",
      });
      expect(res.status).toBe(200);

      const body = await json(res);
      expect(body.status).toBe("rejected");
    });
  });
});
