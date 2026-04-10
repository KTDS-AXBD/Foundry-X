import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { StageRunnerService } from "../core/discovery/services/stage-runner-service.js";

// createMockD1()에 내장된 테이블과 겹치지 않는 추가 스키마만 정의
// biz_items에 discovery_type 컬럼 추가 (mock-d1 기본 스키마에 없음)
const EXTRA_SCHEMA = `
  ALTER TABLE biz_items ADD COLUMN discovery_type TEXT;
`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL, skill_id TEXT NOT NULL,
    stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, input_text TEXT NOT NULL,
    output_text TEXT, model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20250714',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
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
    status TEXT NOT NULL DEFAULT 'pending', evidence TEXT, completed_at TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_biz_discovery_criteria ON biz_discovery_criteria(biz_item_id, criterion_id);
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT, entered_by TEXT NOT NULL, notes TEXT
  );
`;

const SEED = `
  INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
  INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Test User', '2026-01-01', '2026-01-01');
  INSERT INTO biz_items (id, org_id, title, description, source, status, discovery_type, created_by, created_at, updated_at)
    VALUES ('biz1', 'org1', 'AI Chatbot', 'AI 고객 지원 챗봇', 'discovery', 'analyzing', 'I', 'user1', '2026-01-01', '2026-01-01');
  INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, created_at, updated_at) VALUES ('s1', 'biz1', 'org1', '2-1', 'pending', '2026-01-01', '2026-01-01');
  INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, created_at, updated_at) VALUES ('s2', 'biz1', 'org1', '2-2', 'pending', '2026-01-01', '2026-01-01');
  INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status, created_at, updated_at) VALUES ('s3', 'biz1', 'org1', '2-3', 'pending', '2026-01-01', '2026-01-01');
