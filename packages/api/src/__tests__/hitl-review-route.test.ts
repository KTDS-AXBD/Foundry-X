import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { hitlReviewRoute } from "../core/harness/routes/hitl-review.js";

const TABLES = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS hitl_artifact_reviews (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    artifact_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('approved', 'modified', 'regenerated', 'rejected')),
    reason TEXT,
    modified_content TEXT,
    previous_version TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_hitl_artifact ON hitl_artifact_reviews(artifact_id, created_at);
`;

function createTestApp(db: any) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    (c as any).env = { DB: db };
    c.set("orgId" as any, "org1");
    c.set("userId" as any, "user1");
    await next();
  });
  app.route("/api", hitlReviewRoute);
  return app;
}

function seed(db: any) {
  (db as any).exec(`
    INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
    INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Test User', '2026-01-01', '2026-01-01');
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, tokens_used, duration_ms, model)
      VALUES ('art1', 'org1', 'biz1', 'ai-biz:ecosystem-map', '2-1', 1, 'input1', '## Result', 'completed', 'user1', 300, 2500, 'claude-haiku-4-5-20251001');
  `);
}

describe("hitl-review routes", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    seed(db);
    app = createTestApp(db);
  });

  describe("POST /api/hitl/review", () => {
    it("should create approval review (201)", async () => {
      const res = await app.request("/api/hitl/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId: "art1", action: "approved" }),
      });

      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data.action).toBe("approved");
      expect(data.artifactId).toBe("art1");
    });

    it("should reject with reason", async () => {
      const res = await app.request("/api/hitl/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactId: "art1",
          action: "rejected",
          reason: "불충분한 분석",
        }),
      });

      expect(res.status).toBe(201);
      const data: any = await res.json();
      expect(data.action).toBe("rejected");
      expect(data.reason).toBe("불충분한 분석");
    });

    it("should return 400 when rejecting without reason", async () => {
      const res = await app.request("/api/hitl/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId: "art1", action: "rejected" }),
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 when modifying without content", async () => {
      const res = await app.request("/api/hitl/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId: "art1", action: "modified" }),
      });

      expect(res.status).toBe(400);
    });

    it("should return 404 for nonexistent artifact", async () => {
      const res = await app.request("/api/hitl/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId: "nonexistent", action: "approved" }),
      });

      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid action", async () => {
      const res = await app.request("/api/hitl/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId: "art1", action: "invalid" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/hitl/history/:artifactId", () => {
    it("should return empty reviews", async () => {
      const res = await app.request("/api/hitl/history/art1");
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.reviews).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should return reviews after submission", async () => {
      // Create a review first
      await app.request("/api/hitl/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifactId: "art1", action: "approved" }),
      });

      const res = await app.request("/api/hitl/history/art1");
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.reviews).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.reviews[0].action).toBe("approved");
    });
  });
});
