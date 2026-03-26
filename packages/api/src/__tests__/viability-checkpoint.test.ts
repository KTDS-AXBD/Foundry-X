import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { ViabilityCheckpointService } from "../services/viability-checkpoint-service.js";

describe("ViabilityCheckpointService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: ViabilityCheckpointService;

  beforeEach(() => {
    db = createMockD1();

    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS biz_items (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        source TEXT NOT NULL DEFAULT 'field',
        status TEXT NOT NULL DEFAULT 'draft',
        discovery_type TEXT CHECK (discovery_type IN ('I', 'M', 'P', 'T', 'S')),
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
        id TEXT PRIMARY KEY,
        biz_item_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        stage TEXT NOT NULL CHECK (stage IN ('2-1','2-2','2-3','2-4','2-5','2-6','2-7')),
        decision TEXT NOT NULL CHECK (decision IN ('go','pivot','drop')),
        question TEXT NOT NULL,
        reason TEXT,
        decided_by TEXT NOT NULL,
        decided_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(biz_item_id, stage)
      );

      CREATE TABLE IF NOT EXISTS ax_commit_gates (
        id TEXT PRIMARY KEY,
        biz_item_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        question_1_answer TEXT,
        question_2_answer TEXT,
        question_3_answer TEXT,
        question_4_answer TEXT,
        final_decision TEXT NOT NULL CHECK (final_decision IN ('commit','explore_alternatives','drop')),
        reason TEXT,
        decided_by TEXT NOT NULL,
        decided_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(biz_item_id)
      );

      INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item1', 'org1', 'Test Item', 'user1');
      INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item2', 'org1', 'Test Item 2', 'user1');
    `);

    service = new ViabilityCheckpointService(db as unknown as D1Database);
  });

  describe("create", () => {
    it("creates a checkpoint", async () => {
      const cp = await service.create("org1", "user1", {
        bizItemId: "item1",
        stage: "2-1",
        decision: "go",
        question: "레퍼런스 분석 완료",
      });

      expect(cp.bizItemId).toBe("item1");
      expect(cp.stage).toBe("2-1");
      expect(cp.decision).toBe("go");
      expect(cp.question).toBe("레퍼런스 분석 완료");
      expect(cp.decidedBy).toBe("user1");
      expect(cp.id).toBeTruthy();
    });

    it("creates a checkpoint with reason", async () => {
      const cp = await service.create("org1", "user1", {
        bizItemId: "item1",
        stage: "2-3",
        decision: "pivot",
        question: "경쟁 상황 분석",
        reason: "포지셔닝 재검토 필요 — B2G로 방향 전환",
      });

      expect(cp.decision).toBe("pivot");
      expect(cp.reason).toBe("포지셔닝 재검토 필요 — B2G로 방향 전환");
    });

    it("upserts on same biz_item_id + stage", async () => {
      await service.create("org1", "user1", {
        bizItemId: "item1",
        stage: "2-1",
        decision: "go",
        question: "first decision",
      });

      const cp2 = await service.create("org1", "user1", {
        bizItemId: "item1",
        stage: "2-1",
        decision: "pivot",
        question: "revised decision",
      });

      expect(cp2.decision).toBe("pivot");
      expect(cp2.question).toBe("revised decision");

      const list = await service.listByItem("item1");
      expect(list).toHaveLength(1);
    });
  });

  describe("listByItem", () => {
    it("returns empty for item without checkpoints", async () => {
      const list = await service.listByItem("item1");
      expect(list).toHaveLength(0);
    });

    it("returns checkpoints ordered by stage", async () => {
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-3", decision: "go", question: "q3" });
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-1", decision: "go", question: "q1" });
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-2", decision: "pivot", question: "q2" });

      const list = await service.listByItem("item1");
      expect(list).toHaveLength(3);
      expect(list[0]!.stage).toBe("2-1");
      expect(list[1]!.stage).toBe("2-2");
      expect(list[2]!.stage).toBe("2-3");
    });

    it("only returns checkpoints for specified item", async () => {
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-1", decision: "go", question: "q1" });
      await service.create("org1", "user1", { bizItemId: "item2", stage: "2-1", decision: "drop", question: "q1" });

      const list = await service.listByItem("item1");
      expect(list).toHaveLength(1);
      expect(list[0]!.bizItemId).toBe("item1");
    });
  });

  describe("update", () => {
    it("updates an existing checkpoint", async () => {
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-1", decision: "go", question: "q1" });

      const updated = await service.update("item1", "2-1", { decision: "pivot", reason: "changed mind" });

      expect(updated).not.toBeNull();
      expect(updated!.decision).toBe("pivot");
      expect(updated!.reason).toBe("changed mind");
    });

    it("returns null for non-existent checkpoint", async () => {
      const result = await service.update("item1", "2-1", { decision: "go" });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("deletes an existing checkpoint", async () => {
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-1", decision: "go", question: "q1" });

      const ok = await service.delete("item1", "2-1");
      expect(ok).toBe(true);

      const list = await service.listByItem("item1");
      expect(list).toHaveLength(0);
    });

    it("returns false for non-existent checkpoint", async () => {
      const ok = await service.delete("item1", "2-1");
      expect(ok).toBe(false);
    });
  });

  describe("getTrafficLight", () => {
    it("returns all green when only go decisions", async () => {
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-1", decision: "go", question: "q" });
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-2", decision: "go", question: "q" });
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-3", decision: "go", question: "q" });

      const tl = await service.getTrafficLight("item1");
      expect(tl.overallSignal).toBe("green");
      expect(tl.summary.go).toBe(3);
      expect(tl.summary.pivot).toBe(0);
      expect(tl.summary.drop).toBe(0);
      expect(tl.summary.pending).toBe(4);
    });

    it("returns yellow when 2+ pivots", async () => {
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-1", decision: "go", question: "q" });
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-2", decision: "pivot", question: "q" });
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-3", decision: "pivot", question: "q" });

      const tl = await service.getTrafficLight("item1");
      expect(tl.overallSignal).toBe("yellow");
    });

    it("returns red when any drop", async () => {
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-1", decision: "go", question: "q" });
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-2", decision: "drop", question: "q" });

      const tl = await service.getTrafficLight("item1");
      expect(tl.overallSignal).toBe("red");
    });

    it("returns green with one pivot", async () => {
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-1", decision: "go", question: "q" });
      await service.create("org1", "user1", { bizItemId: "item1", stage: "2-2", decision: "pivot", question: "q" });

      const tl = await service.getTrafficLight("item1");
      expect(tl.overallSignal).toBe("green");
    });

    it("includes commit gate info when present", async () => {
      // Insert commit gate directly
      (db as any).exec(`
        INSERT INTO ax_commit_gates (id, biz_item_id, org_id, final_decision, decided_by, decided_at, created_at)
        VALUES ('cg1', 'item1', 'org1', 'commit', 'user1', datetime('now'), datetime('now'))
      `);

      const tl = await service.getTrafficLight("item1");
      expect(tl.commitGate).not.toBeNull();
      expect(tl.commitGate!.decision).toBe("commit");
    });

    it("returns red when commit gate is drop", async () => {
      (db as any).exec(`
        INSERT INTO ax_commit_gates (id, biz_item_id, org_id, final_decision, decided_by, decided_at, created_at)
        VALUES ('cg1', 'item1', 'org1', 'drop', 'user1', datetime('now'), datetime('now'))
      `);

      const tl = await service.getTrafficLight("item1");
      expect(tl.overallSignal).toBe("red");
    });

    it("returns yellow when commit gate is explore_alternatives", async () => {
      (db as any).exec(`
        INSERT INTO ax_commit_gates (id, biz_item_id, org_id, final_decision, decided_by, decided_at, created_at)
        VALUES ('cg1', 'item1', 'org1', 'explore_alternatives', 'user1', datetime('now'), datetime('now'))
      `);

      const tl = await service.getTrafficLight("item1");
      expect(tl.overallSignal).toBe("yellow");
    });

    it("returns empty traffic light for item without data", async () => {
      const tl = await service.getTrafficLight("item1");
      expect(tl.summary.go).toBe(0);
      expect(tl.summary.pending).toBe(7);
      expect(tl.overallSignal).toBe("green");
      expect(tl.commitGate).toBeNull();
    });
  });
});
