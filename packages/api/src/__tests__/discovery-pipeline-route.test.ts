import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { discoveryPipelineRoute } from "../core/discovery/routes/discovery-pipeline.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTestApp(db: any) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).env = { DB: db };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("orgId" as any, "org_test");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.set("jwtPayload" as any, { sub: "test-user" });
    await next();
  });
  app.route("/api", discoveryPipelineRoute);
  return app;
}

function post(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

describe("discovery-pipeline routes (F312+F313)", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;

  beforeEach(() => {
    db = createMockD1();
    app = createTestApp(db);
  });

  it("POST /discovery-pipeline/runs creates and starts a run", async () => {
    const res = await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "manual",
    });
    expect(res.status).toBe(201);

    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.status).toBe("discovery_running");
    expect(body.events).toBeDefined();
  });

  it("POST /discovery-pipeline/runs returns 400 on invalid input", async () => {
    const res = await post(app, "/api/discovery-pipeline/runs", {});
    expect(res.status).toBe(400);
  });

  it("GET /discovery-pipeline/runs lists runs", async () => {
    await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "manual",
    });

    const res = await app.request("/api/discovery-pipeline/runs");
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("GET /discovery-pipeline/runs/:id returns detail", async () => {
    const createRes = await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "manual",
    });
    const created = await json(createRes);

    const res = await app.request(`/api/discovery-pipeline/runs/${created.id}`);
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.id).toBe(created.id);
    expect(body.events).toBeDefined();
    expect(body.validEvents).toBeDefined();
  });

  it("GET /discovery-pipeline/runs/:id returns 404 for unknown", async () => {
    const res = await app.request("/api/discovery-pipeline/runs/nonexistent");
    expect(res.status).toBe(404);
  });

  it("POST /runs/:id/step-complete reports step", async () => {
    const createRes = await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "manual",
    });
    const created = await json(createRes);

    const res = await post(app, `/api/discovery-pipeline/runs/${created.id}/step-complete`, {
      stepId: "2-0",
    });
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.valid).toBe(true);
  });

  it("POST /runs/:id/step-failed reports failure", async () => {
    const createRes = await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "manual",
    });
    const created = await json(createRes);

    const res = await post(app, `/api/discovery-pipeline/runs/${created.id}/step-failed`, {
      stepId: "2-1",
      errorMessage: "API timeout",
    });
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.retryable).toBe(true);
    expect(body.retryCount).toBe(1);
  });

  it("POST /runs/:id/action handles abort", async () => {
    const createRes = await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "manual",
    });
    const created = await json(createRes);

    const res = await post(app, `/api/discovery-pipeline/runs/${created.id}/action`, {
      action: "abort",
      reason: "test abort",
    });
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.newStatus).toBe("aborted");
  });

  it("POST /runs/:id/pause pauses the run", async () => {
    const createRes = await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "manual",
    });
    const created = await json(createRes);

    const res = await post(app, `/api/discovery-pipeline/runs/${created.id}/pause`, {});
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.valid).toBe(true);
    expect(body.toStatus).toBe("paused");
  });

  it("GET /runs/:id/events returns events", async () => {
    const createRes = await post(app, "/api/discovery-pipeline/runs", {
      bizItemId: "biz-1",
      triggerMode: "manual",
    });
    const created = await json(createRes);

    const res = await app.request(`/api/discovery-pipeline/runs/${created.id}/events`);
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.events).toBeDefined();
    expect(body.events.length).toBeGreaterThan(0);
  });
});
