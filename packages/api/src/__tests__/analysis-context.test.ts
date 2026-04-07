import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { AnalysisContextService } from "../core/discovery/services/analysis-context.js";
import { ANALYSIS_PATHS } from "../core/discovery/services/analysis-paths.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_analysis_contexts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    pm_skill TEXT NOT NULL,
    input_summary TEXT,
    output_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

let db: D1Database;

function getDb() {
  const mockDb = createMockD1();
  void mockDb.exec(TABLES_SQL);
  return mockDb as unknown as D1Database;
}

describe("AnalysisContextService (F184)", () => {
  let service: AnalysisContextService;

  beforeEach(() => {
    db = getDb();
    service = new AnalysisContextService(db);
  });

  it("save — 분석 컨텍스트 저장", async () => {
    const ctx = await service.save("item-1", {
      stepOrder: 1,
      pmSkill: "/market-scan",
      inputSummary: "시장 분석 요청",
      outputText: "TAM 500억, SAM 100억, SOM 30억",
    });
    expect(ctx.id).toBeTruthy();
    expect(ctx.bizItemId).toBe("item-1");
    expect(ctx.stepOrder).toBe(1);
    expect(ctx.pmSkill).toBe("/market-scan");
    expect(ctx.inputSummary).toBe("시장 분석 요청");
    expect(ctx.outputText).toContain("TAM");
  });

  it("getAll — step_order ASC 정렬", async () => {
    await service.save("item-1", { stepOrder: 3, pmSkill: "/strategy", outputText: "전략 결론" });
    await service.save("item-1", { stepOrder: 1, pmSkill: "/interview", outputText: "인터뷰 결과" });
    await service.save("item-1", { stepOrder: 2, pmSkill: "/market-scan", outputText: "시장 분석" });

    const contexts = await service.getAll("item-1");
    expect(contexts).toHaveLength(3);
    expect(contexts[0]!.stepOrder).toBe(1);
    expect(contexts[1]!.stepOrder).toBe(2);
    expect(contexts[2]!.stepOrder).toBe(3);
  });

  it("getUpToStep — 특정 단계까지만 조회", async () => {
    await service.save("item-1", { stepOrder: 1, pmSkill: "/interview", outputText: "결과 1" });
    await service.save("item-1", { stepOrder: 2, pmSkill: "/market-scan", outputText: "결과 2" });
    await service.save("item-1", { stepOrder: 3, pmSkill: "/strategy", outputText: "결과 3" });

    const contexts = await service.getUpToStep("item-1", 2);
    expect(contexts).toHaveLength(2);
    expect(contexts[1]!.stepOrder).toBe(2);
  });

  it("getAll — 아이템 간 격리", async () => {
    await service.save("item-1", { stepOrder: 1, pmSkill: "/interview", outputText: "결과 A" });
    await service.save("item-2", { stepOrder: 1, pmSkill: "/interview", outputText: "결과 B" });

    const contexts1 = await service.getAll("item-1");
    const contexts2 = await service.getAll("item-2");
    expect(contexts1).toHaveLength(1);
    expect(contexts2).toHaveLength(1);
  });

  it("getNextGuide — 컨텍스트 없을 때 첫 단계 안내", async () => {
    const path = ANALYSIS_PATHS.tech;
    const guide = await service.getNextGuide("item-1", path);

    expect(guide.currentStep).toBe(0);
    expect(guide.nextStep).toBeDefined();
    expect(guide.nextStep!.order).toBe(1);
    expect(guide.previousContexts).toHaveLength(0);
    expect(guide.isLastStep).toBe(false);
  });

  it("getNextGuide — step 2까지 완료 후 step 3 안내", async () => {
    await service.save("item-1", { stepOrder: 1, pmSkill: "/market-scan", outputText: "결과 1" });
    await service.save("item-1", { stepOrder: 2, pmSkill: "/brainstorm", outputText: "결과 2" });

    const path = ANALYSIS_PATHS.tech;
    const guide = await service.getNextGuide("item-1", path);

    expect(guide.currentStep).toBe(2);
    expect(guide.nextStep!.order).toBe(3);
    expect(guide.previousContexts).toHaveLength(2);
    expect(guide.completedCriteria.length).toBeGreaterThan(0);
  });

  it("getNextGuide — 마지막 단계 완료 시 isLastStep true", async () => {
    // tech path has 8 steps
    for (let i = 1; i <= 8; i++) {
      await service.save("item-1", { stepOrder: i, pmSkill: "/test", outputText: `결과 ${i}` });
    }

    const path = ANALYSIS_PATHS.tech;
    const guide = await service.getNextGuide("item-1", path);

    expect(guide.currentStep).toBe(8);
    expect(guide.isLastStep).toBe(true);
  });

  it("getNextGuide — skillGuide 포함", async () => {
    await service.save("item-1", { stepOrder: 1, pmSkill: "/none", outputText: "입력" });

    const path = ANALYSIS_PATHS.tech;
    const guide = await service.getNextGuide("item-1", path);

    // Step 2 of tech path uses /market-scan
    expect(guide.nextStep!.order).toBe(2);
    expect(guide.skillGuide).toBeDefined();
    expect(guide.skillGuide!.skill).toBe("/market-scan");
  });
});
