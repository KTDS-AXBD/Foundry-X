import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DiscoveryStageService } from "../core/discovery/services/discovery-stage-service.js";
import { DISCOVERY_STAGES } from "../core/discovery/schemas/discovery-stage.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'field',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_item_discovery_stages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('2-0','2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, stage)
  );
`;

function getDb(): D1Database {
  const mockDb = createMockD1();
  void mockDb.exec(TABLES_SQL);
  void mockDb.exec(
    "INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item-1', 'org-1', 'Test Item', 'user-1')",
  );
  return mockDb as unknown as D1Database;
}

describe("DiscoveryStageService (F263)", () => {
  let db: D1Database;
  let service: DiscoveryStageService;

  beforeEach(() => {
    db = getDb();
    service = new DiscoveryStageService(db);
  });

  describe("DISCOVERY_STAGES 상수", () => {
    it("11개 단계 정의", () => {
      expect(DISCOVERY_STAGES).toHaveLength(11);
      expect(DISCOVERY_STAGES[0]).toBe("2-0");
      expect(DISCOVERY_STAGES[10]).toBe("2-10");
    });
  });

  describe("initStages", () => {
    it("11개 단계를 pending 상태로 초기화", async () => {
      await service.initStages("item-1", "org-1");
      const progress = await service.getProgress("item-1", "org-1");
      expect(progress.stages).toHaveLength(11);
      expect(progress.stages.every((s) => s.status === "pending")).toBe(true);
      expect(progress.completedCount).toBe(0);
      expect(progress.totalCount).toBe(11);
    });

    it("중복 초기화 시 기존 데이터 유지 (INSERT OR IGNORE)", async () => {
      await service.initStages("item-1", "org-1");
      await service.updateStage("item-1", "org-1", "2-0", "completed");
      await service.initStages("item-1", "org-1"); // 재초기화
      const progress = await service.getProgress("item-1", "org-1");
      const stage0 = progress.stages.find((s) => s.stage === "2-0");
      expect(stage0?.status).toBe("completed"); // 기존 상태 유지
    });
  });

  describe("getProgress", () => {
    it("레코드 없으면 자동 초기화 후 반환", async () => {
      const progress = await service.getProgress("item-1", "org-1");
      expect(progress.stages).toHaveLength(11);
      expect(progress.currentStage).toBe("2-0"); // 첫 pending 단계
    });

    it("currentStage — in_progress가 있으면 해당 단계", async () => {
      await service.initStages("item-1", "org-1");
      await service.updateStage("item-1", "org-1", "2-0", "completed");
      await service.updateStage("item-1", "org-1", "2-1", "in_progress");
      const progress = await service.getProgress("item-1", "org-1");
      expect(progress.currentStage).toBe("2-1");
      expect(progress.completedCount).toBe(1);
    });

    it("단계 이름 매핑 확인", async () => {
      const progress = await service.getProgress("item-1", "org-1");
      expect(progress.stages[0]?.stageName).toBe("사업 아이템 분류");
      expect(progress.stages[1]?.stageName).toBe("레퍼런스 분석");
      expect(progress.stages[5]?.stageName).toBe("핵심 아이템 선정");
      expect(progress.stages[10]?.stageName).toBe("최종 보고서");
    });
  });

  describe("updateStage", () => {
    it("pending → in_progress: started_at 설정", async () => {
      await service.initStages("item-1", "org-1");
      await service.updateStage("item-1", "org-1", "2-0", "in_progress");
      const progress = await service.getProgress("item-1", "org-1");
      const stage0 = progress.stages.find((s) => s.stage === "2-0");
      expect(stage0?.status).toBe("in_progress");
      expect(stage0?.startedAt).toBeTruthy();
    });

    it("in_progress → completed: completed_at 설정", async () => {
      await service.initStages("item-1", "org-1");
      await service.updateStage("item-1", "org-1", "2-0", "in_progress");
      await service.updateStage("item-1", "org-1", "2-0", "completed");
      const progress = await service.getProgress("item-1", "org-1");
      const stage0 = progress.stages.find((s) => s.stage === "2-0");
      expect(stage0?.status).toBe("completed");
      expect(stage0?.completedAt).toBeTruthy();
    });

    it("초기화 안 된 상태에서 updateStage → 자동 초기화 후 갱신", async () => {
      await service.updateStage("item-1", "org-1", "2-3", "in_progress");
      const progress = await service.getProgress("item-1", "org-1");
      expect(progress.stages).toHaveLength(11);
      const stage3 = progress.stages.find((s) => s.stage === "2-3");
      expect(stage3?.status).toBe("in_progress");
    });

    it("skipped 상태로 변경 가능", async () => {
      await service.initStages("item-1", "org-1");
      await service.updateStage("item-1", "org-1", "2-1", "skipped");
      const progress = await service.getProgress("item-1", "org-1");
      const stage1 = progress.stages.find((s) => s.stage === "2-1");
      expect(stage1?.status).toBe("skipped");
    });
  });

  describe("completedCount 계산", () => {
    it("여러 단계 완료 시 정확히 카운트", async () => {
      await service.initStages("item-1", "org-1");
      await service.updateStage("item-1", "org-1", "2-0", "completed");
      await service.updateStage("item-1", "org-1", "2-1", "completed");
      await service.updateStage("item-1", "org-1", "2-2", "completed");
      const progress = await service.getProgress("item-1", "org-1");
      expect(progress.completedCount).toBe(3);
    });
  });
});
