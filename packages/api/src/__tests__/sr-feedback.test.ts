import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

const SR_DDL = `CREATE TABLE IF NOT EXISTS sr_requests (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, sr_type TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open', confidence REAL DEFAULT 0, matched_keywords TEXT, requester_id TEXT, workflow_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), closed_at TEXT)`;
const WR_DDL = `CREATE TABLE IF NOT EXISTS sr_workflow_runs (id TEXT PRIMARY KEY, sr_id TEXT NOT NULL, workflow_template TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', steps_completed INTEGER DEFAULT 0, steps_total INTEGER DEFAULT 0, result_summary TEXT, started_at TEXT, completed_at TEXT)`;
const FB_DDL = `CREATE TABLE IF NOT EXISTS sr_classification_feedback (id TEXT PRIMARY KEY, sr_id TEXT NOT NULL, original_type TEXT NOT NULL, corrected_type TEXT NOT NULL, corrected_by TEXT, reason TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`;

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

function seedDb(sql: string, ...params: unknown[]) {
  if (params.length > 0) {
    (env.DB as any).prepare(sql).bind(...params).run();
  } else {
    (env.DB as any).exec(sql);
  }
}

function insertSr(id: string, orgId = "org_test", srType = "code_change") {
  seedDb(
    "INSERT INTO sr_requests (id, org_id, title, sr_type, status, confidence, matched_keywords) VALUES (?, ?, ?, ?, 'classified', 0.6, '[]')",
    id, orgId, `Test SR ${id}`, srType,
  );
}

