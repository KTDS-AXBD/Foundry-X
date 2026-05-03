/**
 * Sprint 224: F459+F460 Gap 보강 테스트
 *
 * 보강 항목:
 * 1. Portfolio List API — GET /biz-items/portfolio-list
 * 2. Reverse Lookup API — GET /biz-items/by-artifact
 * 3. PortfolioService.listWithCoverage() 단위 테스트
 * 4. PortfolioService.findByArtifact() 단위 테스트
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { PortfolioService } from "../core/discovery/services/portfolio-service.js";

vi.mock("../agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn(),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  }),
  createRoutedRunner: () =>
    Promise.resolve({
      type: "mock",
      execute: vi.fn(),
      isAvailable: () => Promise.resolve(true),
      supportsTaskType: () => true,
    }),
}));

let env: ReturnType<typeof createTestEnv>;

function req(path: string, headers?: Record<string, string>) {
  return app.request(
    `http://localhost/api${path}`,
    { method: "GET", headers: { "Content-Type": "application/json", ...headers } },
    env,
  );
}

function seed(sql: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (env.DB as any).prepare(sql).run();
}

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
    source TEXT NOT NULL DEFAULT 'field', status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluations (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, verdict TEXT NOT NULL,
    avg_score REAL NOT NULL DEFAULT 0.0, total_concerns INTEGER NOT NULL DEFAULT 0,
    evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS business_plan_drafts (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL, sections_snapshot TEXT, model_used TEXT,
    tokens_used INTEGER DEFAULT 0, generated_at TEXT NOT NULL,
    UNIQUE(biz_item_id, version)
  );
  CREATE TABLE IF NOT EXISTS offerings (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    title TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('report','proposal','review')),
    format TEXT NOT NULL CHECK(format IN ('html','pptx')),
    status TEXT NOT NULL DEFAULT 'draft',
    current_version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS offering_sections (
    id TEXT PRIMARY KEY, offering_id TEXT NOT NULL, section_key TEXT NOT NULL,
    title TEXT NOT NULL, content TEXT, sort_order INTEGER NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 1, is_included INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(offering_id, section_key)
  );
  CREATE TABLE IF NOT EXISTS offering_versions (
    id TEXT PRIMARY KEY, offering_id TEXT NOT NULL, version INTEGER NOT NULL,
    snapshot TEXT, change_summary TEXT, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(offering_id, version)
  );
  CREATE TABLE IF NOT EXISTS offering_prototypes (
    id TEXT PRIMARY KEY, offering_id TEXT NOT NULL, prototype_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(offering_id, prototype_id)
  );
  CREATE TABLE IF NOT EXISTS prototypes (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    format TEXT NOT NULL DEFAULT 'html', content TEXT NOT NULL,
    template_used TEXT, model_used TEXT, tokens_used INTEGER DEFAULT 0,
    generated_at TEXT NOT NULL, UNIQUE(biz_item_id, version)
  );
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'REGISTERED',
    entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT, entered_by TEXT NOT NULL, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','needs_revision')),
    evidence TEXT, completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, criterion_id)
  );
  CREATE TABLE IF NOT EXISTS org_members (
    org_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY (org_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function seedBase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (env.DB as any).exec(TABLES_SQL);
  seed(`INSERT OR IGNORE INTO users (id, email, name, role) VALUES ('test-user', 'test@example.com', 'Test', 'admin')`);
  seed(`INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org-1', 'TestOrg', 'testorg')`);
  seed(`INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org-1', 'test-user', 'admin')`);
}

function seedItem(id: string, title = "테스트 아이템") {
  seed(`INSERT INTO biz_items (id, org_id, title, source, status, created_by) VALUES ('${id}', 'org-1', '${title}', 'field', 'draft', 'test-user')`);
}

// ─── Portfolio List API 테스트 ───

describe("GET /biz-items/portfolio-list", () => {
  let auth: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    seedBase();
    auth = await createAuthHeaders({ sub: "test-user", orgId: "org-1", role: "admin" });
  });

  it("빈 목록 반환 — 아이템 없으면 items=[], total=0", async () => {
    const res = await req("/biz-items/portfolio-list", auth);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { items: unknown[]; total: number } };
    expect(body.data.items).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it("아이템 2건 목록 + coverage 요약 반환", async () => {
    seedItem("item-a", "아이템 A");
    seedItem("item-b", "아이템 B");
    seed(`INSERT INTO business_plan_drafts (id, biz_item_id, version, content, generated_at) VALUES ('prd-1', 'item-a', 1, 'content', datetime('now'))`);
    seed(`INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, created_by) VALUES ('off-1', 'org-1', 'item-a', 'Offering', 'proposal', 'html', 'test-user')`);
    seed(`INSERT INTO biz_evaluations (id, biz_item_id, verdict, avg_score) VALUES ('eval-1', 'item-a', 'PASS', 4.2)`);
    seed(`INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by) VALUES ('ps-1', 'item-a', 'org-1', 'DISCOVERY', 'test-user')`);

    const res = await req("/biz-items/portfolio-list", auth);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        items: Array<{
          id: string;
          hasEvaluation: boolean;
          prdCount: number;
          offeringCount: number;
          currentStage: string;
          overallPercent: number;
        }>;
        total: number;
      };
    };
    expect(body.data.total).toBe(2);

    const itemA = body.data.items.find((i) => i.id === "item-a")!;
    expect(itemA.hasEvaluation).toBe(true);
    expect(itemA.prdCount).toBe(1);
    expect(itemA.offeringCount).toBe(1);
    expect(itemA.currentStage).toBe("DISCOVERY");
    expect(itemA.overallPercent).toBeGreaterThan(0);

    const itemB = body.data.items.find((i) => i.id === "item-b")!;
    expect(itemB.hasEvaluation).toBe(false);
    expect(itemB.prdCount).toBe(0);
    expect(itemB.offeringCount).toBe(0);
  });

  it("다른 org의 아이템은 조회 안 됨", async () => {
    seed(`INSERT INTO biz_items (id, org_id, title, source, status, created_by) VALUES ('other-item', 'other-org', '남의 아이템', 'field', 'draft', 'test-user')`);

    const res = await req("/biz-items/portfolio-list", auth);
    const body = (await res.json()) as { data: { items: Array<{ id: string }>; total: number } };
    expect(body.data.items.every((i) => i.id !== "other-item")).toBe(true);
  });

  it("인증 없으면 401", async () => {
    const res = await req("/biz-items/portfolio-list");
    expect(res.status).toBe(401);
  });
});

// ─── Reverse Lookup API 테스트 ───

describe("GET /biz-items/by-artifact", () => {
  let auth: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    seedBase();
    seedItem("item-1", "아이템 1");
    auth = await createAuthHeaders({ sub: "test-user", orgId: "org-1", role: "admin" });
  });

  it("prd type — PRD ID로 연결된 아이템 조회", async () => {
    seed(`INSERT INTO business_plan_drafts (id, biz_item_id, version, content, generated_at) VALUES ('prd-x', 'item-1', 1, 'content', datetime('now'))`);

    const res = await req("/biz-items/by-artifact?type=prd&id=prd-x", auth);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { artifactType: string; artifactId: string; bizItems: Array<{ id: string }> };
    };
    expect(body.data.artifactType).toBe("prd");
    expect(body.data.artifactId).toBe("prd-x");
    expect(body.data.bizItems).toHaveLength(1);
    expect(body.data.bizItems[0]!.id).toBe("item-1");
  });

  it("offering type — Offering ID로 연결된 아이템 조회", async () => {
    seed(`INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, created_by) VALUES ('off-y', 'org-1', 'item-1', 'Test Off', 'proposal', 'html', 'test-user')`);

    const res = await req("/biz-items/by-artifact?type=offering&id=off-y", auth);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { bizItems: Array<{ id: string }> } };
    expect(body.data.bizItems[0]!.id).toBe("item-1");
  });

  it("prototype type — Prototype ID로 연결된 아이템 조회", async () => {
    seed(`INSERT INTO prototypes (id, biz_item_id, version, content, generated_at) VALUES ('proto-z', 'item-1', 1, 'content', datetime('now'))`);

    const res = await req("/biz-items/by-artifact?type=prototype&id=proto-z", auth);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { bizItems: Array<{ id: string }> } };
    expect(body.data.bizItems[0]!.id).toBe("item-1");
  });

  it("존재하지 않는 artifact ID — bizItems 빈 배열 반환", async () => {
    const res = await req("/biz-items/by-artifact?type=prd&id=nonexistent", auth);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { bizItems: unknown[] } };
    expect(body.data.bizItems).toHaveLength(0);
  });

  it("잘못된 type 파라미터 — 400 반환", async () => {
    const res = await req("/biz-items/by-artifact?type=invalid&id=some-id", auth);
    expect(res.status).toBe(400);
  });

  it("id 파라미터 누락 — 400 반환", async () => {
    const res = await req("/biz-items/by-artifact?type=prd", auth);
    expect(res.status).toBe(400);
  });

  it("다른 org의 artifact — bizItems 빈 배열 반환 (권한 차단)", async () => {
    seed(`INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('other-org', 'Other', 'other')`);
    seed(`INSERT INTO biz_items (id, org_id, title, source, status, created_by) VALUES ('other-item', 'other-org', '남의 아이템', 'field', 'draft', 'test-user')`);
    seed(`INSERT INTO business_plan_drafts (id, biz_item_id, version, content, generated_at) VALUES ('other-prd', 'other-item', 1, 'x', datetime('now'))`);

    const res = await req("/biz-items/by-artifact?type=prd&id=other-prd", auth);
    const body = (await res.json()) as { data: { bizItems: unknown[] } };
    expect(body.data.bizItems).toHaveLength(0);
  });
});

// ─── PortfolioService 단위 테스트 ───

describe("PortfolioService.listWithCoverage()", () => {
  beforeEach(() => {
    env = createTestEnv();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (env.DB as any).exec(TABLES_SQL);
  });

  it("prototypeCount, overallPercent 계산이 올바름", async () => {
    seed(`INSERT INTO biz_items (id, org_id, title, source, status, created_by) VALUES ('i1', 'org-1', 'Test', 'field', 'draft', 'u1')`);
    seed(`INSERT INTO prototypes (id, biz_item_id, version, content, generated_at) VALUES ('p1', 'i1', 1, 'x', datetime('now'))`);
    seed(`INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by) VALUES ('ps1', 'i1', 'org-1', 'FORMALIZATION', 'u1')`);

    const svc = new PortfolioService(env.DB as D1Database);
    const { items } = await svc.listWithCoverage("org-1");

    expect(items).toHaveLength(1);
    expect(items[0]!.prototypeCount).toBe(1);
    expect(items[0]!.currentStage).toBe("FORMALIZATION");
    // FORMALIZATION(idx=2) → 3/6 * 30 = 15 + prototype 15 = 30%
    expect(items[0]!.overallPercent).toBe(30);
  });

  it("다른 org 아이템 미포함", async () => {
    seed(`INSERT INTO biz_items (id, org_id, title, source, status, created_by) VALUES ('i2', 'other-org', 'Other', 'field', 'draft', 'u1')`);

    const svc = new PortfolioService(env.DB as D1Database);
    const { items } = await svc.listWithCoverage("org-1");
    expect(items).toHaveLength(0);
  });
});

describe("PortfolioService.findByArtifact()", () => {
  beforeEach(() => {
    env = createTestEnv();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (env.DB as any).exec(TABLES_SQL);
    seed(`INSERT INTO biz_items (id, org_id, title, source, status, created_by) VALUES ('bi1', 'org-1', 'Item', 'field', 'draft', 'u1')`);
  });

  it("prd — 올바른 bizItem 반환", async () => {
    seed(`INSERT INTO business_plan_drafts (id, biz_item_id, version, content, generated_at) VALUES ('prd1', 'bi1', 1, 'x', datetime('now'))`);

    const svc = new PortfolioService(env.DB as D1Database);
    const result = await svc.findByArtifact("prd", "prd1", "org-1");

    expect(result.artifactType).toBe("prd");
    expect(result.artifactId).toBe("prd1");
    expect(result.bizItems).toHaveLength(1);
    expect(result.bizItems[0]!.id).toBe("bi1");
  });

  it("존재하지 않는 ID — bizItems 빈 배열", async () => {
    const svc = new PortfolioService(env.DB as D1Database);
    const result = await svc.findByArtifact("offering", "no-exist", "org-1");
    expect(result.bizItems).toHaveLength(0);
  });

  it("다른 org — bizItems 빈 배열 (org_id 필터)", async () => {
    seed(`INSERT INTO business_plan_drafts (id, biz_item_id, version, content, generated_at) VALUES ('prd2', 'bi1', 2, 'x', datetime('now'))`);

    const svc = new PortfolioService(env.DB as D1Database);
    const result = await svc.findByArtifact("prd", "prd2", "org-2");
    expect(result.bizItems).toHaveLength(0);
  });
});
