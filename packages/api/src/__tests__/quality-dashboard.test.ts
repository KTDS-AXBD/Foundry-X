import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { QualityDashboardService } from "../core/harness/services/quality-dashboard-service.js";

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

function setupDb() {
  const db = createMockD1();
  void db.exec(JOBS_SCHEMA);
  void db.exec(QUALITY_SCHEMA);
  return db;
}

async function seedJob(db: ReturnType<typeof createMockD1>, id: string) {
  await db
    .prepare("INSERT INTO prototype_jobs (id, org_id, prd_content, prd_title) VALUES (?, ?, ?, ?)")
    .bind(id, "org-1", "# PRD\nTest content", "Test PRD")
    .run();
}

async function seedQuality(
  db: ReturnType<typeof createMockD1>,
  jobId: string,
  round: number,
  totalScore: number,
  mode = "api",
  costUsd = 0.48,
) {
  await db
    .prepare(
      `INSERT INTO prototype_quality (id, job_id, round, total_score, build_score, ui_score, functional_score, prd_score, code_score, generation_mode, cost_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(`pq-${jobId}-${round}`, jobId, round, totalScore, 0.8, 0.6, 0.7, 0.5, 0.9, mode, costUsd)
    .run();
}

describe("QualityDashboardService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: QualityDashboardService;

  beforeEach(async () => {
    db = setupDb();
    svc = new QualityDashboardService(db as unknown as D1Database);
    await seedJob(db, "job-1");
    await seedJob(db, "job-2");
    await seedQuality(db, "job-1", 0, 60, "api", 0.48);
    await seedQuality(db, "job-1", 1, 85, "max-cli", 0);
    await seedQuality(db, "job-2", 0, 75, "max-cli", 0);
  });

  it("getSummary — 최신 라운드 기준 통계를 반환해요", async () => {
    const summary = await svc.getSummary();
    expect(summary.totalPrototypes).toBe(2);
    // job-1 최신 = 85, job-2 최신 = 75 → avg = 80
    expect(summary.averageScore).toBe(80);
    expect(summary.above80Count).toBe(1); // 85만 80+
    expect(summary.above80Pct).toBe(50);
    expect(summary.generationModes.cli).toBeGreaterThanOrEqual(0);
  });

  it("getDimensionAverages — 5차원 평균을 반환해요", async () => {
    const dims = await svc.getDimensionAverages();
    expect(dims.build).toBeGreaterThan(0);
    expect(dims.ui).toBeGreaterThan(0);
    expect(dims.functional).toBeGreaterThan(0);
    expect(dims.prd).toBeGreaterThan(0);
    expect(dims.code).toBeGreaterThan(0);
  });

  it("getTrend — 일별 추이를 반환해요", async () => {
    const trend = await svc.getTrend(30);
    expect(trend.period).toBe("30d");
    expect(Array.isArray(trend.points)).toBe(true);
    // 오늘 날짜의 데이터가 있어야 함
    expect(trend.points.length).toBeGreaterThanOrEqual(1);
    expect(trend.points[0]!.avgScore).toBeGreaterThan(0);
  });

  it("빈 DB에서도 에러 없이 동작해요", async () => {
    const emptyDb = setupDb();
    const emptySvc = new QualityDashboardService(emptyDb as unknown as D1Database);
    const summary = await emptySvc.getSummary();
    expect(summary.totalPrototypes).toBe(0);
    expect(summary.averageScore).toBe(0);
  });
});
