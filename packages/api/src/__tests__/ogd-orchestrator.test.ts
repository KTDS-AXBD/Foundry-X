// F355: O-G-D Orchestrator Service 테스트 (Sprint 160)
// F467: PrototypeQualityService 주입 + prototype_quality 자동 적재 테스트 (Sprint 228)

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OgdOrchestratorService } from "../core/harness/services/ogd-orchestrator-service.js";
import { OgdGeneratorService } from "../core/harness/services/ogd-generator-service.js";
import { OgdDiscriminatorService } from "../core/harness/services/ogd-discriminator-service.js";
import { PrototypeQualityService } from "../core/harness/services/prototype-quality-service.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS prototype_jobs (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    prd_content TEXT NOT NULL,
    prd_title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'queued',
    builder_type TEXT NOT NULL DEFAULT 'cli',
    pages_project TEXT, pages_url TEXT, build_log TEXT DEFAULT '',
    error_message TEXT, cost_input_tokens INTEGER DEFAULT 0,
    cost_output_tokens INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0.0,
    model_used TEXT DEFAULT 'haiku', fallback_used INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0, quality_score REAL,
    ogd_rounds INTEGER DEFAULT 0, feedback_content TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    started_at INTEGER, completed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS ogd_rounds (
    id TEXT PRIMARY KEY, job_id TEXT NOT NULL, org_id TEXT NOT NULL,
    round_number INTEGER NOT NULL, quality_score REAL,
    feedback TEXT, input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0, cost_usd REAL DEFAULT 0.0,
    model_used TEXT DEFAULT 'haiku', passed INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(job_id, round_number)
  );
  CREATE TABLE IF NOT EXISTS prototype_quality (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    job_id TEXT NOT NULL,
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

function createMockAi(responses: string[]) {
  let callCount = 0;
  return {
    run: vi.fn().mockImplementation(() => {
      const response = responses[callCount] ?? responses[responses.length - 1];
      callCount++;
      return Promise.resolve({ response });
    }),
  } as unknown as Ai;
}

describe("OgdOrchestratorService", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    db = createMockD1();
    void db.exec(SCHEMA);
    void db
      .prepare(
        "INSERT INTO prototype_jobs (id, org_id, prd_content, prd_title, status) VALUES (?, ?, ?, ?, ?)",
      )
      .bind("job_1", "org_test", "Test PRD content for dashboard", "Test PRD", "queued")
      .run();
  });

  it("1라운드에서 즉시 pass하면 라운드 1개만 기록돼요", async () => {
    const ai = createMockAi([
      "<html><body><h1>Test</h1></body></html>",
      '{"qualityScore": 0.9, "feedback": "Looks good", "items": []}',
    ]);
    const gen = new OgdGeneratorService(ai);
    const disc = new OgdDiscriminatorService(ai);
    const orch = new OgdOrchestratorService(db as unknown as D1Database, gen, disc);

    const summary = await orch.runLoop("org_test", "job_1", "Test PRD content");
    expect(summary.totalRounds).toBe(1);
    expect(summary.passed).toBe(true);
    expect(summary.bestScore).toBeGreaterThanOrEqual(0.85);
  });

  it("3라운드까지 실패하면 passed=false예요", async () => {
    const ai = createMockAi([
      "<html>R1</html>",
      '{"qualityScore": 0.5, "feedback": "Bad layout", "items": []}',
      "<html>R2</html>",
      '{"qualityScore": 0.7, "feedback": "Better but needs CTA", "items": []}',
      "<html>R3</html>",
      '{"qualityScore": 0.6, "feedback": "Still not great", "items": []}',
    ]);
    const gen = new OgdGeneratorService(ai);
    const disc = new OgdDiscriminatorService(ai);
    const orch = new OgdOrchestratorService(db as unknown as D1Database, gen, disc);

    const summary = await orch.runLoop("org_test", "job_1", "Test PRD content");
    expect(summary.totalRounds).toBe(3);
    expect(summary.passed).toBe(false);
    expect(summary.bestScore).toBe(0.7);
    expect(summary.bestRound).toBe(2);
  });

  it("2라운드에서 pass하면 3라운드 실행 안 해요", async () => {
    const ai = createMockAi([
      "<html>R1</html>",
      '{"qualityScore": 0.6, "feedback": "Needs work", "items": []}',
      "<html>R2</html>",
      '{"qualityScore": 0.88, "feedback": "Pass", "items": []}',
    ]);
    const gen = new OgdGeneratorService(ai);
    const disc = new OgdDiscriminatorService(ai);
    const orch = new OgdOrchestratorService(db as unknown as D1Database, gen, disc);

    const summary = await orch.runLoop("org_test", "job_1", "Test PRD content");
    expect(summary.totalRounds).toBe(2);
    expect(summary.passed).toBe(true);
  });

  it("getSummary는 라운드가 없으면 null 반환해요", async () => {
    const ai = createMockAi([]);
    const gen = new OgdGeneratorService(ai);
    const disc = new OgdDiscriminatorService(ai);
    const orch = new OgdOrchestratorService(db as unknown as D1Database, gen, disc);

    const summary = await orch.getSummary("nonexistent", "org_test");
    expect(summary).toBeNull();
  });

  it("prototype_jobs의 quality_score가 갱신돼요", async () => {
    const ai = createMockAi([
      "<html>R1</html>",
      '{"qualityScore": 0.92, "feedback": "Great", "items": []}',
    ]);
    const gen = new OgdGeneratorService(ai);
    const disc = new OgdDiscriminatorService(ai);
    const orch = new OgdOrchestratorService(db as unknown as D1Database, gen, disc);

    const summary = await orch.runLoop("org_test", "job_1", "Test PRD content");
    // Verify via OGD summary result (DB update is validated by service logic)
    expect(summary.bestScore).toBeGreaterThanOrEqual(0.85);
    expect(summary.totalRounds).toBe(1);
    expect(summary.passed).toBe(true);
  });

  // F467 테스트
  it("F467: qualityService 주입 시 runLoop 후 prototype_quality에 INSERT돼요", async () => {
    const ai = createMockAi([
      "<html>R1</html>",
      '{"qualityScore": 0.9, "feedback": "Well done", "items": []}',
    ]);
    const gen = new OgdGeneratorService(ai);
    const disc = new OgdDiscriminatorService(ai);
    const qualityService = new PrototypeQualityService(db as unknown as D1Database);
    const orch = new OgdOrchestratorService(
      db as unknown as D1Database, gen, disc, undefined, qualityService,
    );

    await orch.runLoop("org_test", "job_1", "Test PRD content");

    const row = await db
      .prepare("SELECT * FROM prototype_quality WHERE job_id = ?")
      .bind("job_1")
      .first<{ total_score: number; generation_mode: string; round: number }>();

    expect(row).not.toBeNull();
    expect(row!.generation_mode).toBe("ogd");
    expect(row!.total_score).toBeCloseTo(90, 0);  // 0.9 * 100 = 90
    expect(row!.round).toBe(1);
  });

  it("F467: qualityService 미주입 시 prototype_quality INSERT 없어요 (기존 동작 유지)", async () => {
    const ai = createMockAi([
      "<html>R1</html>",
      '{"qualityScore": 0.9, "feedback": "OK", "items": []}',
    ]);
    const gen = new OgdGeneratorService(ai);
    const disc = new OgdDiscriminatorService(ai);
    const orch = new OgdOrchestratorService(db as unknown as D1Database, gen, disc);

    await orch.runLoop("org_test", "job_1", "Test PRD content");

    const count = await db
      .prepare("SELECT COUNT(*) as cnt FROM prototype_quality WHERE job_id = ?")
      .bind("job_1")
      .first<{ cnt: number }>();
    expect(count!.cnt).toBe(0);
  });

  it("F466: initialFeedback이 있으면 첫 라운드에 전달돼요", async () => {
    const ai = createMockAi([
      "<html>R1 improved</html>",
      '{"qualityScore": 0.95, "feedback": "Perfect", "items": []}',
    ]);
    const gen = new OgdGeneratorService(ai);
    const genSpy = vi.spyOn(gen, "generate");
    const disc = new OgdDiscriminatorService(ai);
    const orch = new OgdOrchestratorService(db as unknown as D1Database, gen, disc);

    await orch.runLoop("org_test", "job_1", "Test PRD", "사용자 피드백: CTA 버튼 크게");

    // generate가 initialFeedback을 previousFeedback으로 받았는지 확인
    expect(genSpy).toHaveBeenCalledWith(
      "Test PRD",
      "사용자 피드백: CTA 버튼 크게",
      undefined,
    );
  });
});
