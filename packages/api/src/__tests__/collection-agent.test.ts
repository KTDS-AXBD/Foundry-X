import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { collectionRoute } from "../core/collection/routes/collection.js";

function createTestApp(db: any) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    (c as any).env = {
      DB: db,
      ANTHROPIC_API_KEY: "test-key",
      AI: {},
      CACHE: {},
    };
    c.set("orgId" as any, "org_test");
    c.set("userId" as any, "test-user");
    c.set("jwtPayload" as any, { sub: "test-user" });
    await next();
  });
  app.route("/api", collectionRoute);
  return app;
}

function post(app: Hono, path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("collection agent routes (F291)", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;

  beforeEach(() => {
    db = createMockD1();
    app = createTestApp(db);
  });

  // ── POST /collection/agent-schedule ──

  describe("POST /api/collection/agent-schedule", () => {
    it("should create a schedule (201)", async () => {
      const res = await post(app, "/api/collection/agent-schedule", {
        sources: ["market", "news"],
        keywords: ["AI", "헬스케어"],
        intervalHours: 12,
        enabled: true,
      });
      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data.schedule).toBeDefined();
      expect(data.schedule.sources).toEqual(["market", "news"]);
      expect(data.schedule.intervalHours).toBe(12);
      expect(data.schedule.enabled).toBe(true);
    });

    it("should reject empty sources (400)", async () => {
      const res = await post(app, "/api/collection/agent-schedule", {
        sources: [],
      });
      expect(res.status).toBe(400);
    });

    it("should reject invalid source type (400)", async () => {
      const res = await post(app, "/api/collection/agent-schedule", {
        sources: ["invalid"],
      });
      expect(res.status).toBe(400);
    });

    it("should use defaults for optional fields", async () => {
      const res = await post(app, "/api/collection/agent-schedule", {
        sources: ["tech"],
      });
      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data.schedule.intervalHours).toBe(6);
      expect(data.schedule.enabled).toBe(true);
      expect(data.schedule.keywords).toEqual([]);
    });
  });

  // ── GET /collection/agent-runs ──

  describe("GET /api/collection/agent-runs", () => {
    it("should return empty runs initially", async () => {
      const res = await app.request("/api/collection/agent-runs");
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.runs).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should return runs after trigger", async () => {
      // Insert a run directly
      await db.prepare(
        `INSERT INTO agent_collection_runs (id, org_id, source, status, items_found, started_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      ).bind("run-1", "org_test", "market", "completed", 3).run();

      const res = await app.request("/api/collection/agent-runs");
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.runs).toHaveLength(1);
      expect(data.runs[0].source).toBe("market");
      expect(data.runs[0].itemsFound).toBe(3);
      expect(data.total).toBe(1);
    });

    it("should filter by status", async () => {
      await db.prepare(
        `INSERT INTO agent_collection_runs (id, org_id, source, status, started_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      ).bind("run-a", "org_test", "market", "completed").run();
      await db.prepare(
        `INSERT INTO agent_collection_runs (id, org_id, source, status, started_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      ).bind("run-b", "org_test", "news", "failed").run();

      const res = await app.request("/api/collection/agent-runs?status=failed");
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.runs).toHaveLength(1);
      expect(data.runs[0].source).toBe("news");
    });
  });

  // ── POST /collection/agent-trigger ──

  describe("POST /api/collection/agent-trigger", () => {
    it("should create a run and return 201", async () => {
      const res = await post(app, "/api/collection/agent-trigger", {
        source: "tech",
      });
      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data.runId).toBeDefined();
      expect(data.status).toBe("running");
    });

    it("should accept empty body", async () => {
      const res = await post(app, "/api/collection/agent-trigger", {});
      expect(res.status).toBe(201);
    });

    it("should reject invalid source", async () => {
      const res = await post(app, "/api/collection/agent-trigger", {
        source: "invalid",
      });
      expect(res.status).toBe(400);
    });
  });
});
