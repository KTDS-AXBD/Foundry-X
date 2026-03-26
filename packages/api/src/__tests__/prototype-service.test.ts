import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrototypeService } from "../services/prototype-service.js";

describe("PrototypeService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PrototypeService;

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
        prototype_id TEXT NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        config TEXT DEFAULT '{}',
        provisioned_at TEXT,
        terminated_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tech_reviews (
        id TEXT PRIMARY KEY,
        prototype_id TEXT NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
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

    // Seed data
    const now = new Date().toISOString();
    await db.prepare(
      "INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind("bi_1", "org_test", "Test Item", "desc", "field", "draft", "user_1", now, now).run();

    await db.prepare(
      "INSERT INTO prototypes (id, biz_item_id, version, format, content, template_used, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind("proto_1", "bi_1", 1, "html", "<h1>Test</h1>", "idea", now).run();

    await db.prepare(
      "INSERT INTO prototypes (id, biz_item_id, version, format, content, template_used, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind("proto_2", "bi_1", 2, "html", "<h1>Test V2</h1>", "idea", now).run();

    svc = new PrototypeService(db as unknown as D1Database);
  });

  describe("list", () => {
    it("returns prototypes for tenant", async () => {
      const result = await svc.list("org_test");
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns empty for wrong tenant", async () => {
      const result = await svc.list("org_other");
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("filters by bizItemId", async () => {
      const result = await svc.list("org_test", { bizItemId: "bi_1" });
      expect(result.items).toHaveLength(2);
    });

    it("supports pagination", async () => {
      const result = await svc.list("org_test", { limit: 1, offset: 0 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(2);
    });
  });

  describe("getById", () => {
    it("returns prototype detail with null poc/review", async () => {
      const proto = await svc.getById("proto_1", "org_test");
      expect(proto).not.toBeNull();
      expect(proto!.id).toBe("proto_1");
      expect(proto!.bizItemId).toBe("bi_1");
      expect(proto!.content).toBe("<h1>Test</h1>");
      expect(proto!.pocEnv).toBeNull();
      expect(proto!.techReview).toBeNull();
    });

    it("returns null for wrong tenant", async () => {
      const proto = await svc.getById("proto_1", "org_other");
      expect(proto).toBeNull();
    });

    it("returns null for non-existent", async () => {
      const proto = await svc.getById("nope", "org_test");
      expect(proto).toBeNull();
    });

    it("includes pocEnv when exists", async () => {
      const now = new Date().toISOString();
      await db.prepare(
        "INSERT INTO poc_environments (id, prototype_id, status, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind("env_1", "proto_1", "ready", '{"region":"us"}', now, now).run();

      const proto = await svc.getById("proto_1", "org_test");
      expect(proto!.pocEnv).not.toBeNull();
      expect(proto!.pocEnv!.status).toBe("ready");
      expect(proto!.pocEnv!.config).toEqual({ region: "us" });
    });

    it("includes techReview when exists", async () => {
      const now = new Date().toISOString();
      await db.prepare(
        "INSERT INTO tech_reviews (id, prototype_id, feasibility, stack_fit, complexity, risks, recommendation, estimated_effort, reviewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind("tr_1", "proto_1", "high", 85, "medium", '["risk1"]', "proceed", "2 weeks", now, now).run();

      const proto = await svc.getById("proto_1", "org_test");
      expect(proto!.techReview).not.toBeNull();
      expect(proto!.techReview!.feasibility).toBe("high");
      expect(proto!.techReview!.stackFit).toBe(85);
      expect(proto!.techReview!.risks).toEqual(["risk1"]);
    });
  });

  describe("delete", () => {
    it("deletes prototype", async () => {
      const ok = await svc.delete("proto_1", "org_test");
      expect(ok).toBe(true);

      const after = await svc.getById("proto_1", "org_test");
      expect(after).toBeNull();
    });

    it("returns false for wrong tenant", async () => {
      const ok = await svc.delete("proto_1", "org_other");
      expect(ok).toBe(false);
    });

    it("returns false for non-existent", async () => {
      const ok = await svc.delete("nope", "org_test");
      expect(ok).toBe(false);
    });
  });
});
