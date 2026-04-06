// ─── F361+F362: 운영 지표 라우트 + Rule 효과 측정 통합 테스트 (Sprint 164) ───

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { app } from "../app.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS execution_events (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    source TEXT NOT NULL,
    severity TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS failure_patterns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    pattern_key TEXT NOT NULL,
    occurrence_count INTEGER NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    sample_event_ids TEXT,
    sample_payloads TEXT,
    status TEXT NOT NULL DEFAULT 'detected',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS guard_rail_proposals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    pattern_id TEXT NOT NULL,
    rule_content TEXT NOT NULL,
    rule_filename TEXT NOT NULL,
    rationale TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TEXT,
    reviewed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    effectiveness_score REAL,
    effectiveness_measured_at TEXT,
    pre_deploy_failures INTEGER,
    post_deploy_failures INTEGER
  );
  CREATE TABLE IF NOT EXISTS skill_executions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    biz_item_id TEXT,
    artifact_id TEXT,
    model TEXT NOT NULL,
    status TEXT CHECK(status IN ('completed','failed','timeout','cancelled')),
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    executed_by TEXT NOT NULL,
    executed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS skill_lineage (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    parent_skill_id TEXT NOT NULL,
    child_skill_id TEXT NOT NULL,
    derivation_type TEXT NOT NULL DEFAULT 'manual',
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Metrics Routes (F362)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    await (env.DB as any).exec(DDL);
    headers = await createAuthHeaders();
    vi.restoreAllMocks();
  });

  async function req(method: string, path: string) {
    return app.request(`http://localhost${path}`, { method, headers }, env);
  }

  // ── seed helpers ──

  async function seedExecutionEvents() {
    const db = env.DB as any;
    await db.exec(`
      INSERT INTO execution_events (id, task_id, tenant_id, source, severity, created_at) VALUES
        ('e1', 't1', 'org_test', 'agent-planner', 'info', '2026-04-01'),
        ('e2', 't2', 'org_test', 'agent-planner', 'error', '2026-04-02'),
        ('e3', 't3', 'org_test', 'agent-reviewer', 'info', '2026-04-03'),
        ('e4', 't4', 'org_test', 'skill-sync', 'info', '2026-04-04'),
        ('e5', 't5', 'org_test', 'skill-sync', 'info', '2026-04-05')
    `);
  }

  async function seedSkillData() {
    const db = env.DB as any;
    await db.exec(`
      INSERT INTO skill_executions (id, tenant_id, skill_id, model, status, executed_by) VALUES
        ('se1', 'org_test', 'skill-a', 'claude-3', 'completed', 'user1'),
        ('se2', 'org_test', 'skill-a', 'claude-3', 'completed', 'user1'),
        ('se3', 'org_test', 'skill-b', 'claude-3', 'completed', 'user2'),
        ('se4', 'org_test', 'skill-c', 'claude-3', 'completed', 'user2')
    `);
    await db.exec(`
      INSERT INTO skill_lineage (id, tenant_id, parent_skill_id, child_skill_id, derivation_type, created_by) VALUES
        ('sl1', 'org_test', 'skill-base', 'skill-a', 'derived', 'user1'),
        ('sl2', 'org_test', 'skill-base', 'skill-b', 'captured', 'user2')
    `);
  }

  // ── /metrics/overview ──

  it("GET /api/metrics/overview — 200 빈 데이터", async () => {
    const res = await req("GET", "/api/metrics/overview");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("ruleEffectiveness");
    expect(data).toHaveProperty("skillReuse");
    expect(data).toHaveProperty("agentUsage");
    expect(data).toHaveProperty("period");
  });

  it("GET /api/metrics/overview — 데이터 있는 경우", async () => {
    await seedExecutionEvents();
    await seedSkillData();
    const res = await req("GET", "/api/metrics/overview");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.agentUsage.totalSources).toBeGreaterThan(0);
  });

  // ── /metrics/skill-reuse ──

  it("GET /api/metrics/skill-reuse — 200", async () => {
    await seedSkillData();
    const res = await req("GET", "/api/metrics/skill-reuse");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items.length).toBeGreaterThan(0);
    expect(data).toHaveProperty("overallReuseRate");
    expect(data.derivedCount).toBe(1);
    expect(data.capturedCount).toBe(1);
  });

  it("GET /api/metrics/skill-reuse — 빈 데이터", async () => {
    const res = await req("GET", "/api/metrics/skill-reuse");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items).toEqual([]);
    expect(data.overallReuseRate).toBe(0);
  });

  // ── /metrics/agent-usage ──

  it("GET /api/metrics/agent-usage — 200", async () => {
    await seedExecutionEvents();
    const res = await req("GET", "/api/metrics/agent-usage?month=2026-04");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.totalSources).toBeGreaterThanOrEqual(3);
    expect(data.activeSources).toBeGreaterThanOrEqual(3);
  });

  it("GET /api/metrics/agent-usage — 미래 월 (빈 결과)", async () => {
    await seedExecutionEvents();
    const res = await req("GET", "/api/metrics/agent-usage?month=2030-01");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    // 활성 source 없지만 전체 source는 존재
    expect(data.activeSources).toBe(0);
    expect(data.unusedSources.length).toBeGreaterThan(0);
  });
});

