import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PocEnvService } from "../modules/launch/services/poc-env-service.js";

describe("PocEnvService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PocEnvService;

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
        generated_at TEXT NOT NULL
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_poc_env_prototype ON poc_environments(prototype_id);
    `);

    const now = new Date().toISOString();
    await db.prepare(
      "INSERT INTO biz_items (id, org_id, title, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind("bi_1", "org_test", "Test", "u1", now, now).run();
    await db.prepare(
      "INSERT INTO prototypes (id, biz_item_id, version, format, content, generated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind("proto_1", "bi_1", 1, "html", "<h1>Test</h1>", now).run();

    svc = new PocEnvService(db as unknown as D1Database);
  });

  describe("provision", () => {
    it("creates a pending PoC environment", async () => {
      const env = await svc.provision("proto_1", "org_test");
      expect(env.id).toBeTruthy();
      expect(env.prototypeId).toBe("proto_1");
      expect(env.status).toBe("pending");
      expect(env.config).toEqual({});
    });

    it("accepts config", async () => {
      const env = await svc.provision("proto_1", "org_test", { region: "ap-northeast-2" });
      expect(env.config).toEqual({ region: "ap-northeast-2" });
    });

    it("throws for non-existent prototype", async () => {
      await expect(svc.provision("nope", "org_test")).rejects.toThrow("Prototype not found");
    });

    it("throws for wrong tenant", async () => {
      await expect(svc.provision("proto_1", "org_other")).rejects.toThrow("Prototype not found");
    });

    it("throws if active env already exists", async () => {
      await svc.provision("proto_1", "org_test");
      await expect(svc.provision("proto_1", "org_test")).rejects.toThrow("Active PoC environment already exists");
    });

    it("allows re-provision after termination", async () => {
      await svc.provision("proto_1", "org_test");
      await svc.teardown("proto_1", "org_test");
      const env = await svc.provision("proto_1", "org_test");
      expect(env.status).toBe("pending");
    });
  });

  describe("getByPrototype", () => {
    it("returns null when no env", async () => {
      const env = await svc.getByPrototype("proto_1", "org_test");
      expect(env).toBeNull();
    });

    it("returns env after provision", async () => {
      await svc.provision("proto_1", "org_test");
      const env = await svc.getByPrototype("proto_1", "org_test");
      expect(env).not.toBeNull();
      expect(env!.status).toBe("pending");
    });

    it("returns null for wrong tenant", async () => {
      await svc.provision("proto_1", "org_test");
      const env = await svc.getByPrototype("proto_1", "org_other");
      expect(env).toBeNull();
    });
  });

  describe("teardown", () => {
    it("terminates an active env", async () => {
      await svc.provision("proto_1", "org_test");
      await svc.teardown("proto_1", "org_test");

      const env = await svc.getByPrototype("proto_1", "org_test");
      expect(env!.status).toBe("terminated");
      expect(env!.terminatedAt).toBeTruthy();
    });

    it("throws for non-existent env", async () => {
      await expect(svc.teardown("proto_1", "org_test")).rejects.toThrow("PoC environment not found");
    });

    it("throws for already terminated", async () => {
      await svc.provision("proto_1", "org_test");
      await svc.teardown("proto_1", "org_test");
      await expect(svc.teardown("proto_1", "org_test")).rejects.toThrow("Environment already terminated");
    });
  });
});
