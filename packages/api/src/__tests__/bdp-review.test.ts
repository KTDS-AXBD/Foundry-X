import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { bdpRoute } from "../core/offering/routes/bdp.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bdp_versions (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    version_num INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    is_final INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, version_num)
  );
  CREATE TABLE IF NOT EXISTS bdp_section_reviews (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    bdp_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_id TEXT,
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", bdpRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db, AI: {} } as unknown as Env),
  };
}

describe("BDP Section Review (F292)", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1();
    await db.exec(DDL);
    app = createApp(db as unknown as D1Database);
  });

  describe("POST /api/bdp/:bizItemId/sections/:sectionId/review", () => {
    it("should create a review with approved status", async () => {
      const res = await app.request("/api/bdp/biz-1/sections/market-analysis/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approved" }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.bdpId).toBe("biz-1");
      expect(data.sectionId).toBe("market-analysis");
      expect(data.status).toBe("approved");
      expect(data.reviewerId).toBe("test-user");
    });

    it("should create a review with comment", async () => {
      const res = await app.request("/api/bdp/biz-1/sections/tech-stack/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revision_requested", comment: "기술 스택 재검토 필요" }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.status).toBe("revision_requested");
      expect(data.comment).toBe("기술 스택 재검토 필요");
    });

    it("should create a rejected review", async () => {
      const res = await app.request("/api/bdp/biz-1/sections/budget/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rejected", comment: "예산 초과" }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.status).toBe("rejected");
    });

    it("should return 400 for invalid action", async () => {
      const res = await app.request("/api/bdp/biz-1/sections/s1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invalid" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/bdp/:bizItemId/reviews", () => {
    it("should return empty list initially", async () => {
      const res = await app.request("/api/bdp/biz-1/reviews");
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toEqual([]);
    });

    it("should return reviews after creation", async () => {
      await app.request("/api/bdp/biz-1/sections/s1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approved" }),
      });
      await app.request("/api/bdp/biz-1/sections/s2/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rejected", comment: "이유" }),
      });

      const res = await app.request("/api/bdp/biz-1/reviews");
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toHaveLength(2);
    });
  });

  describe("GET /api/bdp/:bizItemId/review-summary", () => {
    it("should return zero counts initially", async () => {
      const res = await app.request("/api/bdp/biz-1/review-summary");
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toEqual({ total: 0, approved: 0, pending: 0, rejected: 0, revisionRequested: 0 });
    });

    it("should return correct counts", async () => {
      await app.request("/api/bdp/biz-1/sections/s1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approved" }),
      });
      await app.request("/api/bdp/biz-1/sections/s2/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approved" }),
      });
      await app.request("/api/bdp/biz-1/sections/s3/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rejected", comment: "no" }),
      });

      const res = await app.request("/api/bdp/biz-1/review-summary");
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.total).toBe(3);
      expect(data.approved).toBe(2);
      expect(data.rejected).toBe(1);
    });
  });
});
