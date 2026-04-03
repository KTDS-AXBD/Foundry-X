import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { pocRoute } from "../routes/poc.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS poc_projects (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    biz_item_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning'
      CHECK(status IN ('planning','in_progress','completed','cancelled')),
    framework TEXT,
    start_date TEXT,
    end_date TEXT,
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );
  CREATE INDEX IF NOT EXISTS idx_poc_projects_org ON poc_projects(org_id, status);

  CREATE TABLE IF NOT EXISTS poc_kpis (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    poc_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    target_value REAL,
    actual_value REAL,
    unit TEXT NOT NULL DEFAULT 'count',
    measured_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (poc_id) REFERENCES poc_projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_poc_kpis_poc ON poc_kpis(poc_id);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", pocRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedPoc(
  app: ReturnType<typeof createApp>,
  title: string = "Test PoC",
): Promise<string> {
  const res = await app.request("/api/poc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

describe("PoC Management Routes (F298)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  // ── POST /api/poc ──

  describe("POST /api/poc", () => {
    it("creates PoC with status planning (201)", async () => {
      const res = await app.request("/api/poc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "AI Vision PoC" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { status: string; title: string; createdBy: string };
      expect(body.status).toBe("planning");
      expect(body.title).toBe("AI Vision PoC");
      expect(body.createdBy).toBe("test-user");
    });

    it("creates PoC with optional fields", async () => {
      const res = await app.request("/api/poc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Full PoC",
          description: "Testing AI model accuracy",
          framework: "PyTorch",
          startDate: "2026-04-01",
          endDate: "2026-06-30",
          bizItemId: "biz-123",
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.framework).toBe("PyTorch");
      expect(body.startDate).toBe("2026-04-01");
      expect(body.bizItemId).toBe("biz-123");
    });

    it("rejects empty title (400)", async () => {
      const res = await app.request("/api/poc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/poc ──

  describe("GET /api/poc", () => {
    it("returns empty list when no PoCs", async () => {
      const res = await app.request("/api/poc");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toEqual([]);
    });

    it("returns list of PoCs", async () => {
      await seedPoc(app, "PoC A");
      await seedPoc(app, "PoC B");

      const res = await app.request("/api/poc");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(2);
    });

    it("filters by status", async () => {
      const id = await seedPoc(app, "PoC to progress");
      // Update to in_progress
      await app.request(`/api/poc/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      await seedPoc(app, "PoC planning");

      const res = await app.request("/api/poc?status=in_progress");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { title: string }[];
      expect(body).toHaveLength(1);
      expect(body[0]!.title).toBe("PoC to progress");
    });

    it("supports pagination", async () => {
      for (let i = 0; i < 5; i++) {
        await seedPoc(app, `PoC ${i}`);
      }

      const res = await app.request("/api/poc?limit=2&offset=0");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(2);
    });
  });

  // ── GET /api/poc/:id ──

  describe("GET /api/poc/:id", () => {
    it("returns PoC detail", async () => {
      const id = await seedPoc(app, "Detail PoC");
      const res = await app.request(`/api/poc/${id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string; title: string };
      expect(body.id).toBe(id);
      expect(body.title).toBe("Detail PoC");
    });

    it("returns 404 for non-existent PoC", async () => {
      const res = await app.request("/api/poc/non-existent");
      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /api/poc/:id ──

  describe("PATCH /api/poc/:id", () => {
    it("updates PoC fields", async () => {
      const id = await seedPoc(app, "Original");
      const res = await app.request(`/api/poc/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated", status: "in_progress" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { title: string; status: string };
      expect(body.title).toBe("Updated");
      expect(body.status).toBe("in_progress");
    });

    it("returns 404 for non-existent PoC", async () => {
      const res = await app.request("/api/poc/non-existent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });
      expect(res.status).toBe(404);
    });
  });

  // ── KPI endpoints ──

  describe("POST /api/poc/:id/kpi", () => {
    it("adds KPI to PoC (201)", async () => {
      const pocId = await seedPoc(app, "KPI Test PoC");
      const res = await app.request(`/api/poc/${pocId}/kpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricName: "정확도",
          targetValue: 95.0,
          actualValue: 87.5,
          unit: "%",
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { metricName: string; targetValue: number; unit: string };
      expect(body.metricName).toBe("정확도");
      expect(body.targetValue).toBe(95.0);
      expect(body.unit).toBe("%");
    });

    it("returns 404 for non-existent PoC", async () => {
      const res = await app.request("/api/poc/non-existent/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metricName: "test", unit: "count" }),
      });
      expect(res.status).toBe(404);
    });

    it("rejects empty metric name (400)", async () => {
      const pocId = await seedPoc(app, "KPI Validation");
      const res = await app.request(`/api/poc/${pocId}/kpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metricName: "" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/poc/:id/kpi", () => {
    it("returns KPI list", async () => {
      const pocId = await seedPoc(app, "KPI List PoC");
      // Add 2 KPIs
      await app.request(`/api/poc/${pocId}/kpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metricName: "정확도", targetValue: 95, unit: "%" }),
      });
      await app.request(`/api/poc/${pocId}/kpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metricName: "처리속도", targetValue: 100, unit: "ms" }),
      });

      const res = await app.request(`/api/poc/${pocId}/kpi`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(2);
    });

    it("returns 404 for non-existent PoC", async () => {
      const res = await app.request("/api/poc/non-existent/kpi");
      expect(res.status).toBe(404);
    });
  });
});
