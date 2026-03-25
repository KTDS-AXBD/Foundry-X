import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";
import { PmSkillsCriteriaService, PM_SKILLS_CRITERIA } from "../../services/pm-skills-criteria.js";
import { PmSkillsModule, registerPmSkillsModule } from "../../services/pm-skills-module.js";
import { getAllMethodologies, recommendMethodology, clearRegistry } from "../../services/methodology-types.js";
import { detectEntryPoint, buildAnalysisSteps, getNextExecutableSkills } from "../../services/pm-skills-pipeline.js";
import { getSkillGuide } from "../../services/pm-skills-guide.js";
import { UpdatePmSkillsCriterionSchema } from "../../schemas/pm-skills.js";
import { BizItemService } from "../../services/biz-item-service.js";

const BIZ_ITEMS_DDL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'field',
    status TEXT NOT NULL DEFAULT 'draft',
    classification TEXT,
    starting_point_type TEXT,
    starting_point_result TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const PM_CRITERIA_DDL = `
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

let db: any;

function uid() {
  return `item-${Math.random().toString(36).slice(2, 10)}`;
}

async function insertBizItem(orgId: string, title: string, description?: string) {
  const id = uid();
  await db.prepare(
    `INSERT INTO biz_items (id, org_id, title, description, source, created_by) VALUES (?, ?, ?, ?, 'field', 'user-1')`,
  ).bind(id, orgId, title, description ?? null).run();
  return id;
}

beforeEach(async () => {
  db = createMockD1();
  await db.exec(BIZ_ITEMS_DDL);
  await db.exec(PM_CRITERIA_DDL);
  clearRegistry();
  registerPmSkillsModule();
});

describe("Methodology Routes (F193+F194)", () => {

  // ─── GET /methodologies ───

  describe("GET /methodologies — 방법론 목록", () => {
    it("등록된 방법론 반환", () => {
      const all = getAllMethodologies();
      expect(all.length).toBeGreaterThanOrEqual(1);
      const pmSkills = all.find(m => m.id === "pm-skills");
      expect(pmSkills).toBeDefined();
      expect(pmSkills!.name).toBe("PM Skills 기반 분석");
    });

    it("응답 형식 — id, name, description, version, isDefault 필드", () => {
      const all = getAllMethodologies();
      const mapped = all.map(m => ({
        id: m.id, name: m.name, description: m.description,
        version: m.version, isDefault: m.isDefault,
      }));
      expect(mapped[0]).toHaveProperty("id");
      expect(mapped[0]).toHaveProperty("name");
      expect(mapped[0]).toHaveProperty("isDefault");
    });
  });

  // ─── GET /methodologies/:id ───

  describe("GET /methodologies/:id — 방법론 상세", () => {
    it("pm-skills 상세 — criteria + reviewMethods", () => {
      const all = getAllMethodologies();
      const entry = all.find(m => m.id === "pm-skills");
      expect(entry).toBeDefined();

      const mod = entry!.module;
      const criteria = mod.getCriteria();
      expect(criteria).toHaveLength(12);

      const reviews = mod.getReviewMethods();
      expect(reviews).toHaveLength(2);
    });

    it("미등록 방법론 → 없음", () => {
      const all = getAllMethodologies();
      const entry = all.find(m => m.id === "nonexistent");
      expect(entry).toBeUndefined();
    });
  });

  // ─── GET /methodologies/recommend/:bizItemId ───

  describe("GET /methodologies/recommend/:bizItemId — 추천", () => {
    it("아이템 기반 방법론 추천", async () => {
      const recs = recommendMethodology({
        title: "새로운 AI 분석 기획",
        description: null,
        source: "field",
      });
      expect(recs.length).toBeGreaterThanOrEqual(1);
      expect(recs[0]).toHaveProperty("id");
      expect(recs[0]).toHaveProperty("score");
    });

    it("미존재 아이템 시뮬레이션 — BizItemService getById", async () => {
      const bizService = new BizItemService(db as unknown as D1Database);
      const item = await bizService.getById("org_test", "nonexistent");
      expect(item).toBeNull();
    });
  });

  // ─── POST /methodologies/pm-skills/classify/:bizItemId ───

  describe("POST /methodologies/pm-skills/classify — 분류", () => {
    it("정상 분류 + 기준 초기화", async () => {
      const bizItemId = await insertBizItem("org_test", "새로운 AI 솔루션 발굴");

      const module = new PmSkillsModule();
      const classification = await module.classifyItem({
        title: "새로운 AI 솔루션 발굴", description: null, source: "field",
      });
      expect(classification.entryPoint).toBe("discovery");
      expect(classification.methodologyId).toBe("pm-skills");

      const criteriaService = new PmSkillsCriteriaService(db as unknown as D1Database);
      await criteriaService.initialize(bizItemId);

      const progress = await criteriaService.getAll(bizItemId);
      expect(progress.criteria).toHaveLength(12);
      expect(progress.pending).toBe(12);
    });

    it("미존재 아이템 → BIZ_ITEM_NOT_FOUND 시뮬레이션", async () => {
      const bizService = new BizItemService(db as unknown as D1Database);
      const item = await bizService.getById("org_test", "ghost");
      expect(item).toBeNull();
    });
  });

  // ─── GET /methodologies/pm-skills/analysis-steps/:bizItemId ───

  describe("GET /methodologies/pm-skills/analysis-steps — 분석 단계", () => {
    it("discovery 진입 — 9단계 반환", async () => {
      const entryPoint = detectEntryPoint({ title: "새 아이디어", description: null });
      expect(entryPoint).toBe("discovery");

      const steps = buildAnalysisSteps(entryPoint);
      expect(steps).toHaveLength(9);

      const nextSkills = getNextExecutableSkills(entryPoint, []);
      expect(nextSkills.length).toBeGreaterThan(0);
    });

    it("완료된 스킬 반영", async () => {
      const steps = buildAnalysisSteps("discovery", ["/interview", "/market-scan"]);
      expect(steps[0]!.isCompleted).toBe(true); // /interview
      expect(steps[2]!.isCompleted).toBe(true); // /market-scan
    });
  });

  // ─── GET /methodologies/pm-skills/skill-guide/:skill ───

  describe("GET /methodologies/pm-skills/skill-guide — 가이드", () => {
    it("존재하는 스킬 가이드 반환", () => {
      const guide = getSkillGuide("/interview");
      expect(guide).toBeDefined();
      expect(guide!.name).toBe("고객 인터뷰 설계 + 분석");
    });

    it("미존재 스킬 → undefined", () => {
      const guide = getSkillGuide("/nonexistent");
      expect(guide).toBeUndefined();
    });
  });

  // ─── GET /methodologies/pm-skills/criteria/:bizItemId ───

  describe("GET /methodologies/pm-skills/criteria — 기준 목록", () => {
    it("초기화 후 12기준 반환", async () => {
      const bizItemId = await insertBizItem("org_test", "Test");
      const service = new PmSkillsCriteriaService(db as unknown as D1Database);
      await service.initialize(bizItemId);

      const progress = await service.getAll(bizItemId);
      expect(progress.total).toBe(12);
      expect(progress.criteria).toHaveLength(12);
      expect(progress.gateStatus).toBe("blocked");
    });
  });

  // ─── POST /methodologies/pm-skills/criteria/:bizItemId/:criterionId ───

  describe("POST /methodologies/pm-skills/criteria — 기준 갱신", () => {
    it("정상 갱신", async () => {
      const bizItemId = await insertBizItem("org_test", "Test");
      const service = new PmSkillsCriteriaService(db as unknown as D1Database);
      await service.initialize(bizItemId);

      const updated = await service.update(bizItemId, 1, {
        status: "completed",
        evidence: "인터뷰 완료",
      });
      expect(updated.status).toBe("completed");
      expect(updated.evidence).toBe("인터뷰 완료");
    });

    it("Zod 검증 — 유효한 입력", () => {
      const parsed = UpdatePmSkillsCriterionSchema.safeParse({
        status: "completed",
        evidence: "test",
        score: 85,
      });
      expect(parsed.success).toBe(true);
    });

    it("Zod 검증 — 잘못된 status", () => {
      const parsed = UpdatePmSkillsCriterionSchema.safeParse({
        status: "invalid",
      });
      expect(parsed.success).toBe(false);
    });

    it("Zod 검증 — score 범위 초과", () => {
      const parsed = UpdatePmSkillsCriterionSchema.safeParse({
        status: "completed",
        score: 150,
      });
      expect(parsed.success).toBe(false);
    });

    it("Zod 검증 — score 음수", () => {
      const parsed = UpdatePmSkillsCriterionSchema.safeParse({
        status: "completed",
        score: -1,
      });
      expect(parsed.success).toBe(false);
    });
  });

  // ─── GET /methodologies/pm-skills/gate/:bizItemId ───

  describe("GET /methodologies/pm-skills/gate — 게이트 판정", () => {
    it("초기 — blocked", async () => {
      const bizItemId = await insertBizItem("org_test", "Test");
      const service = new PmSkillsCriteriaService(db as unknown as D1Database);
      await service.initialize(bizItemId);

      const gate = await service.checkGate(bizItemId);
      expect(gate.gateStatus).toBe("blocked");
      expect(gate.totalCount).toBe(12);
      expect(gate.requiredMissing).toBe(7);
    });

    it("전체 완료 — ready", async () => {
      const bizItemId = await insertBizItem("org_test", "Test");
      const service = new PmSkillsCriteriaService(db as unknown as D1Database);
      await service.initialize(bizItemId);

      for (let i = 1; i <= 12; i++) {
        await service.update(bizItemId, i, { status: "completed", evidence: "done" });
      }
      const gate = await service.checkGate(bizItemId);
      expect(gate.gateStatus).toBe("ready");
      expect(gate.completedCount).toBe(12);
      expect(gate.requiredMissing).toBe(0);
    });
  });
});
