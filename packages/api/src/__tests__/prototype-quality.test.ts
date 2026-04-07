import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrototypeQualityService } from "../core/harness/services/prototype-quality-service.js";

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

async function seedJob(db: ReturnType<typeof createMockD1>, id = "job-1") {
  await db
    .prepare(
      "INSERT INTO prototype_jobs (id, org_id, prd_content, prd_title) VALUES (?, ?, ?, ?)",
    )
    .bind(id, "org-1", "# PRD\nTest content here", "Test PRD")
    .run();
}

describe("PrototypeQualityService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PrototypeQualityService;

  beforeEach(async () => {
    db = setupDb();
    svc = new PrototypeQualityService(db as unknown as D1Database);
    await seedJob(db);
  });

  describe("insert", () => {
    it("품질 스코어를 저장하고 반환해요", async () => {
      const record = await svc.insert({
        jobId: "job-1",
        round: 0,
        totalScore: 65,
        buildScore: 1.0,
        uiScore: 0.4,
        functionalScore: 0.5,
        prdScore: 0.3,
        codeScore: 0.7,
        generationMode: "api",
        costUsd: 0.48,
        feedback: "UI 개선 필요",
        details: JSON.stringify({ build: "ok", ui: "poor" }),
      });

      expect(record.jobId).toBe("job-1");
      expect(record.round).toBe(0);
      expect(record.totalScore).toBe(65);
      expect(record.dimensions.build).toBe(1.0);
      expect(record.dimensions.ui).toBe(0.4);
      expect(record.generationMode).toBe("api");
      expect(record.costUsd).toBe(0.48);
      expect(record.feedback).toBe("UI 개선 필요");
      expect(record.details).toEqual({ build: "ok", ui: "poor" });
    });

    it("CLI 모드로 비용 $0 저장해요", async () => {
      const record = await svc.insert({
        jobId: "job-1",
        round: 0,
        totalScore: 70,
        buildScore: 1.0,
        uiScore: 0.5,
        functionalScore: 0.6,
        prdScore: 0.5,
        codeScore: 0.8,
        generationMode: "max-cli",
        costUsd: 0,
      });

      expect(record.generationMode).toBe("max-cli");
      expect(record.costUsd).toBe(0);
    });
  });

  describe("listByJob", () => {
    it("라운드 순서대로 점수를 반환해요", async () => {
      await svc.insert({
        jobId: "job-1",
        round: 0,
        totalScore: 45,
        buildScore: 1.0,
        uiScore: 0.2,
        functionalScore: 0.3,
        prdScore: 0.2,
        codeScore: 0.5,
        generationMode: "api",
        costUsd: 0.48,
      });
      await svc.insert({
        jobId: "job-1",
        round: 1,
        totalScore: 68,
        buildScore: 1.0,
        uiScore: 0.5,
        functionalScore: 0.6,
        prdScore: 0.5,
        codeScore: 0.7,
        generationMode: "api",
        costUsd: 0.48,
      });

      const scores = await svc.listByJob("job-1");
      expect(scores).toHaveLength(2);
      expect(scores[0]!.round).toBe(0);
      expect(scores[1]!.round).toBe(1);
      expect(scores[1]!.totalScore).toBe(68);
    });

    it("존재하지 않는 Job은 빈 배열을 반환해요", async () => {
      const scores = await svc.listByJob("nonexistent");
      expect(scores).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("전체 통계를 산출해요", async () => {
      // Job 2개 시드
      await seedJob(db, "job-2");

      // job-1: 2라운드 (45 → 85)
      await svc.insert({
        jobId: "job-1",
        round: 0,
        totalScore: 45,
        buildScore: 0.5,
        uiScore: 0.2,
        functionalScore: 0.3,
        prdScore: 0.2,
        codeScore: 0.5,
        generationMode: "api",
        costUsd: 0.48,
      });
      await svc.insert({
        jobId: "job-1",
        round: 1,
        totalScore: 85,
        buildScore: 1.0,
        uiScore: 0.7,
        functionalScore: 0.8,
        prdScore: 0.7,
        codeScore: 0.9,
        generationMode: "max-cli",
        costUsd: 0,
      });

      // job-2: 1라운드 (60)
      await svc.insert({
        jobId: "job-2",
        round: 0,
        totalScore: 60,
        buildScore: 1.0,
        uiScore: 0.3,
        functionalScore: 0.4,
        prdScore: 0.3,
        codeScore: 0.6,
        generationMode: "api",
        costUsd: 0.52,
      });

      const stats = await svc.getStats();
      expect(stats.totalPrototypes).toBe(2);
      // 최근 라운드: job-1=85, job-2=60 → 평균 72.5
      expect(stats.averageScore).toBeCloseTo(72.5, 0);
      expect(stats.above80Count).toBe(1); // job-1만 85 >= 80
      expect(stats.generationModes.cli).toBe(1); // max-cli 1건
      expect(stats.generationModes.api).toBe(2); // api 2건
    });
  });
});
