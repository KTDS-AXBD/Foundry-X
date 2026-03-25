import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BmcHistoryService } from "../services/bmc-history.js";
import { axBdHistoryRoute } from "../routes/ax-bd-history.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS ax_bmcs (
    id          TEXT PRIMARY KEY,
    idea_id     TEXT,
    title       TEXT NOT NULL,
    git_ref     TEXT NOT NULL,
    author_id   TEXT NOT NULL,
    org_id      TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced'
                CHECK(sync_status IN ('synced', 'pending', 'failed')),
    is_deleted  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ax_bmc_blocks (
    bmc_id      TEXT NOT NULL REFERENCES ax_bmcs(id),
    block_type  TEXT NOT NULL CHECK(block_type IN (
                  'customer_segments', 'value_propositions', 'channels',
                  'customer_relationships', 'revenue_streams',
                  'key_resources', 'key_activities', 'key_partnerships',
                  'cost_structure'
                )),
    content     TEXT,
    updated_at  INTEGER NOT NULL,
    PRIMARY KEY (bmc_id, block_type)
  );
  CREATE TABLE IF NOT EXISTS ax_bmc_versions (
    id         TEXT PRIMARY KEY,
    bmc_id     TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    author_id  TEXT NOT NULL,
    message    TEXT DEFAULT '',
    snapshot   TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(bmc_id, commit_sha)
  );
  CREATE INDEX IF NOT EXISTS idx_bmc_versions_bmc_id ON ax_bmc_versions(bmc_id);
