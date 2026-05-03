/**
 * Sprint 223: F459 Portfolio Route 통합 테스트
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

vi.mock("../core/agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({ type: "mock", execute: vi.fn(), isAvailable: () => Promise.resolve(true), supportsTaskType: () => true }),
  createRoutedRunner: () => Promise.resolve({ type: "mock", execute: vi.fn(), isAvailable: () => Promise.resolve(true), supportsTaskType: () => true }),
}));

let env: ReturnType<typeof createTestEnv>;

function req(path: string, headers?: Record<string, string>) {
  return app.request(`http://localhost/api${path}`, { method: "GET", headers: { "Content-Type": "application/json", ...headers } }, env);
}

function seed(sql: string) {
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
  CREATE TABLE IF NOT EXISTS biz_item_classifications (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL UNIQUE, item_type TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0, turn_1_answer TEXT, turn_2_answer TEXT,
    turn_3_answer TEXT, analysis_weights TEXT NOT NULL DEFAULT '{}',
    classified_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluations (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, verdict TEXT NOT NULL,
    avg_score REAL NOT NULL DEFAULT 0.0, total_concerns INTEGER NOT NULL DEFAULT 0,
    evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_evaluation_scores (
    id TEXT PRIMARY KEY, evaluation_id TEXT NOT NULL, persona_id TEXT NOT NULL,
    business_viability REAL NOT NULL DEFAULT 0, strategic_fit REAL NOT NULL DEFAULT 0,
    customer_value REAL NOT NULL DEFAULT 0, tech_market REAL NOT NULL DEFAULT 0,
    execution REAL NOT NULL DEFAULT 0, financial_feasibility REAL NOT NULL DEFAULT 0,
    competitive_diff REAL NOT NULL DEFAULT 0, scalability REAL NOT NULL DEFAULT 0,
    summary TEXT, concerns TEXT
  );
  CREATE TABLE IF NOT EXISTS biz_item_starting_points (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL UNIQUE,
    starting_point TEXT NOT NULL CHECK (starting_point IN ('idea','market','problem','tech','service')),
    confidence REAL NOT NULL DEFAULT 0.0, reasoning TEXT,
    needs_confirmation INTEGER NOT NULL DEFAULT 0,
    confirmed_at TEXT
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

describe("GET /biz-items/:id/portfolio", () => {
  beforeEach(() => {
    env = createTestEnv();
    (env.DB as any).exec(TABLES_SQL);
    (env.DB as any).exec(`INSERT OR IGNORE INTO users (id, email, name, role) VALUES ('test-user', 'test@example.com', 'Test', 'admin')`);
    (env.DB as any).exec(`INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('org_test', 'Test Org', 'test-org')`);
    (env.DB as any).exec(`INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES ('org_test', 'test-user', 'owner')`);
    seed(`INSERT INTO biz_items (id, org_id, title, source, status, created_by)
          VALUES ('item-1', 'org_test', 'AI 품질예측', 'field', 'draft', 'test-user')`);
  });

  it("인증 없이 접근 — 401", async () => {
    const res = await req("/biz-items/item-1/portfolio");
    expect(res.status).toBe(401);
  });

  it("존재하지 않는 아이템 — 404", async () => {
    const headers = await createAuthHeaders();
    const res = await req("/biz-items/no-item/portfolio", headers);
    expect(res.status).toBe(404);
  });

  it("하위 데이터 없는 아이템 — 빈 배열 + 200", async () => {
    const headers = await createAuthHeaders();
    const res = await req("/biz-items/item-1/portfolio", headers);
    expect(res.status).toBe(200);

    const body = await res.json() as { data: Record<string, unknown> };
    const data = body.data;
    expect(data.item).toBeDefined();
    expect(data.classification).toBeNull();
    expect(Array.isArray(data.evaluations)).toBe(true);
    expect((data.evaluations as unknown[]).length).toBe(0);
    expect(Array.isArray(data.criteria)).toBe(true);
    expect(Array.isArray(data.businessPlans)).toBe(true);
    expect(Array.isArray(data.offerings)).toBe(true);
    expect(Array.isArray(data.prototypes)).toBe(true);
    expect(data.progress).toBeDefined();
  });

  it("전체 연결 데이터 — 10개 필드 모두 반환", async () => {
    seed(`INSERT INTO biz_item_classifications (id, biz_item_id, item_type, confidence)
          VALUES ('cls-1', 'item-1', '기술형', 0.92)`);
    seed(`INSERT INTO biz_evaluations (id, biz_item_id, verdict, avg_score, total_concerns)
          VALUES ('eval-1', 'item-1', 'APPROVED', 4.2, 1)`);
    seed(`INSERT INTO biz_evaluation_scores (id, evaluation_id, persona_id, business_viability, strategic_fit, customer_value)
          VALUES ('score-1', 'eval-1', 'pm', 4.5, 4.0, 4.1)`);
    seed(`INSERT INTO biz_item_starting_points (id, biz_item_id, starting_point, confidence)
          VALUES ('sp-1', 'item-1', 'tech', 0.85)`);
    seed(`INSERT INTO biz_discovery_criteria (biz_item_id, criterion_id, status)
          VALUES ('item-1', 1, 'completed')`);
    seed(`INSERT INTO business_plan_drafts (id, biz_item_id, version, content, generated_at)
          VALUES ('bp-1', 'item-1', 1, '{}', '2026-01-02')`);
    seed(`INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, created_by)
          VALUES ('off-1', 'org_test', 'item-1', '제안서', 'proposal', 'html', 'user-1')`);
    seed(`INSERT INTO prototypes (id, biz_item_id, version, content, generated_at)
          VALUES ('proto-1', 'item-1', 1, '<html/>', '2026-01-03')`);
    seed(`INSERT INTO offering_prototypes (id, offering_id, prototype_id)
          VALUES ('op-1', 'off-1', 'proto-1')`);
    seed(`INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_by)
          VALUES ('ps-1', 'item-1', 'org_test', 'DISCOVERY', 'user-1')`);

    const headers = await createAuthHeaders();
    const res = await req("/biz-items/item-1/portfolio", headers);
    expect(res.status).toBe(200);

    const body = await res.json() as { data: Record<string, unknown[]> & { classification: Record<string, unknown>; item: Record<string, unknown>; progress: Record<string, unknown> } };
    const data = body.data;

    expect(data.classification).not.toBeNull();
    expect((data.evaluations as unknown[]).length).toBe(1);
    expect((data.criteria as unknown[]).length).toBe(1);
    expect((data.businessPlans as unknown[]).length).toBe(1);
    expect((data.offerings as Array<{ linkedPrototypeIds: string[] }>)[0]!.linkedPrototypeIds).toContain("proto-1");
    expect((data.prototypes as unknown[]).length).toBe(1);
    expect((data.pipelineStages as Array<{ stage: string }>)[0]!.stage).toBe("DISCOVERY");
    expect(typeof data.progress.overallPercent).toBe("number");
  });
});