`;

// Mock AgentRunner
const mockRunner = {
  execute: async () => ({
    output: {
      analysis: JSON.stringify({
        summary: "AI 챗봇은 고객 지원 자동화에 유망한 사업 아이템입니다.",
        details: "시장 규모 연 5조원, 성장률 25%",
        confidence: 85,
      }),
    },
    metrics: { durationMs: 100, tokensUsed: 500 },
  }),
};

function initCriteria(db: any) {
  for (let i = 1; i <= 9; i++) {
    (db as any).exec(`
      INSERT OR IGNORE INTO biz_discovery_criteria (id, biz_item_id, criterion_id, status, updated_at)
      VALUES ('c${i}', 'biz1', ${i}, 'pending', '2026-01-01');
    `);
  }
}

describe("StageRunnerService (F485+F486)", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: StageRunnerService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(EXTRA_SCHEMA);
    (db as any).exec(SCHEMA);
    (db as any).exec(SEED);
    service = new StageRunnerService(db as unknown as D1Database, mockRunner as any);
  });

  describe("F485: runStage — bd_artifacts 저장", () => {
    it("AI 결과를 bd_artifacts에 저장해야 한다", async () => {
      const result = await service.runStage("biz1", "org1", "2-1", "I");

      expect(result.stage).toBe("2-1");
      expect(result.result.summary).toContain("AI 챗봇");
      expect(result.result.confidence).toBe(85);

      // bd_artifacts에 저장 확인
      const artifact = await db.prepare(
        "SELECT * FROM bd_artifacts WHERE biz_item_id = ? AND skill_id = ?",
      ).bind("biz1", "discovery-2-1").first();

      expect(artifact).toBeTruthy();
      expect((artifact as any).version).toBe(1);
      expect((artifact as any).status).toBe("completed");
    });

    it("runner에 systemPromptOverride({summary,details,confidence} 스키마)를 전달해야 한다", async () => {
      let capturedRequest: any = null;
      const capturingRunner = {
        execute: async (req: any) => {
          capturedRequest = req;
          return mockRunner.execute();
        },
      };
      const svc = new StageRunnerService(db as unknown as D1Database, capturingRunner as any);
      await svc.runStage("biz1", "org1", "2-1", "I");

      expect(capturedRequest).toBeTruthy();
      const override = capturedRequest.context.systemPromptOverride;
      expect(override).toBeTruthy();
      expect(override).toContain("summary");
      expect(override).toContain("details");
      expect(override).toContain("confidence");
      // "analysis" 필드 언급이 없어야 함 (custom 스키마이므로)
      expect(override).not.toContain('"analysis"');
    });

    it("재실행 시 version이 증가해야 한다", async () => {
      await service.runStage("biz1", "org1", "2-1", "I");
      await service.runStage("biz1", "org1", "2-1", "I", "더 자세하게 분석해주세요");

      const { results } = await db.prepare(
        "SELECT version FROM bd_artifacts WHERE biz_item_id = ? AND skill_id = ? ORDER BY version",
      ).bind("biz1", "discovery-2-1").all();

      expect(results).toHaveLength(2);
      expect((results[0] as any).version).toBe(1);
      expect((results[1] as any).version).toBe(2);
    });
  });

  describe("F485: getStageResult — 결과 조회", () => {
    it("저장된 결과를 조회해야 한다", async () => {
      await service.runStage("biz1", "org1", "2-1", "I");

      const result = await service.getStageResult("biz1", "org1", "2-1");

      expect(result).toBeTruthy();
      expect(result!.stage).toBe("2-1");
      expect(result!.result.summary).toContain("AI 챗봇");
      expect(result!.intensity).toBe("light"); // I 유형 2-1은 light (ANALYSIS_PATH_MAP 참조)
    });

    it("결과가 없으면 null을 반환해야 한다", async () => {
      const result = await service.getStageResult("biz1", "org1", "2-1");
      expect(result).toBeNull();
    });

    it("viability decision이 있으면 함께 반환해야 한다", async () => {
      initCriteria(db);
      await service.runStage("biz1", "org1", "2-1", "I");
      await service.confirmStage("biz1", "org1", "2-1", "go", "좋은 방향이에요");

      const result = await service.getStageResult("biz1", "org1", "2-1");

      expect(result!.viabilityDecision).toBe("go");
      expect(result!.feedback).toBe("좋은 방향이에요");
    });
  });

  describe("F486: confirmStage — criteria 자동 갱신", () => {
    beforeEach(() => {
      initCriteria(db as any);
    });

    it("go 결정 시 관련 criteria를 completed로 갱신해야 한다", async () => {
      await service.runStage("biz1", "org1", "2-1", "I");
      await service.confirmStage("biz1", "org1", "2-1", "go");

      // 2-1 → criterion 1 (문제/고객 정의)
      const criterion = await db.prepare(
        "SELECT status, evidence FROM biz_discovery_criteria WHERE biz_item_id = ? AND criterion_id = ?",
      ).bind("biz1", 1).first();

      expect((criterion as any).status).toBe("completed");
      expect((criterion as any).evidence).toContain("2-1 단계 분석 완료");
    });

    it("stop 결정 시 criteria를 갱신하지 않아야 한다", async () => {
      await service.runStage("biz1", "org1", "2-1", "I");
      await service.confirmStage("biz1", "org1", "2-1", "stop");

      const criterion = await db.prepare(
        "SELECT status FROM biz_discovery_criteria WHERE biz_item_id = ? AND criterion_id = ?",
      ).bind("biz1", 1).first();

      expect((criterion as any).status).toBe("pending");
    });

    it("2-3 완료 시 criteria 3과 8 모두 갱신해야 한다", async () => {
      await service.runStage("biz1", "org1", "2-3", "I");
      await service.confirmStage("biz1", "org1", "2-3", "go");

      const c3 = await db.prepare(
        "SELECT status FROM biz_discovery_criteria WHERE biz_item_id = ? AND criterion_id = ?",
      ).bind("biz1", 3).first();
      const c8 = await db.prepare(
        "SELECT status FROM biz_discovery_criteria WHERE biz_item_id = ? AND criterion_id = ?",
      ).bind("biz1", 8).first();

      expect((c3 as any).status).toBe("completed");
      expect((c8 as any).status).toBe("completed");
    });

    it("STAGE_CRITERIA_MAP에 없는 단계는 criteria를 갱신하지 않아야 한다", async () => {
      // 2-9는 매핑이 없음
      (db as any).exec(`
        INSERT INTO biz_item_discovery_stages (id, biz_item_id, org_id, stage, status)
        VALUES ('s9', 'biz1', 'org1', '2-9', 'pending');
      `);

      await service.confirmStage("biz1", "org1", "2-9", "go");

      // 모든 criteria가 여전히 pending
      const { results } = await db.prepare(
        "SELECT status FROM biz_discovery_criteria WHERE biz_item_id = ? AND status = 'completed'",
      ).bind("biz1").all();

      expect(results).toHaveLength(0);
    });
  });

  describe("F494: confirmStage — pipeline_stages DISCOVERY→FORMALIZATION 자동 전진", () => {
    beforeEach(() => {
      initCriteria(db as any);
      // DISCOVERY 단계 진입 상태 seed
      (db as any).exec(`
        INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at, entered_by)
        VALUES ('ps-discovery', 'biz1', 'org1', 'DISCOVERY', '2026-01-01T00:00:00Z', 'system');
      `);
    });

    async function confirmAllNineCriteria() {
      // 2-1~2-8 완료 → criteria 1~9 모두 completed
      for (const stage of ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8"]) {
        await service.confirmStage("biz1", "org1", stage, "go");
      }
    }

    it("9/9 criteria 완료 시 DISCOVERY exit + FORMALIZATION enter", async () => {
      await confirmAllNineCriteria();

      const { results } = await db.prepare(
        "SELECT stage, exited_at FROM pipeline_stages WHERE biz_item_id = ? ORDER BY entered_at",
      ).bind("biz1").all();

      expect(results).toHaveLength(2);
      expect((results[0] as any).stage).toBe("DISCOVERY");
      expect((results[0] as any).exited_at).not.toBeNull();
      expect((results[1] as any).stage).toBe("FORMALIZATION");
      expect((results[1] as any).exited_at).toBeNull();
    });

    it("일부 criteria만 완료 시 pipeline 전진 안함", async () => {
      await service.confirmStage("biz1", "org1", "2-1", "go");
      await service.confirmStage("biz1", "org1", "2-2", "go");

      const { results } = await db.prepare(
        "SELECT stage FROM pipeline_stages WHERE biz_item_id = ?",
      ).bind("biz1").all();

      expect(results).toHaveLength(1);
      expect((results[0] as any).stage).toBe("DISCOVERY");
    });

    it("DISCOVERY 이미 exit 된 상태면 중복 전진 안함 (멱등성)", async () => {
      await confirmAllNineCriteria();
      // 한 번 더 호출 (이미 FORMALIZATION으로 전진한 상태)
      await service.confirmStage("biz1", "org1", "2-1", "go");

      const { results } = await db.prepare(
        "SELECT stage FROM pipeline_stages WHERE biz_item_id = ? ORDER BY entered_at",
      ).bind("biz1").all();

      expect(results).toHaveLength(2); // 여전히 2개 (중복 INSERT 없음)
    });

    it("stop 결정 시 pipeline 전진 안함", async () => {
      await service.confirmStage("biz1", "org1", "2-1", "stop");

      const { results } = await db.prepare(
        "SELECT stage FROM pipeline_stages WHERE biz_item_id = ?",
      ).bind("biz1").all();

      expect(results).toHaveLength(1);
      expect((results[0] as any).stage).toBe("DISCOVERY");
    });
  });
});
