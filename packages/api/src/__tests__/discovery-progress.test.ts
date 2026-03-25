import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DiscoveryProgressService } from "../services/discovery-progress.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'field',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
    status TEXT NOT NULL DEFAULT 'pending',
    evidence TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, criterion_id)
  );
`;

let db: ReturnType<typeof createMockD1>;
let service: DiscoveryProgressService;

beforeEach(async () => {
  db = createMockD1();
  await db.exec(TABLES_SQL);
  service = new DiscoveryProgressService(db as unknown as D1Database);
});

describe("DiscoveryProgressService", () => {
  describe("getProgress", () => {
    it("빈 데이터 시 totalItems=0", async () => {
      const result = await service.getProgress("org_test");
      expect(result.totalItems).toBe(0);
      expect(result.items).toEqual([]);
      expect(result.byGateStatus).toEqual({ blocked: 0, warning: 0, ready: 0 });
      expect(result.bottleneck).toBeNull();
    });

    it("BizItem 2개 + 기준 일부 completed → 올바른 집계", async () => {
      // Item A: 3개 completed
      await db.exec(`
        INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item-a', 'org_test', 'Item A', 'u1');
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('c1', 'item-a', 1, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('c2', 'item-a', 2, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('c3', 'item-a', 3, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('c4', 'item-a', 4, 'in_progress', datetime('now'));
      `);

      // Item B: 8개 completed
      await db.exec(`
        INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item-b', 'org_test', 'Item B', 'u1');
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('d1', 'item-b', 1, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('d2', 'item-b', 2, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('d3', 'item-b', 3, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('d4', 'item-b', 4, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('d5', 'item-b', 5, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('d6', 'item-b', 6, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('d7', 'item-b', 7, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('d8', 'item-b', 8, 'completed', datetime('now'));
      `);

      const result = await service.getProgress("org_test");
      expect(result.totalItems).toBe(2);

      const itemA = result.items.find((i) => i.bizItemId === "item-a");
      expect(itemA?.completedCount).toBe(3);

      const itemB = result.items.find((i) => i.bizItemId === "item-b");
      expect(itemB?.completedCount).toBe(8);
    });

    it("gateStatus 분류: 9개=ready, 7~8개=warning, 6이하=blocked", async () => {
      // Item ready: 9개 completed
      await db.exec(`INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('r', 'org_test', 'Ready', 'u1')`);
      for (let i = 1; i <= 9; i++) {
        await db.exec(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('r${i}', 'r', ${i}, 'completed', datetime('now'))`);
      }

      // Item warning: 7개 completed
      await db.exec(`INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('w', 'org_test', 'Warning', 'u1')`);
      for (let i = 1; i <= 7; i++) {
        await db.exec(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('w${i}', 'w', ${i}, 'completed', datetime('now'))`);
      }

      // Item blocked: 5개 completed
      await db.exec(`INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('b', 'org_test', 'Blocked', 'u1')`);
      for (let i = 1; i <= 5; i++) {
        await db.exec(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('b${i}', 'b', ${i}, 'completed', datetime('now'))`);
      }

      const result = await service.getProgress("org_test");
      expect(result.byGateStatus).toEqual({ blocked: 1, warning: 1, ready: 1 });

      const ready = result.items.find((i) => i.bizItemId === "r");
      expect(ready?.gateStatus).toBe("ready");

      const warning = result.items.find((i) => i.bizItemId === "w");
      expect(warning?.gateStatus).toBe("warning");

      const blocked = result.items.find((i) => i.bizItemId === "b");
      expect(blocked?.gateStatus).toBe("blocked");
    });

    it("byCriterion 집계 정확성", async () => {
      // 2 items: criterion 1 both completed, criterion 2 one completed one pending
      await db.exec(`
        INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('a', 'org_test', 'A', 'u1');
        INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('b', 'org_test', 'B', 'u1');
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('a1', 'a', 1, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('b1', 'b', 1, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('a2', 'a', 2, 'completed', datetime('now'));
      `);

      const result = await service.getProgress("org_test");
      const c1 = result.byCriterion.find((c) => c.criterionId === 1);
      expect(c1?.completed).toBe(2);
      expect(c1?.completionRate).toBe(100);

      const c2 = result.byCriterion.find((c) => c.criterionId === 2);
      expect(c2?.completed).toBe(1);
      expect(c2?.pending).toBe(1);
      expect(c2?.completionRate).toBe(50);
    });

    it("bottleneck 감지: 가장 낮은 completionRate 기준", async () => {
      // 1 item: criterion 1 completed, rest pending
      await db.exec(`
        INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('x', 'org_test', 'X', 'u1');
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('x1', 'x', 1, 'completed', datetime('now'));
      `);

      const result = await service.getProgress("org_test");
      expect(result.bottleneck).not.toBeNull();
      expect(result.bottleneck!.completionRate).toBe(0);
      // Criterion 1 is 100%, all others 0% → bottleneck is one of criteria 2~9
      expect(result.bottleneck!.criterionId).toBeGreaterThanOrEqual(2);
    });

    it("다른 org 데이터는 안 보임", async () => {
      await db.exec(`
        INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('other', 'org_other', 'Other', 'u2');
      `);

      const result = await service.getProgress("org_test");
      expect(result.totalItems).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("overallCompletionRate 계산", async () => {
      // 1 item, 3 of 9 completed → 33%
      await db.exec(`
        INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('s', 'org_test', 'S', 'u1');
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('s1', 's', 1, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('s2', 's', 2, 'completed', datetime('now'));
        INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
          VALUES ('s3', 's', 3, 'completed', datetime('now'));
      `);

      const summary = await service.getSummary("org_test");
      expect(summary.totalItems).toBe(1);
      expect(summary.overallCompletionRate).toBe(33); // 3/9 * 100 rounded
      expect(summary.blockedCount).toBe(1);
      expect(summary.bottleneckCriterion).toBeTruthy();
    });

    it("빈 데이터 시 overallCompletionRate=0", async () => {
      const summary = await service.getSummary("org_test");
      expect(summary.totalItems).toBe(0);
      expect(summary.overallCompletionRate).toBe(0);
      expect(summary.bottleneckCriterion).toBeNull();
    });
  });
});
