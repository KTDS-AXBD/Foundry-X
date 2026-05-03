// F534: StageRunnerService 메트릭 훅 TDD Red
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { StageRunnerService } from "../core/discovery/services/stage-runner-service.js";
import { DiagnosticCollector } from "../services/agent/diagnostic-collector.js";

const EXTRA_SCHEMA = `ALTER TABLE biz_items ADD COLUMN discovery_type TEXT;`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT, model TEXT NOT NULL DEFAULT 'test',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
  CREATE TABLE IF NOT EXISTS biz_item_discovery_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_discovery_stages_item_stage ON biz_item_discovery_stages(biz_item_id, stage);
  CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, decision TEXT NOT NULL, question TEXT, reason TEXT,
    decided_by TEXT NOT NULL DEFAULT 'system', decided_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, criterion_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', evidence TEXT, completed_at TEXT, updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_biz_discovery_criteria ON biz_discovery_criteria(biz_item_id, criterion_id);
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT, entered_by TEXT NOT NULL, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS agent_run_metrics (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, agent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0, cache_read_tokens INTEGER DEFAULT 0,
    rounds INTEGER DEFAULT 0, stop_reason TEXT, duration_ms INTEGER,
    error_msg TEXT, started_at TEXT NOT NULL, finished_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const SEED = `
  INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
  INSERT INTO users (id, email, name, created_at, updated_at)
    VALUES ('user1', 'test@test.com', 'Test', '2026-01-01', '2026-01-01');
  INSERT INTO biz_items (id, org_id, title, description, source, status, discovery_type, created_by, created_at, updated_at)
    VALUES ('biz1', 'org1', 'AI Chatbot', 'desc', 'discovery', 'analyzing', 'I', 'user1', '2026-01-01', '2026-01-01');
  INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, created_at, updated_at)
    VALUES ('s1', 'biz1', 'org1', '2-1', 'pending', '2026-01-01', '2026-01-01');
`;

const mockRunner = {
  type: "mock" as const,
  execute: async () => ({
    status: "success" as const,
    output: {
      analysis: JSON.stringify({
        summary: "AI 챗봇은 유망한 아이템입니다.",
        details: "시장 규모 5조원",
        confidence: 85,
      }),
    },
    tokensUsed: 500,
    model: "mock",
    duration: 100,
  }),
  isAvailable: async () => true,
  supportsTaskType: () => true,
};

describe("StageRunnerService 메트릭 기록 — F534", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(EXTRA_SCHEMA);
    (db as any).exec(SCHEMA);
    (db as any).exec(SEED);
    for (let i = 1; i <= 9; i++) {
      (db as any).exec(
        `INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at) VALUES ('c${i}', 'biz1', ${i}, 'pending', '2026-01-01')`,
      );
    }
  });

  it("DiagnosticCollector 주입 시 runStage() 후 agent_run_metrics 1건 이상 삽입", async () => {
    const diagnostics = new DiagnosticCollector(db as unknown as D1Database);
    const service = new StageRunnerService(
      db as unknown as D1Database,
      mockRunner as any,
      diagnostics,
    );

    await service.runStage("biz1", "org1", "2-1", "I");

    const { results } = await db
      .prepare("SELECT id FROM agent_run_metrics")
      .bind()
      .all();
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("DiagnosticCollector 미주입 시 기존 동작 유지 (에러 없이 실행)", async () => {
    const service = new StageRunnerService(
      db as unknown as D1Database,
      mockRunner as any,
    );

    const result = await service.runStage("biz1", "org1", "2-1", "I");
    expect(result.stage).toBe("2-1");
    expect(result.result.confidence).toBe(85);
  });

  it("메트릭 행의 agent_id가 discovery-stage-runner이어야 한다", async () => {
    const diagnostics = new DiagnosticCollector(db as unknown as D1Database);
    const service = new StageRunnerService(
      db as unknown as D1Database,
      mockRunner as any,
      diagnostics,
    );

    await service.runStage("biz1", "org1", "2-1", "I");

    const row = await db
      .prepare("SELECT agent_id FROM agent_run_metrics LIMIT 1")
      .bind()
      .first<{ agent_id: string }>();
    expect(row!.agent_id).toBe("discovery-stage-runner");
  });

  it("runner 실패 시에도 메트릭이 기록된다 (status=failed)", async () => {
    const failRunner = {
      ...mockRunner,
      execute: async () => ({
        status: "failed" as const,
        output: { analysis: "AI 분석 실패" },
        tokensUsed: 0,
        model: "mock",
        duration: 50,
      }),
    };

    const diagnostics = new DiagnosticCollector(db as unknown as D1Database);
    const service = new StageRunnerService(
      db as unknown as D1Database,
      failRunner as any,
      diagnostics,
    );

    await service.runStage("biz1", "org1", "2-1", "I");

    const row = await db
      .prepare("SELECT status FROM agent_run_metrics LIMIT 1")
      .bind()
      .first<{ status: string }>();
    expect(row!.status).toBe("failed");
  });
});
