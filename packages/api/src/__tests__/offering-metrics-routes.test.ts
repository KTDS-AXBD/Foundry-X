/**
 * F383: Offering Metrics Routes Tests (Sprint 174)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { offeringMetricsRoute } from "../routes/offering-metrics.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const TABLES = `
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  biz_item_id TEXT,
  artifact_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_by TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function createApp(db: Any) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("userId" as never, "test-user");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", offeringMetricsRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

const json = (res: Response) => res.json() as Promise<Any>;

describe("Offering Metrics Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const db = createMockD1();
    (db as Any).exec(TABLES);
    app = createApp(db);
  });

  describe("POST /offerings/metrics/record", () => {
    it("201 — records offering event", async () => {
      const res = await app.request("/api/offerings/metrics/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringId: "off-1",
          eventType: "created",
          durationMs: 5000,
        }),
      });

      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body.id).toMatch(/^oe_/);
    });

    it("400 — invalid eventType", async () => {
      const res = await app.request("/api/offerings/metrics/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringId: "off-1",
          eventType: "invalid_type",
          durationMs: 5000,
        }),
      });

      expect(res.status).toBe(400);
    });

    it("400 — missing offeringId", async () => {
      const res = await app.request("/api/offerings/metrics/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "created",
          durationMs: 5000,
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /offerings/metrics", () => {
    it("200 — returns summary with defaults", async () => {
      const res = await app.request("/api/offerings/metrics");

      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.totalCreated).toBe(0);
      expect(body.period.days).toBe(30);
    });

    it("200 — returns aggregated data after seeding", async () => {
      // Seed events
      await app.request("/api/offerings/metrics/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId: "off-1", eventType: "created", durationMs: 5000 }),
      });
      await app.request("/api/offerings/metrics/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId: "off-1", eventType: "exported", durationMs: 2000 }),
      });

      const res = await app.request("/api/offerings/metrics?days=7");
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.totalCreated).toBe(1);
      expect(body.totalExported).toBe(1);
    });
  });

  describe("GET /offerings/:id/metrics/events", () => {
    it("200 — returns event history for offering", async () => {
      // Seed events
      await app.request("/api/offerings/metrics/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId: "off-1", eventType: "created", durationMs: 5000 }),
      });

      const res = await app.request("/api/offerings/off-1/metrics/events");
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.events.length).toBe(1);
      expect(body.events[0].eventType).toBe("created");
    });
  });
});
