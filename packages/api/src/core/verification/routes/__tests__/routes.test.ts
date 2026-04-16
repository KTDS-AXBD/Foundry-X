/**
 * F552 TDD Red Phase — Verification Routes
 * Sprint 303 | FX-REQ-589
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../../../../__tests__/helpers/mock-d1.js";
import { verificationRoute } from "../index.js";
import { Hono } from "hono";
import type { Env } from "../../../../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS dual_ai_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id INTEGER NOT NULL,
    claude_verdict TEXT,
    codex_verdict TEXT,
    codex_json TEXT NOT NULL,
    divergence_score REAL DEFAULT 0.0,
    decision TEXT,
    degraded INTEGER DEFAULT 0,
    degraded_reason TEXT,
    model TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_dual_ai_reviews_sprint ON dual_ai_reviews(sprint_id);
`;

const SAMPLE_BODY = {
  sprint_id: 303,
  claude_verdict: "PASS",
  codex_verdict: "PASS",
  codex_json: JSON.stringify({ verdict: "PASS", code_issues: [] }),
  divergence_score: 0.0,
  decision: "PASS",
  degraded: false,
  model: "codex-cli",
};

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", verificationRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("F552 Verification Routes", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/verification/dual-review", () => {
    it("creates a review and returns 201 with id", async () => {
      const res = await app.request("/api/verification/dual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SAMPLE_BODY),
      });
      expect(res.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any;
      expect(json).toHaveProperty("id");
      expect(json.id).toBeGreaterThan(0);
    });

    it("returns 400 on invalid body (missing sprint_id)", async () => {
      const { sprint_id: _removed, ...invalid } = SAMPLE_BODY;
      const res = await app.request("/api/verification/dual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalid),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 on invalid codex_verdict enum", async () => {
      const res = await app.request("/api/verification/dual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...SAMPLE_BODY, codex_verdict: "INVALID" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/verification/dual-reviews", () => {
    it("returns 200 with empty array initially", async () => {
      const res = await app.request("/api/verification/dual-reviews");
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any;
      expect(json).toHaveProperty("reviews");
      expect(json.reviews).toEqual([]);
    });

    it("returns inserted reviews", async () => {
      await app.request("/api/verification/dual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SAMPLE_BODY),
      });
      const res = await app.request("/api/verification/dual-reviews");
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any;
      expect(json.reviews.length).toBe(1);
      expect(json.reviews[0].sprint_id).toBe(303);
    });

    it("supports ?limit query parameter", async () => {
      await app.request("/api/verification/dual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SAMPLE_BODY),
      });
      await app.request("/api/verification/dual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...SAMPLE_BODY, sprint_id: 304 }),
      });
      const res = await app.request("/api/verification/dual-reviews?limit=1");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any;
      expect(json.reviews.length).toBe(1);
    });
  });

  describe("GET /api/verification/dual-reviews/stats", () => {
    it("returns 200 with stats structure", async () => {
      const res = await app.request("/api/verification/dual-reviews/stats");
      expect(res.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any;
      expect(json).toHaveProperty("total");
      expect(json).toHaveProperty("concordance_rate");
      expect(json).toHaveProperty("block_rate");
      expect(json).toHaveProperty("degraded_rate");
      expect(json).toHaveProperty("block_reasons");
      expect(json).toHaveProperty("recent_reviews");
    });

    it("returns correct stats after inserting reviews", async () => {
      await app.request("/api/verification/dual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SAMPLE_BODY),
      });
      await app.request("/api/verification/dual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...SAMPLE_BODY,
          sprint_id: 304,
          codex_verdict: "BLOCK",
          decision: "BLOCK",
        }),
      });
      const res = await app.request("/api/verification/dual-reviews/stats");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any;
      expect(json.total).toBe(2);
      expect(json.block_rate).toBe(50);
    });
  });
});
