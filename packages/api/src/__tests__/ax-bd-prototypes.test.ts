import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { axBdPrototypesRoute } from "../core/shaping/routes/ax-bd-prototypes.js";

/**
 * Sprint 67: F209 — Prototype + PoC + TechReview 라우트 테스트
 * 인증/테넌트 미들웨어를 직접 주입하여 route 레벨 테스트
 */

function createApp(db: unknown) {
  const app = new Hono<{ Variables: Record<string, string> }>();
  // Mock auth + tenant middleware
  app.use("*", async (c, next) => {
    c.set("orgId", "org_test");
    c.set("userId", "user_1");
    c.set("orgRole", "admin");
    (c as any).env = { DB: db };
    await next();
  });
  app.route("/api", axBdPrototypesRoute);
  return app;
}

describe("ax-bd-prototypes route", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createMockD1();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS biz_items (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        source TEXT DEFAULT 'field',
        status TEXT DEFAULT 'draft',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_poc_env_proto ON poc_environments(prototype_id);
      CREATE TABLE IF NOT EXISTS tech_reviews (
        id TEXT PRIMARY KEY,
        prototype_id TEXT NOT NULL,
        feasibility TEXT NOT NULL,
        stack_fit INTEGER NOT NULL DEFAULT 0,
        complexity TEXT NOT NULL,
        risks TEXT DEFAULT '[]',
        recommendation TEXT NOT NULL,
        estimated_effort TEXT,
        reviewed_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    const now = new Date().toISOString();
    await db.prepare(
      "INSERT INTO biz_items (id, org_id, title, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind("bi_1", "org_test", "Test Item", "user_1", now, now).run();
    await db.prepare(
      "INSERT INTO prototypes (id, biz_item_id, version, format, content, template_used, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind("proto_1", "bi_1", 1, "html", "<h1>Prototype</h1>", "idea", now).run();

    app = createApp(db);
  });

  // ─── LIST ───

  describe("GET /api/ax-bd/prototypes", () => {
    it("returns prototype list", async () => {
      const res = await app.request("/api/ax-bd/prototypes");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.items).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it("filters by bizItemId", async () => {
      const res = await app.request("/api/ax-bd/prototypes?bizItemId=bi_1");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.items).toHaveLength(1);
    });

    it("returns empty for non-matching filter", async () => {
      const res = await app.request("/api/ax-bd/prototypes?bizItemId=bi_nope");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.items).toHaveLength(0);
    });
  });

  // ─── GET BY ID ───

  describe("GET /api/ax-bd/prototypes/:id", () => {
    it("returns prototype detail", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto_1");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.id).toBe("proto_1");
      expect(body.content).toBe("<h1>Prototype</h1>");
      expect(body.pocEnv).toBeNull();
      expect(body.techReview).toBeNull();
    });

    it("returns 404 for missing", async () => {
      const res = await app.request("/api/ax-bd/prototypes/nope");
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE ───

  describe("DELETE /api/ax-bd/prototypes/:id", () => {
    it("deletes prototype", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto_1", { method: "DELETE" });
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);

      const check = await app.request("/api/ax-bd/prototypes/proto_1");
      expect(check.status).toBe(404);
    });

    it("returns 404 for missing", async () => {
      const res = await app.request("/api/ax-bd/prototypes/nope", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });

  // ─── POC ENV ───

  describe("POST /api/ax-bd/prototypes/:id/poc-env", () => {
    it("provisions a new environment", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto_1/poc-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { region: "us" } }),
      });
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.status).toBe("pending");
      expect(body.config).toEqual({ region: "us" });
    });

    it("returns 404 for non-existent prototype", async () => {
      const res = await app.request("/api/ax-bd/prototypes/nope/poc-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });

    it("returns 409 for duplicate provision", async () => {
      await app.request("/api/ax-bd/prototypes/proto_1/poc-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await app.request("/api/ax-bd/prototypes/proto_1/poc-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/ax-bd/prototypes/:id/poc-env", () => {
    it("returns 404 when no env", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto_1/poc-env");
      expect(res.status).toBe(404);
    });

    it("returns env after provision", async () => {
      await app.request("/api/ax-bd/prototypes/proto_1/poc-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await app.request("/api/ax-bd/prototypes/proto_1/poc-env");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.status).toBe("pending");
    });
  });

  describe("DELETE /api/ax-bd/prototypes/:id/poc-env", () => {
    it("terminates an active env", async () => {
      await app.request("/api/ax-bd/prototypes/proto_1/poc-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await app.request("/api/ax-bd/prototypes/proto_1/poc-env", { method: "DELETE" });
      expect(res.status).toBe(200);
    });

    it("returns 404 when no env", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto_1/poc-env", { method: "DELETE" });
      expect(res.status).toBe(404);
    });
  });

  // ─── TECH REVIEW ───

  describe("POST /api/ax-bd/prototypes/:id/tech-review", () => {
    it("creates a tech review", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto_1/tech-review", {
        method: "POST",
      });
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.prototypeId).toBe("proto_1");
      expect(["high", "medium", "low"]).toContain(body.feasibility);
      expect(["proceed", "modify", "reject"]).toContain(body.recommendation);
    });

    it("returns 404 for missing prototype", async () => {
      const res = await app.request("/api/ax-bd/prototypes/nope/tech-review", {
        method: "POST",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/ax-bd/prototypes/:id/tech-review", () => {
    it("returns 404 when no review", async () => {
      const res = await app.request("/api/ax-bd/prototypes/proto_1/tech-review");
      expect(res.status).toBe(404);
    });

    it("returns review after analyze", async () => {
      await app.request("/api/ax-bd/prototypes/proto_1/tech-review", { method: "POST" });
      const res = await app.request("/api/ax-bd/prototypes/proto_1/tech-review");
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.prototypeId).toBe("proto_1");
    });
  });
});
