import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { CapturedReviewService } from "../services/captured-review.js";

const CAPTURED_TABLES = `
CREATE TABLE IF NOT EXISTS captured_workflow_patterns (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, methodology_id TEXT,
  pipeline_stage TEXT NOT NULL, workflow_step_sequence TEXT NOT NULL,
  skill_sequence TEXT NOT NULL, success_rate REAL NOT NULL,
  sample_count INTEGER NOT NULL, avg_cost_usd REAL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0, confidence REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT
);
CREATE TABLE IF NOT EXISTS captured_candidates (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, pattern_id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT,
  category TEXT NOT NULL DEFAULT 'general', prompt_template TEXT NOT NULL,
  source_workflow_steps TEXT NOT NULL, source_skills TEXT NOT NULL,
  similarity_score REAL DEFAULT 0, safety_grade TEXT DEFAULT 'pending',
  safety_score INTEGER DEFAULT 0, review_status TEXT NOT NULL DEFAULT 'pending',
  registered_skill_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT, reviewed_by TEXT
);
CREATE TABLE IF NOT EXISTS captured_reviews (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, candidate_id TEXT NOT NULL,
  action TEXT NOT NULL, comment TEXT, modified_prompt TEXT,
  reviewer_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS skill_registry (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, skill_id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT, category TEXT DEFAULT 'general',
  tags TEXT, status TEXT DEFAULT 'active',
  safety_grade TEXT DEFAULT 'pending', safety_score INTEGER DEFAULT 0,
  safety_checked_at TEXT, source_type TEXT DEFAULT 'marketplace',
  source_ref TEXT, prompt_template TEXT, model_preference TEXT,
  max_tokens INTEGER DEFAULT 4096, token_cost_avg REAL DEFAULT 0,
  success_rate REAL DEFAULT 0, total_executions INTEGER DEFAULT 0,
  current_version INTEGER DEFAULT 1, created_by TEXT NOT NULL,
  updated_by TEXT, created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), deleted_at TEXT,
  skill_md_content TEXT, skill_md_generated_at TEXT,
  UNIQUE(tenant_id, skill_id)
);
CREATE TABLE IF NOT EXISTS skill_lineage (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL,
  parent_skill_id TEXT NOT NULL, child_skill_id TEXT NOT NULL,
  derivation_type TEXT DEFAULT 'manual', description TEXT,
  created_by TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS skill_audit_log (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  action TEXT NOT NULL, actor_id TEXT NOT NULL,
  details TEXT, created_at TEXT DEFAULT (datetime('now'))
);
`;

const TENANT = "org_test";

function seedCandidate(db: D1Database) {
  (db as any)
    .prepare(
      `INSERT INTO captured_workflow_patterns
        (id, tenant_id, pipeline_stage, workflow_step_sequence, skill_sequence,
         success_rate, sample_count, confidence, status)
       VALUES ('cpat_r1', ?, 'discovery',
         '[{"stepId":"s1","stepName":"조사","action":"analyze"}]',
         '["cost-model"]', 0.85, 10, 0.72, 'active')`,
    )
    .bind(TENANT)
    .run();

  (db as any)
    .prepare(
      `INSERT INTO captured_candidates
        (id, tenant_id, pattern_id, name, description, category, prompt_template,
         source_workflow_steps, source_skills, review_status)
       VALUES ('ccand_r1', ?, 'cpat_r1', 'Test Captured Skill', 'A test skill', 'analysis', 'Test prompt',
         '[{"stepId":"s1","stepName":"조사"}]',
         '[{"skillId":"cost-model","contribution":1}]', 'pending')`,
    )
    .bind(TENANT)
    .run();
}

