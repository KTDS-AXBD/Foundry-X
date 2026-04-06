// ─── F357+F358: Guard Rail Routes 통합 테스트 (Sprint 161) ───

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
  CREATE TABLE IF NOT EXISTS task_state_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    trigger_source TEXT,
    trigger_event TEXT,
    guard_result TEXT,
    transitioned_by TEXT,
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
  CREATE UNIQUE INDEX IF NOT EXISTS idx_fp_pattern ON failure_patterns(tenant_id, pattern_key);
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_grp_tenant ON guard_rail_proposals(tenant_id, status);
`;

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Guard Rail Routes", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    // DDL 추가 실행
    await (env.DB as any).exec(DDL);
    headers = await createAuthHeaders();
    vi.restoreAllMocks();
  });

  async function req(method: string, path: string, body?: unknown) {
    const init: RequestInit = { method, headers: { ...headers } };
    if (body) {
      (init.headers as Record<string, string>)["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    return app.request(`http://localhost${path}`, init, env);
  }

  describe("GET /api/guard-rail/diagnostic", () => {
    it("200 — 진단 결과 반환", async () => {
      const res = await req("GET", "/api/guard-rail/diagnostic");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toHaveProperty("totalEvents");
      expect(body).toHaveProperty("isDataSufficient");
      expect(body).toHaveProperty("sourceDistribution");
    });
  });

  describe("POST /api/guard-rail/detect", () => {
    it("200 — 패턴 감지 결과 반환", async () => {
      const res = await req("POST", "/api/guard-rail/detect", {
        minOccurrences: 3,
        sinceDays: 30,
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toHaveProperty("patternsFound");
      expect(body).toHaveProperty("patterns");
    });
  });

  describe("GET /api/guard-rail/proposals", () => {
    it("200 — 제안 목록 반환", async () => {
      const res = await req("GET", "/api/guard-rail/proposals");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toHaveProperty("items");
      expect(body).toHaveProperty("total");
    });
  });

  describe("PATCH /api/guard-rail/proposals/:id", () => {
    it("404 — 존재하지 않는 ID", async () => {
      const res = await req("PATCH", "/api/guard-rail/proposals/nonexistent", {
        status: "approved",
      });
      expect(res.status).toBe(404);
    });

    it("200 — 상태 업데이트", async () => {
      // 먼저 failure_pattern + proposal 직접 삽입
      await (env.DB as any).exec(`
        INSERT INTO failure_patterns (id, tenant_id, pattern_key, occurrence_count, first_seen, last_seen, status, created_at, updated_at)
        VALUES ('fp-1', 'org_test', 'hook:error', 5, '2026-03-01', '2026-04-06', 'detected', datetime('now'), datetime('now'))
      `);
      await (env.DB as any).exec(`
        INSERT INTO guard_rail_proposals (id, tenant_id, pattern_id, rule_content, rule_filename, rationale, llm_model, status, created_at)
        VALUES ('gp-1', 'org_test', 'fp-1', '# Rule', 'auto-guard-001.md', 'test rationale', 'haiku', 'pending', datetime('now'))
      `);

      const res = await req("PATCH", "/api/guard-rail/proposals/gp-1", {
        status: "approved",
        reviewedBy: "user-1",
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.status).toBe("approved");
      expect(body.reviewedBy).toBe("user-1");
    });
  });

  // ── F359: POST /guard-rail/proposals/:id/deploy ───────────────
  describe("POST /api/guard-rail/proposals/:id/deploy", () => {
    async function seedApprovedProposal(id = "gp-d1") {
      await (env.DB as any).exec(`
        INSERT INTO failure_patterns (id, tenant_id, pattern_key, occurrence_count, first_seen, last_seen, status, created_at, updated_at)
        VALUES ('fp-d', 'org_test', 'lint:warning', 8, '2026-03-01', '2026-04-06', 'resolved', datetime('now'), datetime('now'))
      `);
      await (env.DB as any).exec(`
        INSERT INTO guard_rail_proposals (id, tenant_id, pattern_id, rule_content, rule_filename, rationale, llm_model, status, reviewed_at, reviewed_by, created_at)
        VALUES ('${id}', 'org_test', 'fp-d', '# Always lint before commit', 'auto-guard-001.md', 'lint:warning 8 times', 'haiku', 'approved', '2026-04-06T10:00:00Z', 'user-1', datetime('now'))
      `);
    }

    it("200 — approved proposal deploy 성공", async () => {
      await seedApprovedProposal();
      const res = await req("POST", "/api/guard-rail/proposals/gp-d1/deploy");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.filename).toMatch(/^auto-guard-\d{3}\.md$/);
      expect(body.content).toContain("source: auto-generated");
      expect(body.content).toContain("# Always lint before commit");
      expect(body.content).toContain("## 근거");
      expect(body.proposalId).toBe("gp-d1");
      expect(body.patternId).toBe("fp-d");
    });

    it("400 — pending proposal deploy 거부", async () => {
      await (env.DB as any).exec(`
        INSERT INTO failure_patterns (id, tenant_id, pattern_key, occurrence_count, first_seen, last_seen, status, created_at, updated_at)
        VALUES ('fp-p', 'org_test', 'test:fail', 3, '2026-03-01', '2026-04-06', 'detected', datetime('now'), datetime('now'))
      `);
      await (env.DB as any).exec(`
        INSERT INTO guard_rail_proposals (id, tenant_id, pattern_id, rule_content, rule_filename, rationale, llm_model, status, created_at)
        VALUES ('gp-p1', 'org_test', 'fp-p', '# Rule', 'auto-guard-001.md', 'test', 'haiku', 'pending', datetime('now'))
      `);

      const res = await req("POST", "/api/guard-rail/proposals/gp-p1/deploy");
      expect(res.status).toBe(400);
      const body = (await res.json()) as any;
      expect(body.error).toContain("approved");
    });

    it("404 — 존재하지 않는 proposal", async () => {
      const res = await req("POST", "/api/guard-rail/proposals/nonexistent/deploy");
      expect(res.status).toBe(404);
    });
  });
});
