import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { UserEvaluationService } from "../services/user-evaluation-service.js";

const JOBS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS prototype_jobs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    prd_content TEXT NOT NULL,
    prd_title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'queued',
    builder_type TEXT NOT NULL DEFAULT 'cli',
    pages_project TEXT,
    pages_url TEXT,
    build_log TEXT DEFAULT '',
    error_message TEXT,
    cost_input_tokens INTEGER DEFAULT 0,
    cost_output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    model_used TEXT DEFAULT 'haiku',
    fallback_used INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at INTEGER,
    completed_at INTEGER
  );
`;

const EVAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS user_evaluations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    job_id TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL,
    evaluator_role TEXT NOT NULL DEFAULT 'bd_team',
    build_score INTEGER NOT NULL CHECK(build_score BETWEEN 1 AND 5),
    ui_score INTEGER NOT NULL CHECK(ui_score BETWEEN 1 AND 5),
    functional_score INTEGER NOT NULL CHECK(functional_score BETWEEN 1 AND 5),
    prd_score INTEGER NOT NULL CHECK(prd_score BETWEEN 1 AND 5),
    code_score INTEGER NOT NULL CHECK(code_score BETWEEN 1 AND 5),
    overall_score INTEGER NOT NULL CHECK(overall_score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function setupDb() {
  const db = createMockD1();
  void db.exec(JOBS_SCHEMA);
  void db.exec(EVAL_SCHEMA);
  return db;
}

async function seedJob(db: ReturnType<typeof createMockD1>, id = "job-1") {
  await db
    .prepare("INSERT INTO prototype_jobs (id, org_id, prd_content, prd_title) VALUES (?, ?, ?, ?)")
    .bind(id, "org-1", "# PRD\nTest", "Test PRD")
    .run();
}

describe("UserEvaluationService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: UserEvaluationService;

  beforeEach(async () => {
    db = setupDb();
    svc = new UserEvaluationService(db as unknown as D1Database);
    await seedJob(db);
  });

  it("수동 평가를 저장하고 반환해요", async () => {
    const record = await svc.create("org-1", {
      jobId: "job-1",
      evaluatorRole: "bd_team",
      buildScore: 4,
      uiScore: 3,
      functionalScore: 5,
      prdScore: 4,
      codeScore: 3,
      overallScore: 4,
      comment: "UI 개선 필요",
    });

    expect(record.jobId).toBe("job-1");
    expect(record.evaluatorRole).toBe("bd_team");
    expect(record.buildScore).toBe(4);
    expect(record.uiScore).toBe(3);
    expect(record.overallScore).toBe(4);
    expect(record.comment).toBe("UI 개선 필요");
  });

  it("Job별 평가 목록을 반환해요", async () => {
    await svc.create("org-1", {
      jobId: "job-1",
      evaluatorRole: "bd_team",
      buildScore: 4,
      uiScore: 3,
      functionalScore: 5,
      prdScore: 4,
      codeScore: 3,
      overallScore: 4,
    });
    await svc.create("org-1", {
      jobId: "job-1",
      evaluatorRole: "customer",
      buildScore: 3,
      uiScore: 2,
      functionalScore: 4,
      prdScore: 3,
      codeScore: 2,
      overallScore: 3,
    });

    const items = await svc.listByJob("org-1", "job-1");
    expect(items.length).toBe(2);
  });

  it("다른 org의 평가는 보이지 않아요", async () => {
    await svc.create("org-1", {
      jobId: "job-1",
      evaluatorRole: "bd_team",
      buildScore: 4,
      uiScore: 3,
      functionalScore: 5,
      prdScore: 4,
      codeScore: 3,
      overallScore: 4,
    });

    const items = await svc.listByJob("org-other", "job-1");
    expect(items.length).toBe(0);
  });

  it("전체 평가 목록을 반환해요", async () => {
    await seedJob(db, "job-2");
    await svc.create("org-1", {
      jobId: "job-1",
      evaluatorRole: "bd_team",
      buildScore: 4,
      uiScore: 3,
      functionalScore: 5,
      prdScore: 4,
      codeScore: 3,
      overallScore: 4,
    });
    await svc.create("org-1", {
      jobId: "job-2",
      evaluatorRole: "customer",
      buildScore: 3,
      uiScore: 2,
      functionalScore: 4,
      prdScore: 3,
      codeScore: 2,
      overallScore: 3,
    });

    const all = await svc.listAll("org-1");
    expect(all.length).toBe(2);
  });

  it("comment 없이도 저장돼요", async () => {
    const record = await svc.create("org-1", {
      jobId: "job-1",
      evaluatorRole: "executive",
      buildScore: 5,
      uiScore: 5,
      functionalScore: 5,
      prdScore: 5,
      codeScore: 5,
      overallScore: 5,
    });

    expect(record.comment).toBeNull();
  });
});
