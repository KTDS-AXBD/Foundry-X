import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BdProcessTracker } from "../core/shaping/services/bd-process-tracker.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS biz_items (id TEXT PRIMARY KEY, org_id TEXT, title TEXT, description TEXT, source TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT, entered_by TEXT NOT NULL, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, decision TEXT NOT NULL, question TEXT NOT NULL,
    reason TEXT, decided_by TEXT NOT NULL, decided_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, stage)
  );
  CREATE TABLE IF NOT EXISTS ax_commit_gates (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    question_1_answer TEXT, question_2_answer TEXT, question_3_answer TEXT, question_4_answer TEXT,
    final_decision TEXT NOT NULL, decided_by TEXT NOT NULL,
    decided_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    decision TEXT NOT NULL, stage TEXT NOT NULL, comment TEXT NOT NULL,
    decided_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT, model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20250714',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bd_artifacts_org ON bd_artifacts(org_id);
  CREATE INDEX IF NOT EXISTS idx_bd_artifacts_biz_item ON bd_artifacts(biz_item_id);
`;

const SEED = `
  INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
  INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Tester', '2026-01-01', '2026-01-01');
  INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('biz1', 'org1', 'AI Chatbot', 'AI chatbot desc', 'discovery', 'draft', 'user1', '2026-01-01', '2026-01-01');
  INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('biz2', 'org1', 'IoT Platform', 'IoT platform desc', 'field', 'draft', 'user1', '2026-01-01', '2026-01-01');
  INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by)
    VALUES ('ps1', 'biz1', 'org1', 'DISCOVERY', '2026-03-01', NULL, 'user1');
  INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, exited_at, entered_by)
    VALUES ('ps2', 'biz2', 'org1', 'REGISTERED', '2026-03-15', NULL, 'user1');
