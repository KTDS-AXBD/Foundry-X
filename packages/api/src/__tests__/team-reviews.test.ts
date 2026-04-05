/**
 * Sprint 154: F342 TeamReviews Route Tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";

describe("TeamReviews (direct DB)", () => {
  let db: ReturnType<typeof createMockD1>;
  const orgId = "org_test";
  const itemId = "item_004";

  function generateId(): string {
    return Math.random().toString(36).slice(2, 18).padEnd(16, "0");
  }

  beforeEach(() => {
    db = createMockD1();
    (db as any).db.prepare("INSERT OR IGNORE INTO biz_items (id, title, created_by) VALUES (?, ?, ?)").run(itemId, "Test Item", "user1");
  });

  it("투표 제출 — Go", async () => {
    const id = generateId();
    await db
      .prepare(
        `INSERT INTO ax_team_reviews (id, org_id, item_id, reviewer_id, reviewer_name, decision, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, orgId, itemId, "user1", "서민원", "Go", "좋은 아이템")
      .run();

    const result = await db
      .prepare("SELECT * FROM ax_team_reviews WHERE item_id = ?")
      .bind(itemId)
      .all();

    expect(result.results).toHaveLength(1);
    expect((result.results[0] as any).decision).toBe("Go");
    expect((result.results[0] as any).reviewer_name).toBe("서민원");
  });

  it("중복 투표 — upsert로 업데이트", async () => {
    const id1 = generateId();
    await db
      .prepare(
        `INSERT INTO ax_team_reviews (id, org_id, item_id, reviewer_id, reviewer_name, decision, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id1, orgId, itemId, "user1", "서민원", "Go", "1차 투표")
      .run();

    const id2 = generateId();
    await db
      .prepare(
        `INSERT INTO ax_team_reviews (id, org_id, item_id, reviewer_id, reviewer_name, decision, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id, reviewer_id) DO UPDATE SET
           decision = excluded.decision,
           comment = excluded.comment`,
      )
      .bind(id2, orgId, itemId, "user1", "서민원", "Hold", "재고 필요")
      .run();

    const result = await db
      .prepare("SELECT * FROM ax_team_reviews WHERE item_id = ? AND reviewer_id = ?")
      .bind(itemId, "user1")
      .first();

    expect((result as any).decision).toBe("Hold");
    expect((result as any).comment).toBe("재고 필요");
  });

  it("투표 집계 — GROUP BY", async () => {
    const voters = [
      { id: "user1", name: "서민원", decision: "Go" },
      { id: "user2", name: "김기욱", decision: "Go" },
      { id: "user3", name: "김정원", decision: "Hold" },
    ];

    for (const v of voters) {
      const id = generateId();
      await db
        .prepare(
          `INSERT INTO ax_team_reviews (id, org_id, item_id, reviewer_id, reviewer_name, decision)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, orgId, itemId, v.id, v.name, v.decision)
        .run();
    }

    const result = await db
      .prepare("SELECT decision, COUNT(*) as count FROM ax_team_reviews WHERE item_id = ? GROUP BY decision")
      .bind(itemId)
      .all<{ decision: string; count: number }>();

    const summary: Record<string, number> = {};
    for (const row of result.results) {
      summary[row.decision] = row.count;
    }

    expect(summary.Go).toBe(2);
    expect(summary.Hold).toBe(1);
  });
});
