import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { bdpRoute } from "../routes/bdp.js";
import { BdpService, BdpFinalizedError } from "../services/bdp-service.js";
import { ProposalGenerator, NoBdpError } from "../services/proposal-generator.js";
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

async function seedItem(db: D1Database, id: string) {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test Item', 'test-user')`,
  );
}

async function seedBdpVersion(db: D1Database, bizItemId: string, versionNum: number, content: string, isFinal = 0) {
  const id = `bdp-${bizItemId}-v${versionNum}`;
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO bdp_versions (id, org_id, biz_item_id, version_num, content, is_final, created_by) VALUES ('${id}', 'org_test', '${bizItemId}', ${versionNum}, '${content}', ${isFinal}, 'test-user')`,
  );
}

// ─── BdpService Unit Tests ───

describe("BdpService", () => {
  let db: D1Database;
  let svc: BdpService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    svc = new BdpService(db);
  });

  it("creates first version with versionNum=1", async () => {
    await seedItem(db, "item-1");
    const v = await svc.createVersion({ bizItemId: "item-1", orgId: "org_test", content: "# BDP v1", createdBy: "test-user" });
    expect(v.versionNum).toBe(1);
    expect(v.content).toBe("# BDP v1");
    expect(v.isFinal).toBe(false);
  });

  it("increments versionNum on subsequent creates", async () => {
    await seedItem(db, "item-1");
    await svc.createVersion({ bizItemId: "item-1", orgId: "org_test", content: "v1", createdBy: "test-user" });
    const v2 = await svc.createVersion({ bizItemId: "item-1", orgId: "org_test", content: "v2", createdBy: "test-user" });
    expect(v2.versionNum).toBe(2);
  });

  it("getLatest returns most recent version", async () => {
    await seedItem(db, "item-1");
    await seedBdpVersion(db, "item-1", 1, "v1 content");
    await seedBdpVersion(db, "item-1", 2, "v2 content");
    const latest = await svc.getLatest("item-1", "org_test");
    expect(latest).not.toBeNull();
    expect(latest!.versionNum).toBe(2);
    expect(latest!.content).toBe("v2 content");
  });

  it("getLatest returns null for non-existent item", async () => {
    const result = await svc.getLatest("non-existent", "org_test");
    expect(result).toBeNull();
  });

  it("listVersions returns all versions DESC", async () => {
    await seedItem(db, "item-1");
    await seedBdpVersion(db, "item-1", 1, "v1");
    await seedBdpVersion(db, "item-1", 2, "v2");
    await seedBdpVersion(db, "item-1", 3, "v3");
    const versions = await svc.listVersions("item-1", "org_test");
    expect(versions).toHaveLength(3);
    expect(versions[0]!.versionNum).toBe(3);
    expect(versions[2]!.versionNum).toBe(1);
  });

  it("finalize sets is_final on latest version", async () => {
    await seedItem(db, "item-1");
    await seedBdpVersion(db, "item-1", 1, "content");
    const finalized = await svc.finalize("item-1", "org_test", "test-user");
    expect(finalized).not.toBeNull();
    expect(finalized!.isFinal).toBe(true);
  });

  it("finalize returns null for non-existent BDP", async () => {
    const result = await svc.finalize("non-existent", "org_test", "test-user");
    expect(result).toBeNull();
  });

  it("createVersion throws BdpFinalizedError when finalized", async () => {
    await seedItem(db, "item-1");
    await seedBdpVersion(db, "item-1", 1, "final content", 1);
    await expect(
      svc.createVersion({ bizItemId: "item-1", orgId: "org_test", content: "new", createdBy: "test-user" }),
    ).rejects.toThrow(BdpFinalizedError);
  });

  it("getDiff returns content of two versions", async () => {
    await seedItem(db, "item-1");
    await seedBdpVersion(db, "item-1", 1, "version one");
    await seedBdpVersion(db, "item-1", 2, "version two");
    const diff = await svc.getDiff("item-1", "org_test", 1, 2);
    expect(diff).not.toBeNull();
    expect(diff!.v1Content).toBe("version one");
    expect(diff!.v2Content).toBe("version two");
  });

  it("getDiff returns null if version not found", async () => {
    await seedItem(db, "item-1");
    await seedBdpVersion(db, "item-1", 1, "v1");
    const diff = await svc.getDiff("item-1", "org_test", 1, 99);
    expect(diff).toBeNull();
  });
});

// ─── ProposalGenerator Unit Tests ───

describe("ProposalGenerator", () => {
  let db: D1Database;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
  });

  it("generates proposal from BDP content (fallback mode)", async () => {
    await seedItem(db, "item-1");
    await seedBdpVersion(db, "item-1", 1, "# Business Plan\n\nKey value proposition.\n\nMarket opportunity.");
    const gen = new ProposalGenerator(db);
    const result = await gen.generate({ bizItemId: "item-1", orgId: "org_test", createdBy: "test-user" });
    expect(result.content).toContain("[PROPOSAL]");
    expect(result.versionNum).toBe(2);
  });

  it("throws NoBdpError when no BDP exists", async () => {
    const gen = new ProposalGenerator(db);
    await expect(
      gen.generate({ bizItemId: "non-existent", orgId: "org_test", createdBy: "test-user" }),
    ).rejects.toThrow(NoBdpError);
  });
});

// ─── BDP Route Integration Tests ───

describe("BDP Routes (F234+F237)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/bdp/:bizItemId", () => {
    it("creates new BDP version", async () => {
      await seedItem(db, "item-1");
      const res = await app.request("/api/bdp/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# My BDP\n\nBusiness plan content." }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { versionNum: number; content: string };
      expect(body.versionNum).toBe(1);
      expect(body.content).toContain("My BDP");
    });

    it("returns 400 for empty content", async () => {
      const res = await app.request("/api/bdp/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 409 when BDP is finalized", async () => {
      await seedItem(db, "item-1");
      await seedBdpVersion(db, "item-1", 1, "final", 1);
      const res = await app.request("/api/bdp/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "new content" }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/bdp/:bizItemId", () => {
    it("returns latest BDP version", async () => {
      await seedItem(db, "item-1");
      await seedBdpVersion(db, "item-1", 1, "v1");
      await seedBdpVersion(db, "item-1", 2, "v2 latest");
      const res = await app.request("/api/bdp/item-1");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { versionNum: number; content: string };
      expect(body.versionNum).toBe(2);
      expect(body.content).toBe("v2 latest");
    });

    it("returns 404 for non-existent BDP", async () => {
      const res = await app.request("/api/bdp/non-existent");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/bdp/:bizItemId/versions", () => {
    it("returns version history", async () => {
      await seedItem(db, "item-1");
      await seedBdpVersion(db, "item-1", 1, "v1");
      await seedBdpVersion(db, "item-1", 2, "v2");
      const res = await app.request("/api/bdp/item-1/versions");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { versionNum: number }[];
      expect(body).toHaveLength(2);
    });
  });

  describe("PATCH /api/bdp/:bizItemId/finalize", () => {
    it("finalizes latest BDP", async () => {
      await seedItem(db, "item-1");
      await seedBdpVersion(db, "item-1", 1, "content");
      const res = await app.request("/api/bdp/item-1/finalize", { method: "PATCH" });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { isFinal: boolean };
      expect(body.isFinal).toBe(true);
    });

    it("returns 404 for non-existent BDP", async () => {
      const res = await app.request("/api/bdp/non-existent/finalize", { method: "PATCH" });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/bdp/:bizItemId/diff/:v1/:v2", () => {
    it("returns diff between two versions", async () => {
      await seedItem(db, "item-1");
      await seedBdpVersion(db, "item-1", 1, "old content");
      await seedBdpVersion(db, "item-1", 2, "new content");
      const res = await app.request("/api/bdp/item-1/diff/1/2");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { v1Content: string; v2Content: string };
      expect(body.v1Content).toBe("old content");
      expect(body.v2Content).toBe("new content");
    });

    it("returns 404 for non-existent version", async () => {
      await seedItem(db, "item-1");
      await seedBdpVersion(db, "item-1", 1, "v1");
      const res = await app.request("/api/bdp/item-1/diff/1/99");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/bdp/:bizItemId/generate-proposal (F237)", () => {
    it("generates proposal from BDP", async () => {
      await seedItem(db, "item-1");
      await seedBdpVersion(db, "item-1", 1, "# Plan\n\nKey value.\n\nMarket size.");
      const res = await app.request("/api/bdp/item-1/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { content: string; versionNum: number };
      expect(body.content).toContain("[PROPOSAL]");
      expect(body.versionNum).toBe(2);
    });

    it("returns 404 when no BDP exists", async () => {
      const res = await app.request("/api/bdp/non-existent/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });
  });
});