describe("Guard Rail Effectiveness (F361)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    await (env.DB as any).exec(DDL);
    headers = await createAuthHeaders();
    vi.restoreAllMocks();
  });

  async function req(method: string, path: string) {
    return app.request(`http://localhost${path}`, { method, headers }, env);
  }

  async function seedApprovedProposal() {
    const db = env.DB as any;
    await db.exec(`
      INSERT INTO failure_patterns (id, tenant_id, pattern_key, occurrence_count, first_seen, last_seen, status)
        VALUES ('fp1', 'org_test', 'error:timeout', 5, '2026-03-01', '2026-03-20', 'resolved')
    `);
    await db.exec(`
      INSERT INTO guard_rail_proposals (id, tenant_id, pattern_id, rule_content, rule_filename, rationale, llm_model, status, reviewed_at)
        VALUES ('grp1', 'org_test', 'fp1', 'rule content', 'rule-001.md', 'test', 'claude-3', 'approved', '2026-03-20')
    `);
    // pre-deploy error events
    await db.exec(`
      INSERT INTO execution_events (id, task_id, tenant_id, source, severity, created_at) VALUES
        ('e_pre1', 't1', 'org_test', 'agent-x', 'error', '2026-03-10'),
        ('e_pre2', 't2', 'org_test', 'agent-x', 'error', '2026-03-15'),
        ('e_pre3', 't3', 'org_test', 'agent-x', 'error', '2026-03-18')
    `);
    // post-deploy: fewer errors (rule was effective)
    await db.exec(`
      INSERT INTO execution_events (id, task_id, tenant_id, source, severity, created_at) VALUES
        ('e_post1', 't4', 'org_test', 'agent-x', 'error', '2026-03-25')
    `);
  }

  it("GET /api/guard-rail/effectiveness — 200 빈 결과", async () => {
    const res = await req("GET", "/api/guard-rail/effectiveness");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items).toEqual([]);
    expect(data.totalRules).toBe(0);
  });

  it("GET /api/guard-rail/effectiveness — 승인된 Rule 효과 측정", async () => {
    await seedApprovedProposal();
    const res = await req("GET", "/api/guard-rail/effectiveness?windowDays=30");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.totalRules).toBe(1);
    expect(data.items[0].proposalId).toBe("grp1");
    expect(data.items[0].preDeployFailures).toBe(3);
    expect(data.items[0].postDeployFailures).toBe(1);
    // score = (1 - 1/3) * 100 = 67
    expect(data.items[0].effectivenessScore).toBe(67);
    expect(data.items[0].status).toBe("measured");
  });

  it("GET /api/guard-rail/effectiveness — windowDays 파라미터 적용", async () => {
    await seedApprovedProposal();
    // windowDays=5: 좁은 윈도우 → pre 이벤트가 5일 이내만 포함
    const res = await req("GET", "/api/guard-rail/effectiveness?windowDays=5");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items[0].status).toMatch(/measured|insufficient_data/);
  });
});
