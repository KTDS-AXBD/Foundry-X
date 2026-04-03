import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { axBdPrototypesRoute } from "../routes/ax-bd-prototypes.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT DEFAULT 'field',
    status TEXT DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS prototypes (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
    version INTEGER NOT NULL DEFAULT 1,
    format TEXT NOT NULL DEFAULT 'html',
    content TEXT NOT NULL,
    template_used TEXT,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    generated_at TEXT NOT NULL,
    UNIQUE(biz_item_id, version)
  );
  CREATE TABLE IF NOT EXISTS poc_environments (
    id TEXT PRIMARY KEY,
    prototype_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    config TEXT DEFAULT '{}',
    provisioned_at TEXT,
    terminated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tech_reviews (
    id TEXT PRIMARY KEY,
    prototype_id TEXT NOT NULL,
    feasibility TEXT NOT NULL DEFAULT 'unknown',
    stack_fit INTEGER NOT NULL DEFAULT 0,
    complexity TEXT NOT NULL DEFAULT 'medium',
    risks TEXT DEFAULT '[]',
    recommendation TEXT DEFAULT '',
    estimated_effort TEXT,
    reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS prototype_section_reviews (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    prototype_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_id TEXT,
    comment TEXT,
    framework TEXT NOT NULL DEFAULT 'react',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function createApp(db: unknown) {
  const app = new Hono<{ Variables: Record<string, string> }>();
  app.use("*", async (c, next) => {
    c.set("orgId", "org_test");
    c.set("userId", "user_1");
    c.set("orgRole", "admin");
    c.set("jwtPayload" as never, { sub: "user_1" });
    (c as any).env = { DB: db };
    await next();
  });
  app.route("/api", axBdPrototypesRoute);
  return app;
}

describe("Prototype Section Review (F297)", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1();
    await db.exec(DDL);
    app = createApp(db);
  });

  describe("POST /api/ax-bd/prototypes/:id/sections/:sectionId/review", () => {
    it("should create a review with approved status", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto-1/sections/ui-layout/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approved" }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.prototypeId).toBe("proto-1");
      expect(data.sectionId).toBe("ui-layout");
      expect(data.status).toBe("approved");
      expect(data.framework).toBe("react");
    });

    it("should accept custom framework", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto-1/sections/components/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approved", framework: "vue" }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.framework).toBe("vue");
    });

    it("should create a review with comment", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto-1/sections/navigation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revision_requested", comment: "네비게이션 구조 변경 필요" }),
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.status).toBe("revision_requested");
      expect(data.comment).toBe("네비게이션 구조 변경 필요");
    });

    it("should return 400 for invalid action", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto-1/sections/s1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invalid_action" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/ax-bd/prototypes/:id/reviews", () => {
    it("should return empty list initially", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto-1/reviews");
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toEqual([]);
    });

    it("should return reviews after creation", async () => {
      await app.request("/api/ax-bd/prototypes/proto-1/sections/s1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approved" }),
      });
      await app.request("/api/ax-bd/prototypes/proto-1/sections/s2/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rejected", comment: "문제 있음" }),
      });

      const res = await app.request("/api/ax-bd/prototypes/proto-1/reviews");
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toHaveLength(2);
    });
  });

  describe("GET /api/ax-bd/prototypes/:id/review-summary", () => {
    it("should return zero counts initially", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto-1/review-summary");
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toEqual({ total: 0, approved: 0, pending: 0, rejected: 0, revisionRequested: 0 });
    });

    it("should return correct counts", async () => {
      await app.request("/api/ax-bd/prototypes/proto-1/sections/s1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approved" }),
      });
      await app.request("/api/ax-bd/prototypes/proto-1/sections/s2/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revision_requested", comment: "수정 필요" }),
      });
      await app.request("/api/ax-bd/prototypes/proto-1/sections/s3/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rejected", comment: "거부" }),
      });

      const res = await app.request("/api/ax-bd/prototypes/proto-1/review-summary");
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.total).toBe(3);
      expect(data.approved).toBe(1);
      expect(data.revisionRequested).toBe(1);
      expect(data.rejected).toBe(1);
    });
  });
});
