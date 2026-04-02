import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DerivedReviewService } from "../services/derived-review.js";

const DERIVED_TABLES = `
CREATE TABLE IF NOT EXISTS derived_patterns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pipeline_stage TEXT NOT NULL,
  discovery_stage TEXT,
  pattern_type TEXT NOT NULL DEFAULT 'single',
  skill_ids TEXT NOT NULL,
  success_rate REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  avg_cost_usd REAL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  confidence REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  extracted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);
CREATE TABLE IF NOT EXISTS derived_candidates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  prompt_template TEXT NOT NULL,
  source_skills TEXT NOT NULL,
  similarity_score REAL DEFAULT 0,
  safety_grade TEXT DEFAULT 'pending',
  safety_score INTEGER DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  registered_skill_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT
);
CREATE TABLE IF NOT EXISTS derived_reviews (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  comment TEXT,
  modified_prompt TEXT,
  reviewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  // Pattern
  (db as unknown as { prepare: (q: string) => { bind: (...a: unknown[]) => { run: () => void } } })
    .prepare(
      `INSERT INTO derived_patterns (id, tenant_id, pipeline_stage, pattern_type, skill_ids, success_rate, sample_count, confidence, status)
       VALUES ('pat_r1', ?, 'discovery', 'single', '["cost-model"]', 0.85, 10, 0.72, 'active')`,
    )
    .bind(TENANT)
    .run();

  // Candidate
  (db as unknown as { prepare: (q: string) => { bind: (...a: unknown[]) => { run: () => void } } })
    .prepare(
      `INSERT INTO derived_candidates (id, tenant_id, pattern_id, name, description, category, prompt_template, source_skills, review_status)
       VALUES ('cand_1', ?, 'pat_r1', 'Test Derived Skill', 'A test skill', 'analysis', 'Test prompt', '[{"skillId":"cost-model","contribution":1}]', 'pending')`,
    )
    .bind(TENANT)
    .run();
}

describe("DerivedReviewService (F276)", () => {
  let db: D1Database;
  let svc: DerivedReviewService;

  beforeEach(() => {
    const mockDb = createMockD1();
    mockDb.exec(DERIVED_TABLES);
    db = mockDb as unknown as D1Database;
    svc = new DerivedReviewService(db);
  });

  it("approves candidate → registers in skill_registry", async () => {
    seedCandidate(db);

    const review = await svc.review(TENANT, "cand_1", { action: "approved" }, "reviewer_1");

    expect(review.action).toBe("approved");
    expect(review.candidateId).toBe("cand_1");

    // Check skill_registry
    const skill = await db
      .prepare("SELECT * FROM skill_registry WHERE tenant_id = ? AND skill_id LIKE 'derived_%'")
      .bind(TENANT)
      .first<{ skill_id: string; source_type: string }>();
    expect(skill).not.toBeNull();
    expect(skill!.source_type).toBe("derived");
  });

  it("approves candidate → records lineage", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "cand_1", { action: "approved" }, "reviewer_1");

    const lineage = await db
      .prepare("SELECT * FROM skill_lineage WHERE tenant_id = ? AND derivation_type = 'derived'")
      .bind(TENANT)
      .first<{ parent_skill_id: string; child_skill_id: string }>();

    expect(lineage).not.toBeNull();
    expect(lineage!.parent_skill_id).toBe("cost-model");
    expect(lineage!.child_skill_id).toContain("derived_cand_1");
  });

  it("approves candidate → creates audit log", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "cand_1", { action: "approved" }, "reviewer_1");

    const audit = await db
      .prepare("SELECT * FROM skill_audit_log WHERE tenant_id = ? AND action = 'created'")
      .bind(TENANT)
      .first<{ entity_type: string; details: string }>();

    expect(audit).not.toBeNull();
    expect(audit!.entity_type).toBe("skill");
    expect(audit!.details).toContain("DERIVED");
  });

  it("approves candidate → consumes pattern", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "cand_1", { action: "approved" }, "reviewer_1");

    const pattern = await db
      .prepare("SELECT status FROM derived_patterns WHERE id = 'pat_r1'")
      .bind()
      .first<{ status: string }>();

    expect(pattern!.status).toBe("consumed");
  });

  it("rejects candidate — no registry entry", async () => {
    seedCandidate(db);

    const review = await svc.review(TENANT, "cand_1", {
      action: "rejected", comment: "Not useful",
    }, "reviewer_1");

    expect(review.action).toBe("rejected");

    const candidate = await db
      .prepare("SELECT review_status FROM derived_candidates WHERE id = 'cand_1'")
      .bind()
      .first<{ review_status: string }>();
    expect(candidate!.review_status).toBe("rejected");

    // No skill registered
    const skill = await db
      .prepare("SELECT * FROM skill_registry WHERE skill_id LIKE 'derived_%'")
      .bind()
      .first();
    expect(skill).toBeNull();
  });

  it("revision_requested with modified prompt — updates prompt + safety re-check + returns to pending", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "cand_1", {
      action: "revision_requested",
      modifiedPrompt: "Improved prompt for cost analysis",
    }, "reviewer_1");

    const candidate = await db
      .prepare("SELECT review_status, prompt_template, safety_grade, safety_score FROM derived_candidates WHERE id = 'cand_1'")
      .bind()
      .first<{ review_status: string; prompt_template: string; safety_grade: string; safety_score: number }>();

    expect(candidate!.review_status).toBe("pending"); // Returns to pending
    expect(candidate!.prompt_template).toBe("Improved prompt for cost analysis");
    expect(candidate!.safety_grade).not.toBe("pending"); // Re-checked
  });

  it("revision_requested without modified prompt — sets revision_requested status", async () => {
    seedCandidate(db);

    await svc.review(TENANT, "cand_1", {
      action: "revision_requested",
      comment: "Please improve",
    }, "reviewer_1");

    const candidate = await db
      .prepare("SELECT review_status FROM derived_candidates WHERE id = 'cand_1'")
      .bind()
      .first<{ review_status: string }>();

    expect(candidate!.review_status).toBe("revision_requested");
  });

  it("returns stats with approval rate", async () => {
    seedCandidate(db);

    // Add another candidate for rejected
    (db as unknown as { prepare: (q: string) => { bind: (...a: unknown[]) => { run: () => void } } })
      .prepare(
        `INSERT INTO derived_candidates (id, tenant_id, pattern_id, name, category, prompt_template, source_skills, review_status)
         VALUES ('cand_2', ?, 'pat_r1', 'Rejected Skill', 'general', 'Prompt', '[]', 'rejected')`,
      )
      .bind(TENANT)
      .run();

    await svc.review(TENANT, "cand_1", { action: "approved" }, "reviewer_1");

    const stats = await svc.getStats(TENANT);

    expect(stats.totalCandidates).toBe(2);
    expect(stats.approvedCandidates).toBe(1);
    expect(stats.rejectedCandidates).toBe(1);
    expect(stats.approvalRate).toBe(0.5);
    expect(stats.totalPatterns).toBe(1);
  });

  it("throws for non-existent candidate", async () => {
    await expect(
      svc.review(TENANT, "no_such", { action: "approved" }, "reviewer_1"),
    ).rejects.toThrow("Candidate not found");
  });
});
