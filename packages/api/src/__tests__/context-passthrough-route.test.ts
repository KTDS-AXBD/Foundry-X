import { describe, it, expect, beforeEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { contextPassthroughRoute, contextPassthroughServiceInstance } from "../routes/context-passthrough.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

function createApp() {
  const app = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

  // Middleware: set orgId/userId for tenant isolation (no auth needed for tests)
  app.use("*", async (c, next) => {
    c.set("orgId", "org_test");
    c.set("userId", "test-user");
    c.set("orgRole", "owner");
    await next();
  });

  app.route("/api", contextPassthroughRoute);

  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, {} as unknown as Env),
  };
}

const samplePayload = {
  storyId: "STORY-001",
  title: "User Authentication Flow",
  requirements: ["OAuth2 support"],
  acceptanceCriteria: ["Login works"],
  priority: "high",
};

describe("Context Passthrough Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    // Clear the singleton store between tests
    // Access internal store via listing and acknowledging (service is singleton)
    // Reset by creating a fresh service — we need to clear the Map
    (contextPassthroughServiceInstance as any).store = new Map();
    app = createApp();
  });

  describe("POST /api/context-passthroughs", () => {
    it("creates a passthrough and returns 201", async () => {
      const res = await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceRole: "architect",
          targetRole: "developer",
          payload: samplePayload,
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.id).toBeDefined();
      expect(body.sourceRole).toBe("architect");
      expect(body.targetRole).toBe("developer");
      expect(body.status).toBe("pending");
      expect(body.orgId).toBe("org_test");
    });

    it("creates with workflowExecutionId", async () => {
      const res = await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceRole: "pm",
          targetRole: "developer",
          payload: samplePayload,
          workflowExecutionId: "wf-100",
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.workflowExecutionId).toBe("wf-100");
    });
  });

  describe("GET /api/context-passthroughs", () => {
    it("lists filtered by targetRole", async () => {
      // Create two for developer, one for tester
      await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRole: "pm", targetRole: "developer", payload: samplePayload }),
      });
      await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRole: "arch", targetRole: "developer", payload: samplePayload }),
      });
      await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRole: "pm", targetRole: "tester", payload: samplePayload }),
      });

      const res = await app.request("/api/context-passthroughs?targetRole=developer");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any[];
      expect(body).toHaveLength(2);
    });
  });

  describe("GET /api/context-passthroughs/:id", () => {
    it("returns 200 for existing id", async () => {
      const createRes = await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRole: "pm", targetRole: "developer", payload: samplePayload }),
      });
      const created = (await createRes.json()) as any;

      const res = await app.request(`/api/context-passthroughs/${created.id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.id).toBe(created.id);
    });

    it("returns 404 for non-existent id", async () => {
      const res = await app.request("/api/context-passthroughs/non-existent");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/context-passthroughs/:id/deliver", () => {
    it("delivers and returns 200", async () => {
      const createRes = await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRole: "pm", targetRole: "developer", payload: samplePayload }),
      });
      const created = (await createRes.json()) as any;

      const res = await app.request(`/api/context-passthroughs/${created.id}/deliver`, {
        method: "PATCH",
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe("delivered");
      expect(body.deliveredAt).not.toBeNull();
    });

    it("returns 404 for non-existent id", async () => {
      const res = await app.request("/api/context-passthroughs/non-existent/deliver", {
        method: "PATCH",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/context-passthroughs/:id/acknowledge", () => {
    it("acknowledges and returns 200", async () => {
      const createRes = await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRole: "pm", targetRole: "developer", payload: samplePayload }),
      });
      const created = (await createRes.json()) as any;

      const res = await app.request(`/api/context-passthroughs/${created.id}/acknowledge`, {
        method: "PATCH",
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe("acknowledged");
      expect(body.acknowledgedAt).not.toBeNull();
    });

    it("returns 404 for non-existent id", async () => {
      const res = await app.request("/api/context-passthroughs/non-existent/acknowledge", {
        method: "PATCH",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/context-passthroughs/workflow/:executionId", () => {
    it("lists by workflow execution id", async () => {
      await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceRole: "pm",
          targetRole: "developer",
          payload: samplePayload,
          workflowExecutionId: "wf-200",
        }),
      });
      await app.request("/api/context-passthroughs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceRole: "arch",
          targetRole: "tester",
          payload: samplePayload,
          workflowExecutionId: "wf-200",
        }),
      });

      const res = await app.request("/api/context-passthroughs/workflow/wf-200");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any[];
      expect(body).toHaveLength(2);
    });

    it("returns empty array for unknown workflow", async () => {
      const res = await app.request("/api/context-passthroughs/workflow/unknown");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any[];
      expect(body).toHaveLength(0);
    });
  });
});