describe("CapturedReviewService (F277)", () => {
  let db: D1Database;
  let svc: CapturedReviewService;

  beforeEach(() => {
    const mockDb = createMockD1();
    mockDb.exec(CAPTURED_TABLES);
    db = mockDb as unknown as D1Database;
    svc = new CapturedReviewService(db);
  });

  it("approves candidate → registers in skill_registry with source_type='captured'", async () => {
    seedCandidate(db);

    const review = await svc.review(TENANT, "ccand_r1", { action: "approved" }, "reviewer_1");

    expect(review.action).toBe("approved");
    expect(review.candidateId).toBe("ccand_r1");

    const skill = await db
      .prepare("SELECT * FROM skill_registry WHERE tenant_id = ? AND skill_id LIKE 'captured_%'")
      .bind(TENANT)
      .first<{ skill_id: string; source_type: string; skill_md_content: string | null; skill_md_generated_at: string | null }>();
    expect(skill).not.toBeNull();
    expect(skill!.source_type).toBe("captured");

    // F306: SKILL.md 자동 생성 확인
    expect(skill!.skill_md_content).not.toBeNull();
    expect(skill!.skill_md_content).toContain("Test Captured Skill");
    expect(skill!.skill_md_generated_at).not.toBeNull();
  });

  it("approves candidate → records lineage with derivation_type='captured'", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "ccand_r1", { action: "approved" }, "reviewer_1");

    const lineage = await db
      .prepare("SELECT * FROM skill_lineage WHERE tenant_id = ? AND derivation_type = 'captured'")
      .bind(TENANT)
      .first<{ parent_skill_id: string; child_skill_id: string }>();

    expect(lineage).not.toBeNull();
    expect(lineage!.parent_skill_id).toBe("cost-model");
    expect(lineage!.child_skill_id).toContain("captured_ccand_r1");
  });

  it("approves candidate → creates audit log with source=CAPTURED", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "ccand_r1", { action: "approved" }, "reviewer_1");

    const audit = await db
      .prepare("SELECT * FROM skill_audit_log WHERE tenant_id = ? AND action = 'created'")
      .bind(TENANT)
      .first<{ entity_type: string; details: string }>();

    expect(audit).not.toBeNull();
    expect(audit!.entity_type).toBe("skill");
    expect(audit!.details).toContain("CAPTURED");
  });

  it("approves candidate → consumes pattern", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "ccand_r1", { action: "approved" }, "reviewer_1");

    const pattern = await db
      .prepare("SELECT status FROM captured_workflow_patterns WHERE id = 'cpat_r1'")
      .bind()
      .first<{ status: string }>();

    expect(pattern!.status).toBe("consumed");
  });

  it("rejects candidate — no registry entry", async () => {
    seedCandidate(db);

    const review = await svc.review(TENANT, "ccand_r1", {
      action: "rejected", comment: "Not useful",
    }, "reviewer_1");

    expect(review.action).toBe("rejected");

    const candidate = await db
      .prepare("SELECT review_status FROM captured_candidates WHERE id = 'ccand_r1'")
      .bind()
      .first<{ review_status: string }>();
    expect(candidate!.review_status).toBe("rejected");

    const skill = await db
      .prepare("SELECT * FROM skill_registry WHERE skill_id LIKE 'captured_%'")
      .bind()
      .first();
    expect(skill).toBeNull();
  });

  it("revision_requested with modified prompt — updates prompt + re-checks safety", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "ccand_r1", {
      action: "revision_requested",
      modifiedPrompt: "Improved workflow prompt",
    }, "reviewer_1");

    const candidate = await db
      .prepare("SELECT review_status, prompt_template FROM captured_candidates WHERE id = 'ccand_r1'")
      .bind()
      .first<{ review_status: string; prompt_template: string }>();

    expect(candidate!.review_status).toBe("pending");
    expect(candidate!.prompt_template).toBe("Improved workflow prompt");
  });

  it("revision_requested without prompt — sets status to revision_requested", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "ccand_r1", {
      action: "revision_requested",
      comment: "Needs workflow step 3",
    }, "reviewer_1");

    const candidate = await db
      .prepare("SELECT review_status FROM captured_candidates WHERE id = 'ccand_r1'")
      .bind()
      .first<{ review_status: string }>();

    expect(candidate!.review_status).toBe("revision_requested");
  });

  it("throws on non-existent candidate", async () => {
    await expect(svc.review(TENANT, "no_such", { action: "approved" }, "r"))
      .rejects.toThrow("Candidate not found");
  });

  // ─── Stats ───

  it("getStats — returns correct counts", async () => {
    seedCandidate(db);

    const stats = await svc.getStats(TENANT);
    expect(stats.totalPatterns).toBe(1);
    expect(stats.activePatterns).toBe(1);
    expect(stats.totalCandidates).toBe(1);
    expect(stats.pendingCandidates).toBe(1);
  });

  it("getStats — reflects approval", async () => {
    seedCandidate(db);
    await svc.review(TENANT, "ccand_r1", { action: "approved" }, "reviewer_1");

    const stats = await svc.getStats(TENANT);
    expect(stats.approvedCandidates).toBe(1);
    expect(stats.pendingCandidates).toBe(0);
  });
});
