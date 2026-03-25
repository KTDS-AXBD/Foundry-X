import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  };
  if (opts?.body) init.body = JSON.stringify(opts.body);
  return app.request(url, init, env);
}

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

const BIZ_TABLES_SQL = `
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

beforeEach(async () => {
  env = createTestEnv();
  (env.DB as any).exec(BIZ_TABLES_SQL);
});

describe("Discovery Route (F189)", () => {
  it("GET /api/discovery/progress → 200 + totalItems", async () => {
    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/discovery/progress", { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalItems", 0);
    expect(body).toHaveProperty("byGateStatus");
    expect(body).toHaveProperty("byCriterion");
    expect(body).toHaveProperty("items");
  });

  it("GET /api/discovery/progress/summary → 200 + overallCompletionRate", async () => {
    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/discovery/progress/summary", { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalItems", 0);
    expect(body).toHaveProperty("overallCompletionRate", 0);
    expect(body).toHaveProperty("bottleneckCriterion", null);
  });

  it("데이터가 있을 때 progress 정상 응답", async () => {
    seedDb(`INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('i1', 'org_test', 'Test Item', 'test-user')`);
    seedDb(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
      VALUES ('dc1', 'i1', 1, 'completed', datetime('now'))`);
    seedDb(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
      VALUES ('dc2', 'i1', 2, 'in_progress', datetime('now'))`);

    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/discovery/progress", { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalItems).toBe(1);
    expect(body.items[0].completedCount).toBe(1);
    expect(body.items[0].gateStatus).toBe("blocked");
  });

  it("orgId 필터링: 다른 org 데이터 안 보임", async () => {
    seedDb(`INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('other-item', 'org_other', 'Other', 'u2')`);

    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/discovery/progress", { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalItems).toBe(0);
  });

  it("summary에서 completion rate 정상 계산", async () => {
    // 1 item with 9 completed → 100%
    seedDb(`INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('full', 'org_test', 'Full', 'test-user')`);
    for (let i = 1; i <= 9; i++) {
      seedDb(`INSERT INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
        VALUES ('fc${i}', 'full', ${i}, 'completed', datetime('now'))`);
    }

    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/discovery/progress/summary", { headers });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalItems).toBe(1);
    expect(body.readyCount).toBe(1);
    expect(body.overallCompletionRate).toBe(100);
    expect(body.bottleneckCriterion).toBeNull();
  });

  it("인증 없이 접근 시 401", async () => {
    const res = await req("GET", "/api/discovery/progress");
    expect(res.status).toBe(401);
  });
});