`;

const SAMPLE_BLOCKS: Record<string, string | null> = {
  customer_segments: "중견기업 IT 부서",
  value_propositions: "AI 자동화",
  channels: null,
  customer_relationships: "온라인 셀프서비스",
  revenue_streams: "구독 모델",
  key_resources: "AI 엔진",
  key_activities: "모델 학습",
  key_partnerships: "클라우드 파트너",
  cost_structure: "인프라 비용",
};

// ─── Service Tests ───

describe("BmcHistoryService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: BmcHistoryService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(CREATE_TABLES);
    service = new BmcHistoryService(db as unknown as D1Database);
  });

  describe("recordVersion", () => {
    it("creates a version record", async () => {
      const version = await service.recordVersion("bmc_1", "user_1", "초안 저장", SAMPLE_BLOCKS);

      expect(version.id).toBeTruthy();
      expect(version.bmcId).toBe("bmc_1");
      expect(version.authorId).toBe("user_1");
      expect(version.message).toBe("초안 저장");
      expect(version.commitSha).toBeTruthy();
      expect(version.createdAt).toBeTruthy();
    });

    it("uses provided commitSha when given", async () => {
      const version = await service.recordVersion("bmc_1", "user_1", "커밋", SAMPLE_BLOCKS, "abc12345");
      expect(version.commitSha).toBe("abc12345");
    });

    it("generates short sha when not provided", async () => {
      const version = await service.recordVersion("bmc_1", "user_1", "자동 sha", SAMPLE_BLOCKS);
      expect(version.commitSha.length).toBe(8);
    });
  });

  describe("getHistory", () => {
    it("returns versions in descending order", async () => {
      await service.recordVersion("bmc_1", "user_1", "v1", SAMPLE_BLOCKS, "sha1");
      await service.recordVersion("bmc_1", "user_1", "v2", SAMPLE_BLOCKS, "sha2");
      await service.recordVersion("bmc_1", "user_1", "v3", SAMPLE_BLOCKS, "sha3");

      const history = await service.getHistory("bmc_1");

      expect(history).toHaveLength(3);
      // 최신순 — v3이 첫 번째 (단, 같은 초에 생성되면 순서가 보장되지 않을 수 있어 메시지로 확인)
      expect(history.map((h) => h.message)).toEqual(["v3", "v2", "v1"]);
    });

    it("returns empty array for BMC with no versions", async () => {
      const history = await service.getHistory("nonexistent_bmc");
      expect(history).toEqual([]);
    });

    it("only returns versions for the specified BMC", async () => {
      await service.recordVersion("bmc_1", "user_1", "bmc1 version", SAMPLE_BLOCKS, "sha_a");
      await service.recordVersion("bmc_2", "user_1", "bmc2 version", SAMPLE_BLOCKS, "sha_b");

      const history = await service.getHistory("bmc_1");
      expect(history).toHaveLength(1);
      expect(history[0]!.bmcId).toBe("bmc_1");
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await service.recordVersion("bmc_1", "user_1", `v${i}`, SAMPLE_BLOCKS, `sha_${i}`);
      }

      const history = await service.getHistory("bmc_1", 3);
      expect(history).toHaveLength(3);
    });

    it("defaults to 20 limit", async () => {
      for (let i = 0; i < 25; i++) {
        await service.recordVersion("bmc_1", "user_1", `v${i}`, SAMPLE_BLOCKS, `sha_${i}`);
      }

      const history = await service.getHistory("bmc_1");
      expect(history).toHaveLength(20);
    });
  });

  describe("getVersion", () => {
    it("returns snapshot for valid bmc+sha", async () => {
      await service.recordVersion("bmc_1", "user_1", "snapshot test", SAMPLE_BLOCKS, "snap_sha");

      const snapshot = await service.getVersion("bmc_1", "snap_sha");

      expect(snapshot).not.toBeNull();
      expect(snapshot!.version.commitSha).toBe("snap_sha");
      expect(snapshot!.blocks).toEqual(SAMPLE_BLOCKS);
    });

    it("returns null for non-existent sha", async () => {
      const snapshot = await service.getVersion("bmc_1", "nonexistent");
      expect(snapshot).toBeNull();
    });

    it("returns null for wrong bmc_id", async () => {
      await service.recordVersion("bmc_1", "user_1", "test", SAMPLE_BLOCKS, "sha_x");
      const snapshot = await service.getVersion("bmc_2", "sha_x");
      expect(snapshot).toBeNull();
    });
  });

  describe("restoreVersion", () => {
    it("returns snapshot for valid version", async () => {
      await service.recordVersion("bmc_1", "user_1", "restorable", SAMPLE_BLOCKS, "restore_sha");

      const result = await service.restoreVersion("bmc_1", "restore_sha");

      expect(result).not.toBeNull();
      expect(result!.version.message).toBe("restorable");
      expect(result!.blocks.value_propositions).toBe("AI 자동화");
    });

    it("returns null for non-existent version", async () => {
      const result = await service.restoreVersion("bmc_1", "ghost_sha");
      expect(result).toBeNull();
    });
  });

  describe("multiple versions for same BMC", () => {
    it("stores and retrieves different snapshots", async () => {
      const blocks1 = { ...SAMPLE_BLOCKS, value_propositions: "v1 가치" };
      const blocks2 = { ...SAMPLE_BLOCKS, value_propositions: "v2 가치" };

      await service.recordVersion("bmc_1", "user_1", "first", blocks1, "sha_1");
      await service.recordVersion("bmc_1", "user_1", "second", blocks2, "sha_2");

      const snap1 = await service.getVersion("bmc_1", "sha_1");
      const snap2 = await service.getVersion("bmc_1", "sha_2");

      expect(snap1!.blocks.value_propositions).toBe("v1 가치");
      expect(snap2!.blocks.value_propositions).toBe("v2 가치");
    });
  });
});

// ─── Route Tests ───

describe("axBdHistoryRoute", () => {
  let db: ReturnType<typeof createMockD1>;
  let testApp: Hono;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(CREATE_TABLES);

    // 미니 Hono 앱 — 미들웨어 mock + 라우트 마운트
    testApp = new Hono();
    testApp.use("*", async (c, next) => {
      // Env mock
      (c.env as any) = { DB: db } as unknown as Env;
      // TenantVariables mock
      c.set("orgId" as any, "org_1");
      c.set("userId" as any, "user_1");
      await next();
    });
    testApp.route("/", axBdHistoryRoute);
  });

  async function seedVersion(bmcId: string, message: string, sha: string) {
    const svc = new BmcHistoryService(db as unknown as D1Database);
    return svc.recordVersion(bmcId, "user_1", message, SAMPLE_BLOCKS, sha);
  }

  describe("GET /ax-bd/bmc/:id/history", () => {
    it("returns 200 with versions array", async () => {
      await seedVersion("bmc_1", "v1", "sha_1");
      await seedVersion("bmc_1", "v2", "sha_2");

      const res = await testApp.request("/ax-bd/bmc/bmc_1/history");
      expect(res.status).toBe(200);

      const body = await res.json() as { versions: Array<{ commitSha: string }> };
      expect(body.versions).toHaveLength(2);
      expect(body.versions[0]!.commitSha).toBeTruthy();
    });

    it("returns 200 with empty array for no history", async () => {
      const res = await testApp.request("/ax-bd/bmc/empty_bmc/history");
      expect(res.status).toBe(200);

      const body = await res.json() as { versions: unknown[] };
      expect(body.versions).toEqual([]);
    });

    it("respects limit query param", async () => {
      for (let i = 0; i < 5; i++) {
        await seedVersion("bmc_1", `v${i}`, `sha_${i}`);
      }

      const res = await testApp.request("/ax-bd/bmc/bmc_1/history?limit=2");
      expect(res.status).toBe(200);

      const body = await res.json() as { versions: unknown[] };
      expect(body.versions).toHaveLength(2);
    });
  });

  describe("GET /ax-bd/bmc/:id/history/:commitSha", () => {
    it("returns 200 with snapshot", async () => {
      await seedVersion("bmc_1", "snapshot test", "snap_sha");

      const res = await testApp.request("/ax-bd/bmc/bmc_1/history/snap_sha");
      expect(res.status).toBe(200);

      const body = await res.json() as { version: { commitSha: string }; blocks: Record<string, string> };
      expect(body.version.commitSha).toBe("snap_sha");
      expect(body.blocks.value_propositions).toBe("AI 자동화");
    });

    it("returns 404 for non-existent sha", async () => {
      const res = await testApp.request("/ax-bd/bmc/bmc_1/history/ghost");
      expect(res.status).toBe(404);

      const body = await res.json() as { error: string };
      expect(body.error).toBe("Version not found");
    });
  });

  describe("POST /ax-bd/bmc/:id/history/:commitSha/restore", () => {
    it("returns 200 with restored snapshot", async () => {
      await seedVersion("bmc_1", "restorable", "restore_sha");

      const res = await testApp.request("/ax-bd/bmc/bmc_1/history/restore_sha/restore", {
        method: "POST",
      });
      expect(res.status).toBe(200);

      const body = await res.json() as { restored: { version: { commitSha: string }; blocks: Record<string, string> } };
      expect(body.restored).toBeTruthy();
      expect(body.restored.version.commitSha).toBe("restore_sha");
      expect(body.restored.blocks.customer_segments).toBe("중견기업 IT 부서");
    });

    it("returns 404 for non-existent version", async () => {
      const res = await testApp.request("/ax-bd/bmc/bmc_1/history/ghost/restore", {
        method: "POST",
      });
      expect(res.status).toBe(404);

      const body = await res.json() as { error: string };
      expect(body.error).toBe("Version not found");
    });
  });
});
