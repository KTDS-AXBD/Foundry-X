import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { AgentMarketplace } from "../services/agent-marketplace.js";

const CUSTOM_ROLES_DDL = `
  CREATE TABLE IF NOT EXISTS custom_agent_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL DEFAULT '',
    allowed_tools TEXT NOT NULL DEFAULT '[]',
    preferred_model TEXT,
    preferred_runner_type TEXT DEFAULT 'openrouter',
    task_type TEXT NOT NULL DEFAULT 'code-review',
    org_id TEXT NOT NULL DEFAULT '',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    persona TEXT NOT NULL DEFAULT '',
    dependencies TEXT NOT NULL DEFAULT '[]',
    customization_schema TEXT NOT NULL DEFAULT '{}',
    menu_config TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const MARKETPLACE_DDL = `
  CREATE TABLE IF NOT EXISTS agent_marketplace_items (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL,
    allowed_tools TEXT NOT NULL DEFAULT '[]',
    preferred_model TEXT,
    preferred_runner_type TEXT DEFAULT 'openrouter',
    task_type TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    publisher_org_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    avg_rating REAL NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    install_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_marketplace_category ON agent_marketplace_items(category);
  CREATE INDEX IF NOT EXISTS idx_marketplace_status ON agent_marketplace_items(status);
  CREATE INDEX IF NOT EXISTS idx_marketplace_publisher ON agent_marketplace_items(publisher_org_id);

  CREATE TABLE IF NOT EXISTS agent_marketplace_ratings (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    org_id TEXT,
    score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
    review_text TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(item_id) REFERENCES agent_marketplace_items(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_rating_user ON agent_marketplace_ratings(item_id, user_id);

  CREATE TABLE IF NOT EXISTS agent_marketplace_installs (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    installed_role_id TEXT,
    installed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(item_id) REFERENCES agent_marketplace_items(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_install_org ON agent_marketplace_installs(item_id, org_id);
`;

async function insertCustomRole(
  db: D1Database,
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
    system_prompt: string;
    allowed_tools: string;
    preferred_model: string | null;
    task_type: string;
    org_id: string;
    is_builtin: number;
  }> = {},
) {
  const id = overrides.id ?? `role-${Math.random().toString(36).slice(2, 8)}`;
  const name = overrides.name ?? `test-role-${id}`;
  await db
    .prepare(
      `INSERT INTO custom_agent_roles (id, name, description, system_prompt, allowed_tools, preferred_model, task_type, org_id, is_builtin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      name,
      overrides.description ?? "Test role desc",
      overrides.system_prompt ?? "You are a test agent.",
      overrides.allowed_tools ?? '["eslint"]',
      overrides.preferred_model ?? null,
      overrides.task_type ?? "code-review",
      overrides.org_id ?? "org_pub",
      overrides.is_builtin ?? 0,
    )
    .run();
  return id;
}

describe("AgentMarketplace", () => {
  let db: D1Database;
  let mkt: AgentMarketplace;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(CUSTOM_ROLES_DDL);
    await mockDb.exec(MARKETPLACE_DDL);
    db = mockDb as unknown as D1Database;
    mkt = new AgentMarketplace(db);
  });

  // 1. publishItem — 정상 게시
  it("publishItem publishes a custom role", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    expect(item.id).toMatch(/^mkt-/);
    expect(item.roleId).toBe(roleId);
    expect(item.status).toBe("published");
    expect(item.publisherOrgId).toBe("org_pub");
    expect(item.installCount).toBe(0);
    expect(item.avgRating).toBe(0);
  });

  // 2. publishItem — 빌트인 역할 게시 에러
  it("publishItem rejects builtin role", async () => {
    const roleId = await insertCustomRole(db, { is_builtin: 1 });
    await expect(mkt.publishItem({ roleId }, "org_pub")).rejects.toThrow("Cannot publish builtin role");
  });

  // 3. publishItem — 존재하지 않는 roleId 에러
  it("publishItem throws for unknown roleId", async () => {
    await expect(mkt.publishItem({ roleId: "nonexistent" }, "org_pub")).rejects.toThrow("Role not found");
  });

  // 4. publishItem — 중복 게시 409
  it("publishItem rejects duplicate publication", async () => {
    const roleId = await insertCustomRole(db);
    await mkt.publishItem({ roleId }, "org_pub");
    await expect(mkt.publishItem({ roleId }, "org_pub")).rejects.toThrow("CONFLICT");
  });

  // 5. publishItem — tags + category 설정
  it("publishItem with tags and category", async () => {
    const roleId = await insertCustomRole(db, { task_type: "spec-analysis" });
    const item = await mkt.publishItem({ roleId, tags: ["security", "devops"], category: "infra" }, "org_pub");

    expect(item.tags).toEqual(["security", "devops"]);
    expect(item.category).toBe("infra");
  });

  // 6. searchItems — 빈 마켓
  it("searchItems returns empty for empty marketplace", async () => {
    const result = await mkt.searchItems({});
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // 7. searchItems — 이름 검색
  it("searchItems filters by query", async () => {
    const r1 = await insertCustomRole(db, { name: "security-scanner" });
    const r2 = await insertCustomRole(db, { name: "code-helper" });
    await mkt.publishItem({ roleId: r1 }, "org_pub");
    await mkt.publishItem({ roleId: r2 }, "org_pub");

    const result = await mkt.searchItems({ query: "security" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe("security-scanner");
    expect(result.total).toBe(1);
  });

  // 8. searchItems — 카테고리 필터
  it("searchItems filters by category", async () => {
    const r1 = await insertCustomRole(db, { name: "r1" });
    const r2 = await insertCustomRole(db, { name: "r2" });
    await mkt.publishItem({ roleId: r1, category: "security" }, "org_pub");
    await mkt.publishItem({ roleId: r2, category: "devops" }, "org_pub");

    const result = await mkt.searchItems({ category: "security" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.category).toBe("security");
  });

  // 9. searchItems — 정렬 (rating/installs/recent)
  it("searchItems sorts by installs", async () => {
    const r1 = await insertCustomRole(db, { name: "popular" });
    const r2 = await insertCustomRole(db, { name: "niche" });
    const item1 = await mkt.publishItem({ roleId: r1 }, "org_pub");
    await mkt.publishItem({ roleId: r2 }, "org_pub");

    // Install item1 to boost count
    await mkt.installItem(item1.id, "org_a");
    await mkt.installItem(item1.id, "org_b");

    const result = await mkt.searchItems({ sortBy: "installs" });
    expect(result.items[0]!.name).toBe("popular");
    expect(result.items[0]!.installCount).toBe(2);
  });

  // 10. searchItems — 페이지네이션
  it("searchItems paginates correctly", async () => {
    for (let i = 0; i < 5; i++) {
      const roleId = await insertCustomRole(db, { name: `role-${i}` });
      await mkt.publishItem({ roleId }, "org_pub");
    }

    const page1 = await mkt.searchItems({ limit: 2, offset: 0 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page2 = await mkt.searchItems({ limit: 2, offset: 2 });
    expect(page2.items).toHaveLength(2);
    expect(page2.offset).toBe(2);
  });

  // 11. searchItems — archived 제외
  it("searchItems excludes archived items", async () => {
    const roleId = await insertCustomRole(db, { name: "archived-role" });
    const item = await mkt.publishItem({ roleId }, "org_pub");
    await mkt.deleteItem(item.id, "org_pub");

    const result = await mkt.searchItems({});
    expect(result.items).toHaveLength(0);
  });

  // 12. installItem — 정상 설치
  it("installItem creates a role copy and increments count", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    const install = await mkt.installItem(item.id, "org_consumer");

    expect(install.id).toMatch(/^inst-/);
    expect(install.orgId).toBe("org_consumer");
    expect(install.installedRoleId).toMatch(/^role-/);

    // Verify copied role exists in custom_agent_roles
    const copiedRole = await db
      .prepare("SELECT * FROM custom_agent_roles WHERE id = ?")
      .bind(install.installedRoleId)
      .first<Record<string, unknown>>();
    expect(copiedRole).toBeTruthy();
    expect(copiedRole!.org_id).toBe("org_consumer");
    expect((copiedRole!.name as string)).toContain("(marketplace-");

    // Verify install count incremented
    const updatedItem = await mkt.getItem(item.id);
    expect(updatedItem!.installCount).toBe(1);
  });

  // 13. installItem — 중복 설치 409
  it("installItem rejects duplicate install", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");
    await mkt.installItem(item.id, "org_consumer");

    await expect(mkt.installItem(item.id, "org_consumer")).rejects.toThrow("CONFLICT");
  });

  // 14. installItem — archived 항목 에러
  it("installItem rejects archived item", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");
    await mkt.deleteItem(item.id, "org_pub");

    await expect(mkt.installItem(item.id, "org_consumer")).rejects.toThrow("Cannot install archived item");
  });

  // 15. installItem — 존재하지 않는 itemId 404
  it("installItem throws for unknown itemId", async () => {
    await expect(mkt.installItem("nonexistent", "org_consumer")).rejects.toThrow("NOT_FOUND");
  });

  // 16. uninstallItem — 정상 제거
  it("uninstallItem removes install and decrements count", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");
    await mkt.installItem(item.id, "org_consumer");

    const result = await mkt.uninstallItem(item.id, "org_consumer");
    expect(result.uninstalled).toBe(true);

    const updatedItem = await mkt.getItem(item.id);
    expect(updatedItem!.installCount).toBe(0);
  });

  // 17. rateItem — 정상 평점
  it("rateItem creates a rating", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    const rating = await mkt.rateItem(item.id, "user-1", "org_pub", 4, "Great agent!");
    expect(rating.score).toBe(4);
    expect(rating.reviewText).toBe("Great agent!");
    expect(rating.userId).toBe("user-1");
  });

  // 18. rateItem — 동일 사용자 재평가 (UPSERT)
  it("rateItem upserts for same user", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    await mkt.rateItem(item.id, "user-1", "org_pub", 3);
    const updated = await mkt.rateItem(item.id, "user-1", "org_pub", 5, "Updated!");

    expect(updated.score).toBe(5);
    expect(updated.reviewText).toBe("Updated!");

    // Only 1 rating should exist
    const stats = await mkt.getItemStats(item.id);
    expect(stats.ratingCount).toBe(1);
  });

  // 19. rateItem — avg_rating 재계산 정확도
  it("rateItem recalculates avg_rating correctly", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    await mkt.rateItem(item.id, "user-1", null, 5);
    await mkt.rateItem(item.id, "user-2", null, 3);
    await mkt.rateItem(item.id, "user-3", null, 4);

    const updatedItem = await mkt.getItem(item.id);
    expect(updatedItem!.avgRating).toBe(4); // (5+3+4)/3 = 4
    expect(updatedItem!.ratingCount).toBe(3);
  });

  // 20. rateItem — score 범위 확인 (DB CHECK constraint)
  it("rateItem rejects score out of range via DB constraint", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    await expect(mkt.rateItem(item.id, "user-1", null, 0)).rejects.toThrow();
    await expect(mkt.rateItem(item.id, "user-2", null, 6)).rejects.toThrow();
  });

  // 21. deleteItem — 게시자 삭제 → archived
  it("deleteItem soft-deletes by publisher", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    const result = await mkt.deleteItem(item.id, "org_pub");
    expect(result.deleted).toBe(true);

    const deleted = await mkt.getItem(item.id);
    expect(deleted!.status).toBe("archived");
  });

  // 22. deleteItem — 다른 org → 403
  it("deleteItem rejects non-publisher", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    await expect(mkt.deleteItem(item.id, "org_other")).rejects.toThrow("FORBIDDEN");
  });

  // 23. getItemStats — 통계 조회
  it("getItemStats returns correct stats", async () => {
    const roleId = await insertCustomRole(db);
    const item = await mkt.publishItem({ roleId }, "org_pub");

    await mkt.installItem(item.id, "org_a");
    await mkt.rateItem(item.id, "u1", null, 5, "Excellent");
    await mkt.rateItem(item.id, "u2", null, 3);

    const stats = await mkt.getItemStats(item.id);
    expect(stats.itemId).toBe(item.id);
    expect(stats.installCount).toBe(1);
    expect(stats.avgRating).toBe(4);
    expect(stats.ratingCount).toBe(2);
    expect(stats.recentRatings).toHaveLength(2);
  });

  // 24. getItem — 단일 조회
  it("getItem returns null for unknown id", async () => {
    const result = await mkt.getItem("nonexistent");
    expect(result).toBeNull();
  });
});
