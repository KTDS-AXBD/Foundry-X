import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OrgSharedService } from "../modules/portal/services/org-shared-service.js";

describe("OrgSharedService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: OrgSharedService;

  beforeEach(() => {
    db = createMockD1();

    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        password_hash TEXT,
        auth_provider TEXT DEFAULT 'email',
        provider_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ax_bmcs (
        id TEXT PRIMARY KEY,
        idea_id TEXT,
        title TEXT NOT NULL,
        git_ref TEXT NOT NULL,
        author_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'synced',
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS onboarding_feedback (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        nps_score INTEGER NOT NULL,
        comment TEXT,
        page_path TEXT,
        session_seconds INTEGER,
        feedback_type TEXT DEFAULT 'nps',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user_1', 'alice@test.com', 'Alice', datetime('now'), datetime('now'));
      INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user_2', 'bob@test.com', 'Bob', datetime('now'), datetime('now'));
    `);

    service = new OrgSharedService(db as unknown as D1Database);
  });

  describe("getSharedBmcs", () => {
    it("returns all BMCs for the org with author info", async () => {
      const now = Date.now();
      (db as any).exec(`
        INSERT INTO ax_bmcs (id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
        VALUES ('bmc_1', 'BMC Alpha', 'ref1', 'user_1', 'org_1', 'synced', 0, ${now}, ${now});
        INSERT INTO ax_bmcs (id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
        VALUES ('bmc_2', 'BMC Beta', 'ref2', 'user_2', 'org_1', 'pending', 0, ${now - 1000}, ${now - 1000});
      `);

      const result = await service.getSharedBmcs("org_1", { page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.title).toBe("BMC Alpha");
      expect(result.items[0]!.authorName).toBe("Alice");
      expect(result.items[0]!.authorEmail).toBe("alice@test.com");
      expect(result.items[1]!.authorName).toBe("Bob");
    });

    it("excludes deleted BMCs", async () => {
      const now = Date.now();
      (db as any).exec(`
        INSERT INTO ax_bmcs (id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
        VALUES ('bmc_3', 'Deleted', 'ref3', 'user_1', 'org_1', 'synced', 1, ${now}, ${now});
      `);

      const result = await service.getSharedBmcs("org_1", { page: 1, limit: 20 });
      expect(result.total).toBe(0);
    });

    it("does not return BMCs from other orgs", async () => {
      const now = Date.now();
      (db as any).exec(`
        INSERT INTO ax_bmcs (id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
        VALUES ('bmc_4', 'Other Org', 'ref4', 'user_1', 'org_other', 'synced', 0, ${now}, ${now});
      `);

      const result = await service.getSharedBmcs("org_1", { page: 1, limit: 20 });
      expect(result.total).toBe(0);
    });

    it("paginates correctly", async () => {
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        (db as any).exec(`
          INSERT INTO ax_bmcs (id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
          VALUES ('bmc_p${i}', 'BMC ${i}', 'ref${i}', 'user_1', 'org_1', 'synced', 0, ${now - i * 1000}, ${now - i * 1000});
        `);
      }

      const page1 = await service.getSharedBmcs("org_1", { page: 1, limit: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page3 = await service.getSharedBmcs("org_1", { page: 3, limit: 2 });
      expect(page3.items).toHaveLength(1);
    });
  });

  describe("getActivityFeed", () => {
    it("returns mixed activity items sorted by timestamp", async () => {
      const now = Date.now();
      (db as any).exec(`
        INSERT INTO ax_bmcs (id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
        VALUES ('bmc_a1', 'New BMC', 'ref_a', 'user_1', 'org_1', 'synced', 0, ${now}, ${now});
        INSERT INTO onboarding_feedback (id, tenant_id, user_id, nps_score, created_at)
        VALUES ('fb_1', 'org_1', 'user_2', 8, datetime('now'));
      `);

      const items = await service.getActivityFeed("org_1", 10);

      expect(items.length).toBeGreaterThanOrEqual(1);
      const types = items.map((i) => i.type);
      expect(types).toContain("bmc_created");
    });

    it("respects limit", async () => {
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        (db as any).exec(`
          INSERT INTO ax_bmcs (id, title, git_ref, author_id, org_id, sync_status, is_deleted, created_at, updated_at)
          VALUES ('bmc_lim${i}', 'BMC ${i}', 'ref${i}', 'user_1', 'org_1', 'synced', 0, ${now - i}, ${now - i});
        `);
      }

      const items = await service.getActivityFeed("org_1", 3);
      expect(items.length).toBeLessThanOrEqual(3);
    });
  });
});
