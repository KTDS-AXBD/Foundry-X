import { describe, it, expect, beforeEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { commandRegistryRoute, commandRegistryServiceInstance } from "../src/routes/command-registry.js";
import type { Env } from "../src/env.js";
import type { TenantVariables } from "../middleware/tenant.js";

function createApp() {
  const app = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

  app.use("*", async (c, next) => {
    c.set("orgId", "org_test");
    c.set("userId", "test-user");
    c.set("orgRole", "owner");
    await next();
  });

  app.route("/api", commandRegistryRoute);

  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, {} as unknown as Env),
  };
}

const sampleCommand = {
  namespace: "foundry",
  name: "sync",
  description: "Sync spec with code",
  argsSchema: { path: { type: "string" } },
  handler: "foundry-sync-handler",
  requiredPermissions: ["repo:read"],
  enabled: true,
};

describe("Command Registry Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    (commandRegistryServiceInstance as any).store = new Map();
    app = createApp();
  });

  describe("POST /api/command-registry", () => {
    it("registers a command and returns 201", async () => {
      const res = await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCommand),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.id).toBeDefined();
      expect(body.namespace).toBe("foundry");
      expect(body.name).toBe("sync");
      expect(body.orgId).toBe("org_test");
    });
  });

  describe("GET /api/command-registry", () => {
    it("lists commands filtered by namespace", async () => {
      await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCommand),
      });
      await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sampleCommand, namespace: "plumb", name: "check" }),
      });

      const res = await app.request("/api/command-registry?namespace=foundry");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any[];
      expect(body).toHaveLength(1);
      expect(body[0].namespace).toBe("foundry");
    });

    it("lists all commands without namespace filter", async () => {
      await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCommand),
      });
      await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sampleCommand, namespace: "plumb", name: "check" }),
      });

      const res = await app.request("/api/command-registry");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any[];
      expect(body).toHaveLength(2);
    });
  });

  describe("GET /api/command-registry/:namespace/:name", () => {
    it("returns 200 for existing command", async () => {
      await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCommand),
      });

      const res = await app.request("/api/command-registry/foundry/sync");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.namespace).toBe("foundry");
      expect(body.name).toBe("sync");
    });

    it("returns 404 for non-existent command", async () => {
      const res = await app.request("/api/command-registry/unknown/cmd");
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/command-registry/:id", () => {
    it("updates a command and returns 200", async () => {
      const createRes = await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCommand),
      });
      const created = (await createRes.json()) as any;

      const res = await app.request(`/api/command-registry/${created.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Updated", enabled: false }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.description).toBe("Updated");
      expect(body.enabled).toBe(false);
    });

    it("returns 404 for non-existent id", async () => {
      const res = await app.request("/api/command-registry/non-existent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "test" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/command-registry/:id", () => {
    it("deletes and returns 204", async () => {
      const createRes = await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCommand),
      });
      const created = (await createRes.json()) as any;

      const res = await app.request(`/api/command-registry/${created.id}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await app.request("/api/command-registry/foundry/sync");
      expect(getRes.status).toBe(404);
    });

    it("returns 404 for non-existent id", async () => {
      const res = await app.request("/api/command-registry/non-existent", {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/command-registry/:namespace/:name/execute", () => {
    it("executes and returns 200 with result", async () => {
      await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCommand),
      });

      const res = await app.request("/api/command-registry/foundry/sync/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ args: { path: "/src" } }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.output).toContain("foundry/sync");
      expect(body.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("returns 404 for non-existent command", async () => {
      const res = await app.request("/api/command-registry/unknown/cmd/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ args: {} }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/command-registry/namespaces", () => {
    it("lists unique namespaces", async () => {
      await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleCommand),
      });
      await app.request("/api/command-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sampleCommand, namespace: "plumb", name: "check" }),
      });

      const res = await app.request("/api/command-registry/namespaces");
      expect(res.status).toBe(200);
      const body = (await res.json()) as string[];
      expect(body).toHaveLength(2);
      expect(body).toContain("foundry");
      expect(body).toContain("plumb");
    });

    it("returns empty array when no commands", async () => {
      const res = await app.request("/api/command-registry/namespaces");
      expect(res.status).toBe(200);
      const body = (await res.json()) as string[];
      expect(body).toHaveLength(0);
    });
  });
});
