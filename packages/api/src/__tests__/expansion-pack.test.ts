import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { ExpansionPackService } from "../services/expansion-pack.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS expansion_packs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    domain TEXT NOT NULL DEFAULT 'custom' CHECK(domain IN ('security', 'data', 'devops', 'testing', 'custom')),
    version TEXT NOT NULL DEFAULT '1.0.0',
    manifest TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    author TEXT NOT NULL,
    install_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_expansion_packs_status ON expansion_packs(status, domain);

  CREATE TABLE IF NOT EXISTS pack_installations (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    installed_by TEXT NOT NULL,
    installed_at TEXT NOT NULL DEFAULT (datetime('now')),
    config TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (pack_id) REFERENCES expansion_packs(id),
    UNIQUE(pack_id, org_id)
  );
  CREATE INDEX IF NOT EXISTS idx_pack_installations_org ON pack_installations(org_id);
`;

describe("ExpansionPackService", () => {
  let db: D1Database;
  let svc: ExpansionPackService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    svc = new ExpansionPackService(db);
  });

  it("create: returns pack with defaults", async () => {
    const pack = await svc.create("org_test", "user1", { name: "Security Pack" });
    expect(pack.id).toMatch(/^pack-/);
    expect(pack.orgId).toBe("org_test");
    expect(pack.name).toBe("Security Pack");
    expect(pack.description).toBe("");
    expect(pack.domain).toBe("custom");
    expect(pack.version).toBe("1.0.0");
    expect(pack.manifest).toEqual({});
    expect(pack.status).toBe("draft");
    expect(pack.author).toBe("user1");
    expect(pack.installCount).toBe(0);
  });

  it("create: respects custom fields", async () => {
    const pack = await svc.create("org_test", "user1", {
      name: "DevOps Pack",
      description: "CI/CD tools",
      domain: "devops",
      version: "2.0.0",
      manifest: { agentRoles: ["deployer"], workflows: ["deploy"] },
    });
    expect(pack.domain).toBe("devops");
    expect(pack.version).toBe("2.0.0");
    expect(pack.manifest).toEqual({ agentRoles: ["deployer"], workflows: ["deploy"] });
  });

  it("getById: returns pack or null", async () => {
    const created = await svc.create("org_test", "user1", { name: "Test" });
    const pack = await svc.getById(created.id);
    expect(pack).not.toBeNull();
    expect(pack!.name).toBe("Test");

    const missing = await svc.getById("nonexistent");
    expect(missing).toBeNull();
  });

  it("list: returns all packs", async () => {
    await svc.create("org_test", "user1", { name: "Pack A" });
    await svc.create("org_test", "user1", { name: "Pack B" });

    const packs = await svc.list();
    expect(packs).toHaveLength(2);
  });

  it("list: filters by domain", async () => {
    await svc.create("org_test", "user1", { name: "Sec", domain: "security" });
    await svc.create("org_test", "user1", { name: "Data", domain: "data" });

    const filtered = await svc.list({ domain: "security" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.name).toBe("Sec");
  });

  it("update: updates partial fields", async () => {
    const pack = await svc.create("org_test", "user1", { name: "Original" });
    const updated = await svc.update(pack.id, { name: "Updated", description: "New desc" });

    expect(updated!.name).toBe("Updated");
    expect(updated!.description).toBe("New desc");
    expect(updated!.domain).toBe("custom"); // unchanged
  });

  it("publish: sets status to published", async () => {
    const pack = await svc.create("org_test", "user1", { name: "My Pack" });
    expect(pack.status).toBe("draft");

    const published = await svc.publish(pack.id);
    expect(published!.status).toBe("published");
  });

  it("install: creates installation and increments count", async () => {
    const pack = await svc.create("org_test", "user1", { name: "My Pack" });
    const inst = await svc.install(pack.id, "org_test", "user1", { env: "production" });

    expect(inst.id).toMatch(/^inst-/);
    expect(inst.packId).toBe(pack.id);
    expect(inst.orgId).toBe("org_test");
    expect(inst.installedBy).toBe("user1");
    expect(inst.config).toEqual({ env: "production" });

    const updated = await svc.getById(pack.id);
    expect(updated!.installCount).toBe(1);
  });

  it("uninstall: removes installation and decrements count", async () => {
    const pack = await svc.create("org_test", "user1", { name: "My Pack" });
    const inst = await svc.install(pack.id, "org_test", "user1");

    await svc.uninstall(inst.id);

    const updated = await svc.getById(pack.id);
    expect(updated!.installCount).toBe(0);

    const installations = await svc.listInstallations("org_test");
    expect(installations).toHaveLength(0);
  });

  it("listInstallations: returns org installations", async () => {
    const pack = await svc.create("org_test", "user1", { name: "Pack" });
    await svc.install(pack.id, "org_test", "user1");

    const installations = await svc.listInstallations("org_test");
    expect(installations).toHaveLength(1);
    expect(installations[0]!.packId).toBe(pack.id);

    const otherInstallations = await svc.listInstallations("org_other");
    expect(otherInstallations).toHaveLength(0);
  });
});