describe("SR Feedback & Stats Routes", () => {
  let authHeader: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    seedDb(SR_DDL);
    seedDb(WR_DDL);
    seedDb(FB_DDL);
    seedDb("INSERT OR IGNORE INTO users (id, email, name, role, created_at, updated_at) VALUES ('test-user', 'test@example.com', 'Test', 'admin', datetime('now'), datetime('now'))");
    authHeader = await createAuthHeaders();
  });

  // --- GET /api/sr/stats ---

  it("GET /api/sr/stats: empty result", async () => {
    const res = await req("GET", "/api/sr/stats", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.totalCount).toBe(0);
    expect(data.feedbackCount).toBe(0);
    expect(data.misclassificationRate).toBe(0);
    expect(data.typeDistribution).toEqual([]);
  });

  it("GET /api/sr/stats: type distribution", async () => {
    insertSr("sr-1", "org_test", "bug_fix");
    insertSr("sr-2", "org_test", "bug_fix");
    insertSr("sr-3", "org_test", "code_change");

    const res = await req("GET", "/api/sr/stats", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.totalCount).toBe(3);
    expect(data.typeDistribution.length).toBe(2);
    const bugFix = data.typeDistribution.find((t: any) => t.sr_type === "bug_fix");
    expect(bugFix.count).toBe(2);
  });

  it("GET /api/sr/stats: misclassification rate", async () => {
    insertSr("sr-1", "org_test", "code_change");
    insertSr("sr-2", "org_test", "bug_fix");
    // Add feedback for sr-1
    seedDb(
      "INSERT INTO sr_classification_feedback (id, sr_id, original_type, corrected_type) VALUES (?, ?, ?, ?)",
      "fb-1", "sr-1", "code_change", "bug_fix",
    );

    const res = await req("GET", "/api/sr/stats", { headers: authHeader });
    const data = (await res.json()) as any;
    expect(data.feedbackCount).toBe(1);
    expect(data.misclassificationRate).toBe(0.5);
  });

  // --- POST /api/sr/:id/feedback ---

  it("POST /api/sr/:id/feedback: valid feedback", async () => {
    insertSr("sr-fb-1");

    const res = await req("POST", "/api/sr/sr-fb-1/feedback", {
      headers: authHeader,
      body: { corrected_type: "bug_fix", corrected_by: "user-1", reason: "실제 버그 리포트" },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.original_type).toBe("code_change");
    expect(data.corrected_type).toBe("bug_fix");

    // sr_type should be updated
    const sr = await (env.DB as any).prepare("SELECT sr_type FROM sr_requests WHERE id = ?").bind("sr-fb-1").first();
    expect(sr.sr_type).toBe("bug_fix");
  });

  it("POST /api/sr/:id/feedback: SR not found returns 404", async () => {
    const res = await req("POST", "/api/sr/nonexistent/feedback", {
      headers: authHeader,
      body: { corrected_type: "bug_fix" },
    });
    expect(res.status).toBe(404);
  });

  it("POST /api/sr/:id/feedback: invalid type returns 400", async () => {
    insertSr("sr-fb-2");
    const res = await req("POST", "/api/sr/sr-fb-2/feedback", {
      headers: authHeader,
      body: { corrected_type: "invalid_type" },
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/sr/:id/feedback: missing corrected_type returns 400", async () => {
    insertSr("sr-fb-3");
    const res = await req("POST", "/api/sr/sr-fb-3/feedback", {
      headers: authHeader,
      body: {},
    });
    expect(res.status).toBe(400);
  });

  // --- GET /api/sr/:id/feedback ---

  it("GET /api/sr/:id/feedback: empty result", async () => {
    insertSr("sr-gf-1");
    const res = await req("GET", "/api/sr/sr-gf-1/feedback", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items).toEqual([]);
  });

  it("GET /api/sr/:id/feedback: returns feedback list", async () => {
    insertSr("sr-gf-2");
    seedDb(
      "INSERT INTO sr_classification_feedback (id, sr_id, original_type, corrected_type, reason) VALUES (?, ?, ?, ?, ?)",
      "fb-gf-1", "sr-gf-2", "code_change", "bug_fix", "실제 버그",
    );
    seedDb(
      "INSERT INTO sr_classification_feedback (id, sr_id, original_type, corrected_type) VALUES (?, ?, ?, ?)",
      "fb-gf-2", "sr-gf-2", "bug_fix", "security_patch",
    );

    const res = await req("GET", "/api/sr/sr-gf-2/feedback", { headers: authHeader });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.items.length).toBe(2);
  });

  it("GET /api/sr/:id/feedback: SR not found returns 404", async () => {
    const res = await req("GET", "/api/sr/nonexistent/feedback", { headers: authHeader });
    expect(res.status).toBe(404);
  });

  // --- POST /api/sr (hybrid) ---

  it("POST /api/sr: response includes method field", async () => {
    const res = await req("POST", "/api/sr", {
      headers: authHeader,
      body: { title: "보안 취약점 패치 CVE-2026-999", description: "XSS 보안" },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.method).toBeDefined();
    expect(["rule", "llm", "hybrid"]).toContain(data.method);
    expect(data.sr_type).toBeDefined();
    expect(data.confidence).toBeGreaterThan(0);
  });

  it("POST /api/sr: backward compatible fields", async () => {
    const res = await req("POST", "/api/sr", {
      headers: authHeader,
      body: { title: "에러 수정 요청" },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("sr_type");
    expect(data).toHaveProperty("confidence");
    expect(data).toHaveProperty("matched_keywords");
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("suggestedWorkflow");
  });

  // --- Integration: SR 생성 → 피드백 → stats 반영 ---

  it("integration: create SR → submit feedback → stats reflect", async () => {
    // Create SR
    const createRes = await req("POST", "/api/sr", {
      headers: authHeader,
      body: { title: "기능 구현 요청" },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as any;

    // Submit feedback
    const fbRes = await req("POST", `/api/sr/${created.id}/feedback`, {
      headers: authHeader,
      body: { corrected_type: "bug_fix", reason: "실제로는 버그" },
    });
    expect(fbRes.status).toBe(201);

    // Check stats
    const statsRes = await req("GET", "/api/sr/stats", { headers: authHeader });
    const stats = (await statsRes.json()) as any;
    expect(stats.totalCount).toBe(1);
    expect(stats.feedbackCount).toBe(1);
    expect(stats.misclassificationRate).toBe(1);
  });
});
