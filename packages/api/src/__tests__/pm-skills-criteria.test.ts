import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PmSkillsCriteriaService, PM_SKILLS_CRITERIA } from "../services/pm-skills-criteria.js";

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
  CREATE TABLE IF NOT EXISTS pm_skills_criteria (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
    criterion_id INTEGER NOT NULL,
    skill TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    evidence TEXT,
    output_type TEXT,
    score INTEGER,
    completed_at TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(biz_item_id, criterion_id)
  );
`;

let db: D1Database;

function getDb() {
  const mockDb = createMockD1();
  void mockDb.exec(TABLES_SQL);
  void mockDb.exec("INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item-1', 'org-1', 'Test Item', 'user-1')");
  return mockDb as unknown as D1Database;
}

describe("PmSkillsCriteriaService (F194)", () => {
  let service: PmSkillsCriteriaService;

  beforeEach(() => {
    db = getDb();
    service = new PmSkillsCriteriaService(db);
  });

  it("PM_SKILLS_CRITERIA — 12개 정적 데이터", () => {
    expect(PM_SKILLS_CRITERIA).toHaveLength(12);
    expect(PM_SKILLS_CRITERIA[0]!.name).toBe("고객 인사이트");
    expect(PM_SKILLS_CRITERIA[11]!.name).toBe("실행 가능성");
  });

  it("PM_SKILLS_CRITERIA — 필수 기준 7개", () => {
    const required = PM_SKILLS_CRITERIA.filter(c => c.isRequired);
    expect(required).toHaveLength(7);
  });

  it("initialize — 12기준 행 생성", async () => {
    await service.initialize("item-1");
    const progress = await service.getAll("item-1");
    expect(progress.criteria).toHaveLength(12);
    expect(progress.pending).toBe(12);
    expect(progress.completed).toBe(0);
    expect(progress.gateStatus).toBe("blocked");
    expect(progress.total).toBe(12);
  });

  it("initialize — 멱등 (두 번 호출해도 중복 없음)", async () => {
    await service.initialize("item-1");
    await service.initialize("item-1");
    const progress = await service.getAll("item-1");
    expect(progress.criteria).toHaveLength(12);
  });

  it("initialize — skill 매핑 정확", async () => {
    await service.initialize("item-1");
    const progress = await service.getAll("item-1");
    const first = progress.criteria.find(c => c.criterionId === 1);
    expect(first?.skill).toBe("/interview");
    const crossVal = progress.criteria.find(c => c.criterionId === 11);
    expect(crossVal?.skill).toBe("cross-validation");
  });

  it("getAll — 미초기화 시 12 pending", async () => {
    const progress = await service.getAll("item-1");
    expect(progress.criteria).toHaveLength(12);
    expect(progress.pending).toBe(12);
    expect(progress.gateStatus).toBe("blocked");
  });

  it("update — 상태 변경 + evidence", async () => {
    await service.initialize("item-1");
    const updated = await service.update("item-1", 1, {
      status: "completed",
      evidence: "인터뷰 3건 완료",
    });
    expect(updated.status).toBe("completed");
    expect(updated.evidence).toBe("인터뷰 3건 완료");
    expect(updated.completedAt).toBeTruthy();
  });

  it("update — score 저장", async () => {
    await service.initialize("item-1");
    const updated = await service.update("item-1", 2, {
      status: "in_progress",
      score: 75,
    });
    expect(updated.score).toBe(75);
    expect(updated.status).toBe("in_progress");
  });

  it("update — in_progress 시 completedAt null", async () => {
    await service.initialize("item-1");
    const updated = await service.update("item-1", 1, { status: "in_progress" });
    expect(updated.completedAt).toBeNull();
  });

  it("checkGate — 초기 상태 blocked + requiredMissing 7", async () => {
    await service.initialize("item-1");
    const gate = await service.checkGate("item-1");
    expect(gate.gateStatus).toBe("blocked");
    expect(gate.completedCount).toBe(0);
    expect(gate.totalCount).toBe(12);
    expect(gate.requiredMissing).toBe(7);
    expect(gate.details).toHaveLength(12);
  });

  it("checkGate — 필수 7개 완료 → warning (8 미달)", async () => {
    await service.initialize("item-1");
    const requiredIds = PM_SKILLS_CRITERIA.filter(c => c.isRequired).map(c => c.id);
    for (const id of requiredIds) {
      await service.update("item-1", id, { status: "completed", evidence: "done" });
    }
    const gate = await service.checkGate("item-1");
    expect(gate.requiredMissing).toBe(0);
    expect(gate.completedCount).toBe(7);
    // 7 completed, requiredMissing=0 but completed < 8 → blocked
    expect(gate.gateStatus).toBe("blocked");
  });

  it("checkGate — 필수 7 + 선택 1 = 8 → warning", async () => {
    await service.initialize("item-1");
    const requiredIds = PM_SKILLS_CRITERIA.filter(c => c.isRequired).map(c => c.id);
    for (const id of requiredIds) {
      await service.update("item-1", id, { status: "completed", evidence: "done" });
    }
    // 선택 기준 1개 추가 완료
    await service.update("item-1", 6, { status: "completed", evidence: "done" });
    const gate = await service.checkGate("item-1");
    expect(gate.completedCount).toBe(8);
    expect(gate.gateStatus).toBe("warning");
  });

  it("checkGate — 10개 이상 완료 (필수 포함) → ready", async () => {
    await service.initialize("item-1");
    // 필수 7개 (1,2,3,4,5,11,12) + 선택 3개 (6,7,8) = 10개
    const toComplete = [1, 2, 3, 4, 5, 6, 7, 8, 11, 12];
    for (const id of toComplete) {
      await service.update("item-1", id, { status: "completed", evidence: "done" });
    }
    const gate = await service.checkGate("item-1");
    expect(gate.completedCount).toBe(10);
    expect(gate.gateStatus).toBe("ready");
  });

  it("checkGate — 필수 미완료 1개라도 있으면 blocked", async () => {
    await service.initialize("item-1");
    // 선택 기준 모두 완료 + 필수 6/7만 완료
    const requiredIds = PM_SKILLS_CRITERIA.filter(c => c.isRequired).map(c => c.id);
    for (const id of requiredIds.slice(0, 6)) {
      await service.update("item-1", id, { status: "completed", evidence: "done" });
    }
    for (const c of PM_SKILLS_CRITERIA.filter(c => !c.isRequired)) {
      await service.update("item-1", c.id, { status: "completed", evidence: "done" });
    }
    const gate = await service.checkGate("item-1");
    expect(gate.requiredMissing).toBe(1);
    expect(gate.gateStatus).toBe("blocked");
  });

  it("getAll — 카운트 정확성", async () => {
    await service.initialize("item-1");
    await service.update("item-1", 1, { status: "completed", evidence: "done" });
    await service.update("item-1", 2, { status: "in_progress" });
    await service.update("item-1", 3, { status: "needs_revision" });

    const progress = await service.getAll("item-1");
    expect(progress.completed).toBe(1);
    expect(progress.inProgress).toBe(1);
    expect(progress.needsRevision).toBe(1);
    expect(progress.pending).toBe(9);
  });

  it("각 기준에 outputType 존재", () => {
    for (const c of PM_SKILLS_CRITERIA) {
      expect(c.outputType).toBeTruthy();
    }
  });
});