`;

describe("BdProcessTracker", () => {
  let db: ReturnType<typeof createMockD1>;
  let tracker: BdProcessTracker;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(SCHEMA);
    (db as any).exec(SEED);
    tracker = new BdProcessTracker(db as unknown as D1Database);
  });

  describe("getItemProgress", () => {
    it("returns progress for item with no artifacts", async () => {
      const progress = await tracker.getItemProgress("biz1", "org1");
      expect(progress).not.toBeNull();
      expect(progress!.bizItemId).toBe("biz1");
      expect(progress!.title).toBe("AI Chatbot");
      expect(progress!.pipelineStage).toBe("DISCOVERY");
      expect(progress!.completedStageCount).toBe(0);
      expect(progress!.totalStageCount).toBe(11);
      expect(progress!.currentDiscoveryStage).toBe("2-0");
      expect(progress!.trafficLight.overallSignal).toBe("green");
      expect(progress!.discoveryStages).toHaveLength(11);
      expect(progress!.commitGate).toBeNull();
      expect(progress!.lastDecision).toBeNull();
    });

    it("tracks completed stages from artifacts", async () => {
      (db as any).exec(`
        INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, status, created_by)
          VALUES ('a1', 'org1', 'biz1', 'ecosystem-map', '2-1', 1, 'input', 'completed', 'user1');
        INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, status, created_by)
          VALUES ('a2', 'org1', 'biz1', 'competitor-analysis', '2-2', 1, 'input', 'completed', 'user1');
      `);

      const progress = await tracker.getItemProgress("biz1", "org1");
      expect(progress!.completedStageCount).toBe(2);
      expect(progress!.currentDiscoveryStage).toBe("2-2");
      expect(progress!.discoveryStages[1]!.hasArtifacts).toBe(true);
      expect(progress!.discoveryStages[1]!.artifactCount).toBe(1);
      expect(progress!.discoveryStages[2]!.hasArtifacts).toBe(true);
    });

    it("returns red signal when drop checkpoint exists", async () => {
      (db as any).exec(`
        INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by, decided_at)
          VALUES ('cp1', 'biz1', 'org1', '2-1', 'go', 'Market viable?', 'user1', '2026-03-10');
        INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by, decided_at)
          VALUES ('cp2', 'biz1', 'org1', '2-2', 'drop', 'Competition too strong?', 'user1', '2026-03-12');
      `);

      const progress = await tracker.getItemProgress("biz1", "org1");
      expect(progress!.trafficLight.overallSignal).toBe("red");
      expect(progress!.trafficLight.go).toBe(1);
      expect(progress!.trafficLight.drop).toBe(1);
      expect(progress!.discoveryStages[1]!.checkpoint?.decision).toBe("go");
      expect(progress!.discoveryStages[2]!.checkpoint?.decision).toBe("drop");
    });

    it("returns yellow signal with 2+ pivot checkpoints", async () => {
      (db as any).exec(`
        INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by, decided_at)
          VALUES ('cp1', 'biz1', 'org1', '2-1', 'pivot', 'Needs pivot?', 'user1', '2026-03-10');
        INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by, decided_at)
          VALUES ('cp2', 'biz1', 'org1', '2-3', 'pivot', 'Another pivot', 'user1', '2026-03-12');
      `);

      const progress = await tracker.getItemProgress("biz1", "org1");
      expect(progress!.trafficLight.overallSignal).toBe("yellow");
      expect(progress!.trafficLight.pivot).toBe(2);
    });

    it("includes commit gate data", async () => {
      (db as any).exec(`
        INSERT INTO ax_commit_gates (id, biz_item_id, org_id, question_1_answer, question_2_answer, question_3_answer, question_4_answer, final_decision, decided_by, decided_at)
          VALUES ('cg1', 'biz1', 'org1', 'Yes', 'Yes', 'Yes', 'Yes', 'commit', 'user1', '2026-03-20');
      `);

      const progress = await tracker.getItemProgress("biz1", "org1");
      expect(progress!.commitGate).not.toBeNull();
      expect(progress!.commitGate!.decision).toBe("commit");
    });

    it("includes last decision", async () => {
      (db as any).exec(`
        INSERT INTO decisions (id, biz_item_id, org_id, decision, stage, comment, decided_by, created_at)
          VALUES ('d1', 'biz1', 'org1', 'GO', 'DISCOVERY', 'Looks good', 'user1', '2026-03-25');
      `);

      const progress = await tracker.getItemProgress("biz1", "org1");
      expect(progress!.lastDecision).not.toBeNull();
      expect(progress!.lastDecision!.decision).toBe("GO");
      expect(progress!.lastDecision!.comment).toBe("Looks good");
    });

    it("returns null for non-existent item", async () => {
      const progress = await tracker.getItemProgress("nonexistent", "org1");
      expect(progress).toBeNull();
    });
  });

  describe("getPortfolioProgress", () => {
    it("returns all items with summary", async () => {
      const result = await tracker.getPortfolioProgress("org1");
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.bySignal.green).toBe(2);
    });

    it("computes portfolio summary with bottleneck", async () => {
      const result = await tracker.getPortfolioProgress("org1");
      expect(result.summary.avgCompletionRate).toBe(0);
      expect(result.summary.bottleneck).not.toBeNull();
    });

    it("filters by signal", async () => {
      (db as any).exec(`
        INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by, decided_at)
          VALUES ('cp1', 'biz1', 'org1', '2-1', 'drop', 'Bad market', 'user1', '2026-03-10');
      `);

      const redOnly = await tracker.getPortfolioProgress("org1", { signal: "red" });
      expect(redOnly.items).toHaveLength(1);
      expect(redOnly.items[0]!.bizItemId).toBe("biz1");

      const greenOnly = await tracker.getPortfolioProgress("org1", { signal: "green" });
      expect(greenOnly.items).toHaveLength(1);
      expect(greenOnly.items[0]!.bizItemId).toBe("biz2");
    });

    it("returns empty for empty org", async () => {
      const result = await tracker.getPortfolioProgress("org-empty");
      expect(result.items).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
      expect(result.summary.bottleneck).toBeNull();
    });

    it("supports pagination", async () => {
      const page1 = await tracker.getPortfolioProgress("org1", { page: 1, limit: 1 });
      expect(page1.items).toHaveLength(1);
      expect(page1.total).toBe(2);

      const page2 = await tracker.getPortfolioProgress("org1", { page: 2, limit: 1 });
      expect(page2.items).toHaveLength(1);
    });
  });

  describe("getPortfolioSummary", () => {
    it("returns summary only", async () => {
      const summary = await tracker.getPortfolioSummary("org1");
      expect(summary.totalItems).toBe(2);
      expect(summary.bySignal.green).toBe(2);
      expect(summary.byPipelineStage.DISCOVERY).toBe(1);
      expect(summary.byPipelineStage.REGISTERED).toBe(1);
    });
  });
});
