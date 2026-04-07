import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PmSkillsModule, registerPmSkillsModule } from "../services/pm-skills-module.js";
import { clearRegistry, getAllMethodologies } from "../core/offering/services/methodology-types.js";

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

describe("PmSkillsModule (F193)", () => {
  let module: PmSkillsModule;

  beforeEach(() => {
    module = new PmSkillsModule();
    clearRegistry();
  });

  it("모듈 메타 정보", () => {
    expect(module.id).toBe("pm-skills");
    expect(module.name).toBe("PM Skills 기반 분석");
    expect(module.version).toBe("1.0.0");
  });

  it("classifyItem — discovery 진입", async () => {
    const result = await module.classifyItem({
      title: "새로운 AI 솔루션 아이디어 발굴",
      description: null,
      source: "field",
    });
    expect(result.methodologyId).toBe("pm-skills");
    expect(result.entryPoint).toBe("discovery");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
    expect(result.metadata).toHaveProperty("skillScores");
    expect(result.metadata).toHaveProperty("recommendedSkills");
  });

  it("classifyItem — validation 진입", async () => {
    const result = await module.classifyItem({
      title: "가설 검증 프로젝트",
      description: "기존 MVP 피봇 여부 확인",
      source: "internal",
    });
    expect(result.entryPoint).toBe("validation");
  });

  it("getAnalysisSteps — discovery 9단계", async () => {
    const classification = await module.classifyItem({
      title: "새로운 AI 솔루션 아이디어 발굴", description: null, source: "field",
    });
    const steps = module.getAnalysisSteps(classification);
    expect(steps.length).toBe(9);
    expect(steps[0]!.order).toBe(1);
    expect(steps[0]!.skills.length).toBeGreaterThan(0);
  });

  it("getCriteria — 12기준", () => {
    const criteria = module.getCriteria();
    expect(criteria).toHaveLength(12);
  });

  it("checkGate — DB 연동", async () => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    void mockDb.exec("INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item-1', 'org-1', 'Test', 'u-1')");

    const gate = await module.checkGate("item-1", mockDb as unknown as D1Database);
    expect(gate.gateStatus).toBe("blocked");
    expect(gate.totalCount).toBe(12);
  });

  it("getReviewMethods — 2개", () => {
    const methods = module.getReviewMethods();
    expect(methods).toHaveLength(2);
    expect(methods[0]!.id).toBe("cross-validation");
  });

  it("matchScore — 기본 점수", () => {
    const score = module.matchScore({
      title: "일반 프로젝트",
      description: null,
      source: "field",
    });
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("matchScore — 분류 없으면 보너스", () => {
    const withoutClass = module.matchScore({ title: "프로젝트", description: null, source: "field" });
    const withClass = module.matchScore({ title: "프로젝트", description: null, source: "field", classification: { itemType: "A" } });
    expect(withoutClass).toBeGreaterThan(withClass);
  });

  it("registerPmSkillsModule — 레지스트리 등록", () => {
    registerPmSkillsModule();
    const all = getAllMethodologies();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe("pm-skills");
    expect(all[0]!.isDefault).toBe(false);
  });
});
