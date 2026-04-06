import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { CalibrationService } from "../services/calibration-service.js";

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

const QUALITY_SCHEMA = `
  CREATE TABLE IF NOT EXISTS prototype_quality (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    job_id TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 0,
    total_score REAL NOT NULL,
    build_score REAL NOT NULL,
    ui_score REAL NOT NULL,
    functional_score REAL NOT NULL,
    prd_score REAL NOT NULL,
    code_score REAL NOT NULL,
    generation_mode TEXT NOT NULL DEFAULT 'api',
    cost_usd REAL NOT NULL DEFAULT 0,
    feedback TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  void db.exec(QUALITY_SCHEMA);
  void db.exec(EVAL_SCHEMA);
  return db;
}

async function seedJob(db: ReturnType<typeof createMockD1>, id: string) {
  await db
    .prepare("INSERT INTO prototype_jobs (id, org_id, prd_content, prd_title) VALUES (?, ?, ?, ?)")
    .bind(id, "org-1", "# PRD\nTest", "Test PRD")
    .run();
}

async function seedQuality(db: ReturnType<typeof createMockD1>, jobId: string, scores: number[]) {
  await db
    .prepare(
      `INSERT INTO prototype_quality (id, job_id, round, total_score, build_score, ui_score, functional_score, prd_score, code_score, generation_mode, cost_usd)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, 'api', 0)`,
    )
    .bind(`pq-${jobId}`, jobId, scores[0], scores[1], scores[2], scores[3], scores[4], scores[5])
    .run();
}

async function seedEval(db: ReturnType<typeof createMockD1>, jobId: string, scores: number[]) {
  const id = `ue-${jobId}-${Date.now()}`;
  await db
    .prepare(
      `INSERT INTO user_evaluations (id, job_id, org_id, evaluator_role, build_score, ui_score, functional_score, prd_score, code_score, overall_score)
       VALUES (?, ?, 'org-1', 'bd_team', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, jobId, scores[0], scores[1], scores[2], scores[3], scores[4], scores[5])
    .run();
}

describe("CalibrationService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: CalibrationService;

  beforeEach(() => {
    db = setupDb();
    svc = new CalibrationService(db as unknown as D1Database);
  });

  it("데이터 부족 시 insufficient_data를 반환해요", async () => {
    const result = await svc.computeCorrelation("org-1");
    expect(result.calibrationStatus).toBe("insufficient_data");
    expect(result.correlations).toEqual([]);
    expect(result.totalEvaluations).toBe(0);
  });

  it("매칭 데이터가 3쌍 미만이면 insufficient_data예요", async () => {
    await seedJob(db, "job-1");
    await seedJob(db, "job-2");
    await seedQuality(db, "job-1", [80, 0.9, 0.7, 0.8, 0.6, 0.9]);
    await seedQuality(db, "job-2", [70, 0.8, 0.5, 0.7, 0.5, 0.8]);
    await seedEval(db, "job-1", [4, 3, 4, 3, 4, 4]);
    await seedEval(db, "job-2", [3, 2, 3, 2, 3, 3]);

    const result = await svc.computeCorrelation("org-1");
    expect(result.calibrationStatus).toBe("insufficient_data");
  });

  it("3쌍 이상이면 상관계수를 계산해요", async () => {
    // 3개 job, 자동 점수가 높을수록 수동 점수도 높은 양의 상관관계
    await seedJob(db, "job-1");
    await seedJob(db, "job-2");
    await seedJob(db, "job-3");

    // 자동: 높은 → 중간 → 낮은
    await seedQuality(db, "job-1", [90, 0.9, 0.8, 0.9, 0.8, 0.9]);
    await seedQuality(db, "job-2", [60, 0.6, 0.5, 0.6, 0.5, 0.6]);
    await seedQuality(db, "job-3", [30, 0.3, 0.2, 0.3, 0.2, 0.3]);

    // 수동: 높은 → 중간 → 낮은 (양의 상관)
    await seedEval(db, "job-1", [5, 4, 5, 4, 5, 5]);
    await seedEval(db, "job-2", [3, 3, 3, 3, 3, 3]);
    await seedEval(db, "job-3", [1, 1, 1, 1, 1, 1]);

    const result = await svc.computeCorrelation("org-1");
    expect(result.calibrationStatus).not.toBe("insufficient_data");
    expect(result.correlations.length).toBe(5);
    expect(result.totalEvaluations).toBe(3);

    // 강한 양의 상관관계
    for (const c of result.correlations) {
      expect(c.pearson).toBeGreaterThan(0.9);
      expect(c.sampleSize).toBe(3);
    }
    expect(result.overallPearson).toBeGreaterThan(0.9);
  });

  it("다른 org의 데이터는 포함하지 않아요", async () => {
    await seedJob(db, "job-1");
    await seedQuality(db, "job-1", [80, 0.9, 0.7, 0.8, 0.6, 0.9]);

    // org-1이 아닌 org-other로 등록
    await db
      .prepare(
        `INSERT INTO user_evaluations (id, job_id, org_id, evaluator_role, build_score, ui_score, functional_score, prd_score, code_score, overall_score)
         VALUES ('ue-other', 'job-1', 'org-other', 'bd_team', 4, 3, 4, 3, 4, 4)`,
      )
      .run();

    const result = await svc.computeCorrelation("org-1");
    expect(result.totalEvaluations).toBe(0);
  });
});
