import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { gatePackageRoute } from "../modules/gate/routes/gate-package.js";
import { GatePackageService, MissingArtifactsError } from "../modules/gate/services/gate-package-service.js";
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
  CREATE TABLE IF NOT EXISTS gate_packages (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    gate_type TEXT NOT NULL,
    items TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    download_url TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bmc_canvases (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT '',
    biz_item_id TEXT,
    title TEXT DEFAULT 'BMC',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS prd_documents (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT '',
    biz_item_id TEXT,
    title TEXT DEFAULT 'PRD',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sixhats_debates (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT '',
    biz_item_id TEXT,
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
  app.route("/api", gatePackageRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedItem(db: D1Database, id: string) {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test Item', 'test-user')`,
  );
}

async function seedArtifacts(db: D1Database, bizItemId: string, opts?: { bmc?: boolean; prd?: boolean; bdp?: boolean; sixhats?: boolean }) {
  const exec = (q: string) => (db as unknown as { exec: (q: string) => Promise<void> }).exec(q);
  if (opts?.bmc !== false) {
    await exec(`INSERT INTO bmc_canvases (id, org_id, biz_item_id, title) VALUES ('bmc-${bizItemId}', 'org_test', '${bizItemId}', 'BMC Canvas')`);
  }
  if (opts?.prd !== false) {
    await exec(`INSERT INTO prd_documents (id, org_id, biz_item_id, title) VALUES ('prd-${bizItemId}', 'org_test', '${bizItemId}', 'PRD Document')`);
  }
  if (opts?.bdp !== false) {
    await exec(`INSERT INTO bdp_versions (id, org_id, biz_item_id, version_num, content, created_by) VALUES ('bdp-${bizItemId}', 'org_test', '${bizItemId}', 1, '# BDP', 'test-user')`);
  }
  if (opts?.sixhats) {
    await exec(`INSERT INTO sixhats_debates (id, org_id, biz_item_id) VALUES ('sh-${bizItemId}', 'org_test', '${bizItemId}')`);
  }
}

// ─── GatePackageService Unit Tests ───

describe("GatePackageService", () => {
  let db: D1Database;
  let svc: GatePackageService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    svc = new GatePackageService(db);
  });

  it("creates gate package with collected artifacts", async () => {
    await seedItem(db, "item-1");
    await seedArtifacts(db, "item-1", { bmc: true, prd: true, bdp: true, sixhats: true });

    const pkg = await svc.create({ bizItemId: "item-1", orgId: "org_test", gateType: "orb", createdBy: "test-user" });
    expect(pkg.gateType).toBe("orb");
    expect(pkg.status).toBe("draft");
    expect(pkg.items).toHaveLength(4);
    const types = pkg.items.map((i) => i.type);
    expect(types).toContain("bmc");
    expect(types).toContain("prd");
    expect(types).toContain("bdp");
    expect(types).toContain("sixhats");
  });

  it("creates package with minimal artifacts (BMC + PRD)", async () => {
    await seedItem(db, "item-1");
    await seedArtifacts(db, "item-1", { bmc: true, prd: true, bdp: false, sixhats: false });

    const pkg = await svc.create({ bizItemId: "item-1", orgId: "org_test", gateType: "prb", createdBy: "test-user" });
    expect(pkg.items).toHaveLength(2);
  });

  it("throws MissingArtifactsError when BMC missing", async () => {
    await seedItem(db, "item-1");
    await seedArtifacts(db, "item-1", { bmc: false, prd: true });

    await expect(
      svc.create({ bizItemId: "item-1", orgId: "org_test", gateType: "orb", createdBy: "test-user" }),
    ).rejects.toThrow(MissingArtifactsError);
  });

  it("throws MissingArtifactsError when PRD missing", async () => {
    await seedItem(db, "item-1");
    await seedArtifacts(db, "item-1", { bmc: true, prd: false });

    await expect(
      svc.create({ bizItemId: "item-1", orgId: "org_test", gateType: "orb", createdBy: "test-user" }),
    ).rejects.toThrow(MissingArtifactsError);
  });

  it("throws MissingArtifactsError with both missing", async () => {
    await seedItem(db, "item-1");

    try {
      await svc.create({ bizItemId: "item-1", orgId: "org_test", gateType: "orb", createdBy: "test-user" });
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(MissingArtifactsError);
      expect((e as MissingArtifactsError).missing).toContain("BMC");
      expect((e as MissingArtifactsError).missing).toContain("PRD");
    }
  });

  it("get returns null for non-existent package", async () => {
    const result = await svc.get("non-existent", "org_test");
    expect(result).toBeNull();
  });

  it("getDownload returns filename and items", async () => {
    await seedItem(db, "item-1");
    await seedArtifacts(db, "item-1");
    await svc.create({ bizItemId: "item-1", orgId: "org_test", gateType: "orb", createdBy: "test-user" });

    const download = await svc.getDownload("item-1", "org_test");
    expect(download).not.toBeNull();
    expect(download!.filename).toContain("gate-orb-item-1");
    expect(download!.items.length).toBeGreaterThanOrEqual(2);
  });

  it("updateStatus changes draft to ready", async () => {
    await seedItem(db, "item-1");
    await seedArtifacts(db, "item-1");
    await svc.create({ bizItemId: "item-1", orgId: "org_test", gateType: "orb", createdBy: "test-user" });

    const updated = await svc.updateStatus("item-1", "org_test", "ready");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("ready");
  });

  it("updateStatus returns null for non-existent package", async () => {
    const result = await svc.updateStatus("non-existent", "org_test", "ready");
    expect(result).toBeNull();
  });
});

// ─── Gate Package Route Integration Tests ───

describe("Gate Package Routes (F235)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/gate-package/:bizItemId", () => {
    it("creates gate package with artifacts", async () => {
      await seedItem(db, "item-1");
      await seedArtifacts(db, "item-1");

      const res = await app.request("/api/gate-package/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateType: "orb" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { gateType: string; items: unknown[] };
      expect(body.gateType).toBe("orb");
      expect(body.items.length).toBeGreaterThanOrEqual(2);
    });

    it("returns 422 when artifacts missing", async () => {
      await seedItem(db, "item-1");
      const res = await app.request("/api/gate-package/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateType: "orb" }),
      });
      expect(res.status).toBe(422);
      const body = (await res.json()) as { missing: string[] };
      expect(body.missing).toContain("BMC");
    });

    it("returns 400 for invalid gate type", async () => {
      const res = await app.request("/api/gate-package/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateType: "invalid" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/gate-package/:bizItemId", () => {
    it("returns package", async () => {
      await seedItem(db, "item-1");
      await seedArtifacts(db, "item-1");
      // Create package first
      await app.request("/api/gate-package/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateType: "prb" }),
      });

      const res = await app.request("/api/gate-package/item-1");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { gateType: string };
      expect(body.gateType).toBe("prb");
    });

    it("returns 404 for non-existent package", async () => {
      const res = await app.request("/api/gate-package/non-existent");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/gate-package/:bizItemId/download", () => {
    it("returns download metadata", async () => {
      await seedItem(db, "item-1");
      await seedArtifacts(db, "item-1");
      await app.request("/api/gate-package/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateType: "orb" }),
      });

      const res = await app.request("/api/gate-package/item-1/download");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { filename: string; items: unknown[] };
      expect(body.filename).toContain("gate-orb");
    });

    it("returns 404 for non-existent package", async () => {
      const res = await app.request("/api/gate-package/non-existent/download");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/gate-package/:bizItemId/status", () => {
    it("updates status to ready", async () => {
      await seedItem(db, "item-1");
      await seedArtifacts(db, "item-1");
      await app.request("/api/gate-package/item-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateType: "orb" }),
      });

      const res = await app.request("/api/gate-package/item-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("ready");
    });

    it("returns 400 for invalid status", async () => {
      const res = await app.request("/api/gate-package/item-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent package", async () => {
      const res = await app.request("/api/gate-package/non-existent/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
      expect(res.status).toBe(404);
    });
  });
});
