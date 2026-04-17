import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BdArtifactService } from "../core/shaping/services/bd-artifact-service.js";

const ARTIFACTS_TABLE = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS biz_items (id TEXT PRIMARY KEY, org_id TEXT, title TEXT, description TEXT, source TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL,
    output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
    tokens_used INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_bd_artifacts_org ON bd_artifacts(org_id);
  CREATE INDEX IF NOT EXISTS idx_bd_artifacts_biz_item ON bd_artifacts(biz_item_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
`;

describe("BdArtifactService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: BdArtifactService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(ARTIFACTS_TABLE);
    // Seed prerequisite data
    (db as any).exec(`
      INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
      INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Test User', '2026-01-01', '2026-01-01');
      INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
        VALUES ('biz1', 'org1', 'AI Chatbot', 'AI chatbot for customer support', 'discovery', 'draft', 'user1', '2026-01-01', '2026-01-01');
    `);
    service = new BdArtifactService(db as unknown as D1Database);
  });

  it("creates an artifact with pending status", async () => {
    const artifact = await service.create({
      id: "art_001",
      orgId: "org1",
      bizItemId: "biz1",
      skillId: "ai-biz:ecosystem-map",
      stageId: "2-1",
      version: 1,
      inputText: "Analyze AI chatbot ecosystem",
      model: "claude-haiku-4-5-20251001",
      createdBy: "user1",
    });

    expect(artifact.id).toBe("art_001");
    expect(artifact.status).toBe("pending");
    expect(artifact.version).toBe(1);
    expect(artifact.outputText).toBeNull();
  });

  it("retrieves artifact by id and org", async () => {
    await service.create({
      id: "art_002",
      orgId: "org1",
      bizItemId: "biz1",
      skillId: "ai-biz:moat-analysis",
      stageId: "2-3",
      version: 1,
      inputText: "Moat analysis for chatbot",
      model: "claude-haiku-4-5-20251001",
      createdBy: "user1",
    });

    const found = await service.getById("org1", "art_002");
    expect(found).not.toBeNull();
    expect(found!.skillId).toBe("ai-biz:moat-analysis");

    const notFound = await service.getById("other-org", "art_002");
    expect(notFound).toBeNull();
  });

  it("lists artifacts with filters", async () => {
    await service.create({
      id: "art_a",
      orgId: "org1",
      bizItemId: "biz1",
      skillId: "ai-biz:ecosystem-map",
      stageId: "2-1",
      version: 1,
      inputText: "input a",
      model: "claude-haiku-4-5-20251001",
      createdBy: "user1",
    });
    await service.create({
      id: "art_b",
      orgId: "org1",
      bizItemId: "biz1",
      skillId: "pm:persona",
      stageId: "2-6",
      version: 1,
      inputText: "input b",
      model: "claude-haiku-4-5-20251001",
      createdBy: "user1",
    });

    const all = await service.list("org1", { page: 1, limit: 20 });
    expect(all.total).toBe(2);
    expect(all.items).toHaveLength(2);

    const filtered = await service.list("org1", { stageId: "2-6", page: 1, limit: 20 });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0]!.skillId).toBe("pm:persona");
  });

  it("auto-increments version for same biz_item + skill", async () => {
    const v1 = await service.getNextVersion("biz1", "ai-biz:ecosystem-map");
    expect(v1).toBe(1);

    await service.create({
      id: "art_v1",
      orgId: "org1",
      bizItemId: "biz1",
      skillId: "ai-biz:ecosystem-map",
      stageId: "2-1",
      version: 1,
      inputText: "v1 input",
      model: "claude-haiku-4-5-20251001",
      createdBy: "user1",
    });

    const v2 = await service.getNextVersion("biz1", "ai-biz:ecosystem-map");
    expect(v2).toBe(2);
  });

  it("returns version history ordered by version desc", async () => {
    for (let v = 1; v <= 3; v++) {
      await service.create({
        id: `art_vh${v}`,
        orgId: "org1",
        bizItemId: "biz1",
        skillId: "ai-biz:feasibility-study",
        stageId: "2-4",
        version: v,
        inputText: `version ${v} input`,
        model: "claude-haiku-4-5-20251001",
        createdBy: "user1",
      });
    }

    const history = await service.getVersionHistory("org1", "biz1", "ai-biz:feasibility-study");
    expect(history).toHaveLength(3);
    expect(history[0]!.version).toBe(3);
    expect(history[2]!.version).toBe(1);
  });

  it("updates status with output data", async () => {
    await service.create({
      id: "art_upd",
      orgId: "org1",
      bizItemId: "biz1",
      skillId: "ai-biz:ecosystem-map",
      stageId: "2-1",
      version: 1,
      inputText: "test",
      model: "claude-haiku-4-5-20251001",
      createdBy: "user1",
    });

    await service.updateStatus("art_upd", "completed", {
      outputText: "## Ecosystem Map\nAnalysis result...",
      tokensUsed: 1500,
      durationMs: 3200,
    });

    const updated = await service.getById("org1", "art_upd");
    expect(updated!.status).toBe("completed");
    expect(updated!.outputText).toContain("Ecosystem Map");
    expect(updated!.tokensUsed).toBe(1500);
    expect(updated!.durationMs).toBe(3200);
  });

  it("updates status without output data", async () => {
    await service.create({
      id: "art_run",
      orgId: "org1",
      bizItemId: "biz1",
      skillId: "pm:persona",
      stageId: "2-6",
      version: 1,
      inputText: "test",
      model: "claude-haiku-4-5-20251001",
      createdBy: "user1",
    });

    await service.updateStatus("art_run", "running");
    const running = await service.getById("org1", "art_run");
    expect(running!.status).toBe("running");
  });

  it("paginates results correctly", async () => {
    for (let i = 0; i < 5; i++) {
      await service.create({
        id: `art_pg${i}`,
        orgId: "org1",
        bizItemId: "biz1",
        skillId: `skill${i}`,
        stageId: "2-1",
        version: 1,
        inputText: `input ${i}`,
        model: "claude-haiku-4-5-20251001",
        createdBy: "user1",
      });
    }

    const page1 = await service.list("org1", { page: 1, limit: 2 });
    expect(page1.total).toBe(5);
    expect(page1.items).toHaveLength(2);

    const page3 = await service.list("org1", { page: 3, limit: 2 });
    expect(page3.items).toHaveLength(1);
  });
});
