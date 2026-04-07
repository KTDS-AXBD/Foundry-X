import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { CommitGateService } from "../core/shaping/services/commit-gate-service.js";

describe("CommitGateService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: CommitGateService;

  beforeEach(() => {
    db = createMockD1();

    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS biz_items (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    `);

    service = new CommitGateService(db as unknown as D1Database);
  });

  describe("create", () => {
    it("creates a commit gate with all answers", async () => {
      const gate = await service.create("org1", "user1", {
        bizItemId: "item1",
        question1Answer: "4주 투자할 가치 있음",
        question2Answer: "AI 전환 미션에 부합",
        question3Answer: "Pivot 없었음",
        question4Answer: "기술 축적이 남음",
        finalDecision: "commit",
        reason: "전략적 적합성 높음",
      });

      expect(gate.bizItemId).toBe("item1");
      expect(gate.finalDecision).toBe("commit");
      expect(gate.question1Answer).toBe("4주 투자할 가치 있음");
      expect(gate.reason).toBe("전략적 적합성 높음");
      expect(gate.decidedBy).toBe("user1");
    });

    it("creates a commit gate with minimal fields", async () => {
      const gate = await service.create("org1", "user1", {
        bizItemId: "item1",
        finalDecision: "drop",
      });

      expect(gate.finalDecision).toBe("drop");
      expect(gate.question1Answer).toBeNull();
      expect(gate.reason).toBeNull();
    });

    it("upserts on same biz_item_id", async () => {
      await service.create("org1", "user1", {
        bizItemId: "item1",
        finalDecision: "commit",
      });

      const gate2 = await service.create("org1", "user1", {
        bizItemId: "item1",
        finalDecision: "explore_alternatives",
        reason: "Need more data",
      });

      expect(gate2.finalDecision).toBe("explore_alternatives");
      expect(gate2.reason).toBe("Need more data");
    });
  });

  describe("getByItem", () => {
    it("returns null when no gate exists", async () => {
      const gate = await service.getByItem("item1");
      expect(gate).toBeNull();
    });

    it("returns existing gate", async () => {
      await service.create("org1", "user1", {
        bizItemId: "item1",
        finalDecision: "commit",
        question1Answer: "Yes",
      });

      const gate = await service.getByItem("item1");
      expect(gate).not.toBeNull();
      expect(gate!.finalDecision).toBe("commit");
      expect(gate!.question1Answer).toBe("Yes");
    });

    it("returns null for non-existent item", async () => {
      const gate = await service.getByItem("nonexistent");
      expect(gate).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("preserves all 4 question answers", async () => {
      const gate = await service.create("org1", "user1", {
        bizItemId: "item1",
        question1Answer: "Answer 1",
        question2Answer: "Answer 2",
        question3Answer: "Answer 3",
        question4Answer: "Answer 4",
        finalDecision: "commit",
      });

      expect(gate.question1Answer).toBe("Answer 1");
      expect(gate.question2Answer).toBe("Answer 2");
      expect(gate.question3Answer).toBe("Answer 3");
      expect(gate.question4Answer).toBe("Answer 4");
    });

    it("explore_alternatives is a valid decision", async () => {
      const gate = await service.create("org1", "user1", {
        bizItemId: "item1",
        finalDecision: "explore_alternatives",
        reason: "Need parallel item exploration",
      });

      expect(gate.finalDecision).toBe("explore_alternatives");
      expect(gate.reason).toBe("Need parallel item exploration");
    });

    it("sets orgId correctly", async () => {
      const gate = await service.create("org-custom", "user1", {
        bizItemId: "item1",
        finalDecision: "commit",
      });

      expect(gate.orgId).toBe("org-custom");
    });
  });
});
