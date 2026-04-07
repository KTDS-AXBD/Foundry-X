/**
 * Methodology Routes — 레지스트리 조회 + 추천 + 선택 관리 + pm-skills 분석/기준/게이트
 * Sprint 59 F191 + Sprint 60 F193+F194+F195
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { MethodologyRegistry } from "../services/methodology-registry.js";
import { BdpMethodologyModule } from "../services/bdp-methodology-module.js";
import { SelectMethodologySchema } from "../schemas/methodology.js";
import type { BizItemContext } from "../services/methodology-module.js";
import type { MethodologySelection } from "../services/methodology-module.js";
import { PmSkillsCriteriaService } from "../../discovery/services/pm-skills-criteria.js";
import { PmSkillsModule } from "../../../services/pm-skills-module.js";
import { buildAnalysisSteps, getNextExecutableSkills, detectEntryPoint } from "../../../services/pm-skills-pipeline.js";
import { getSkillGuide } from "../../../services/pm-skills-guide.js";
import { getAllMethodologies, recommendMethodology } from "../services/methodology-types.js";
import { UpdatePmSkillsCriterionSchema } from "../../../schemas/pm-skills.js";
import { BizItemService } from "../../discovery/services/biz-item-service.js";
import type { EntryPoint } from "../../../services/pm-skills-pipeline.js";

// ─── Registry 초기화: BDP 모듈 자동 등록 ───
const registry = MethodologyRegistry.getInstance();
if (!registry.get("bdp")) {
  registry.register(new BdpMethodologyModule());
}

export const methodologyRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

function generateId(): string {
  return crypto.randomUUID();
}

function toSelection(row: Record<string, unknown>): MethodologySelection {
  return {
    id: row.id as string,
    bizItemId: row.biz_item_id as string,
    methodologyId: row.methodology_id as string,
    matchScore: row.match_score as number | null,
    selectedBy: row.selected_by as "auto" | "manual",
    isCurrent: (row.is_current as number) === 1,
    createdAt: row.created_at as string,
  };
}

// ─── GET /methodologies — 등록된 방법론 목록 ───

methodologyRoute.get("/methodologies", (c) => {
  const registry = MethodologyRegistry.getInstance();
  return c.json(registry.getAllMeta());
});

// ─── GET /methodologies/:id — 방법론 상세 (criteria, reviewMethods 포함) ───

methodologyRoute.get("/methodologies/:id", (c) => {
  const registry = MethodologyRegistry.getInstance();
  const module = registry.get(c.req.param("id"));
  if (!module) {
    return c.json({ error: "Methodology not found" }, 404);
  }
  return c.json({
    id: module.id,
    name: module.name,
    description: module.description,
    version: module.version,
    criteria: module.getCriteria(),
    reviewMethods: module.getReviewMethods(),
  });
});

// ─── POST /biz-items/:itemId/methodology/recommend — 추천 ───

methodologyRoute.post("/biz-items/:itemId/methodology/recommend", async (c) => {
  const itemId = c.req.param("itemId");
  const db = c.env.DB;

  const item = await db
    .prepare("SELECT id, title, description, source, status FROM biz_items WHERE id = ?")
    .bind(itemId)
    .first<{ id: string; title: string; description: string | null; source: string; status: string }>();

  if (!item) {
    return c.json({ error: "Biz item not found" }, 404);
  }

  // 보충: classification + starting_point
  const cls = await db
    .prepare("SELECT item_type, confidence, analysis_weights FROM biz_item_classifications WHERE biz_item_id = ?")
    .bind(itemId)
    .first<{ item_type: string; confidence: number; analysis_weights: string }>();

  const sp = await db
    .prepare("SELECT starting_point FROM biz_starting_points WHERE biz_item_id = ?")
    .bind(itemId)
    .first<{ starting_point: string }>();

  const context: BizItemContext = {
    id: item.id,
    title: item.title,
    description: item.description,
    source: item.source,
    classification: cls
      ? {
          itemType: cls.item_type,
          confidence: cls.confidence,
          analysisWeights: JSON.parse(cls.analysis_weights || "{}"),
        }
      : null,
    startingPoint: sp?.starting_point ?? null,
  };

  const registry = MethodologyRegistry.getInstance();
  const recommendations = await registry.recommend(context);
  return c.json({ recommendations });
});

// ─── POST /biz-items/:itemId/methodology/select — 방법론 선택 ───

methodologyRoute.post("/biz-items/:itemId/methodology/select", async (c) => {
  const itemId = c.req.param("itemId");
  const db = c.env.DB;

  const body = await c.req.json();
  const parsed = SelectMethodologySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // 아이템 존재 확인
  const item = await db
    .prepare("SELECT id FROM biz_items WHERE id = ?")
    .bind(itemId)
    .first();
  if (!item) {
    return c.json({ error: "Biz item not found" }, 404);
  }

  // 방법론 존재 확인
  const registry = MethodologyRegistry.getInstance();
  const module = registry.get(parsed.data.methodologyId);
  if (!module) {
    return c.json({ error: "Methodology not found" }, 404);
  }

  // 기존 선택을 비활성화
  await db
    .prepare("UPDATE methodology_selections SET is_current = 0 WHERE biz_item_id = ? AND is_current = 1")
    .bind(itemId)
    .run();

  // 새 선택 UPSERT
  const id = generateId();
  await db
    .prepare(
      `INSERT INTO methodology_selections (id, biz_item_id, methodology_id, selected_by, is_current, created_at)
       VALUES (?, ?, ?, 'manual', 1, datetime('now'))
       ON CONFLICT(biz_item_id, methodology_id)
       DO UPDATE SET is_current = 1, selected_by = 'manual'`,
    )
    .bind(id, itemId, parsed.data.methodologyId)
    .run();

  // 방금 저장한 row 반환
  const row = await db
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? AND is_current = 1 ORDER BY created_at DESC LIMIT 1")
    .bind(itemId)
    .first();

  return c.json(toSelection(row as Record<string, unknown>));
});

// ─── GET /biz-items/:itemId/methodology — 현재 선택 ───

methodologyRoute.get("/biz-items/:itemId/methodology", async (c) => {
  const itemId = c.req.param("itemId");
  const row = await c.env.DB
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? AND is_current = 1 LIMIT 1")
    .bind(itemId)
    .first();

  if (!row) {
    return c.json({ selection: null });
  }
  return c.json({ selection: toSelection(row as Record<string, unknown>) });
});

// ─── GET /biz-items/:itemId/methodology/history — 선택 이력 ───

methodologyRoute.get("/biz-items/:itemId/methodology/history", async (c) => {
  const itemId = c.req.param("itemId");
  const { results } = await c.env.DB
    .prepare("SELECT * FROM methodology_selections WHERE biz_item_id = ? ORDER BY created_at DESC")
    .bind(itemId)
    .all();

  return c.json({ history: (results ?? []).map((r) => toSelection(r as Record<string, unknown>)) });
});

// ═══════════════════════════════════════════════════════════════
// Sprint 60: pm-skills 방법론 라우트 (F193+F194+F195)
// ═══════════════════════════════════════════════════════════════

// ─── GET /methodologies/recommend/:bizItemId — 방법론 추천 (F195) ───

methodologyRoute.get("/methodologies/recommend/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const recommendations = recommendMethodology({
    title: item.title,
    description: item.description,
    source: item.source,
    classification: item.classification ?? undefined,
  });

  return c.json({ recommendations });
});

// ─── POST /methodologies/pm-skills/classify/:bizItemId — 분류 (F193) ───

methodologyRoute.post("/methodologies/pm-skills/classify/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const module = new PmSkillsModule();
  const classification = await module.classifyItem({
    title: item.title,
    description: item.description,
    source: item.source,
  });

  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  await criteriaService.initialize(bizItemId);

  return c.json({ classification });
});

// ─── GET /methodologies/pm-skills/analysis-steps/:bizItemId — 분석 단계 (F193) ───

methodologyRoute.get("/methodologies/pm-skills/analysis-steps/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const entryPoint = detectEntryPoint(item);
  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  const progress = await criteriaService.getAll(bizItemId);

  const completedSkills = progress.criteria
    .filter(c => c.status === "completed")
    .map(c => c.skill);

  const steps = buildAnalysisSteps(entryPoint, completedSkills);
  const nextSkills = getNextExecutableSkills(entryPoint, completedSkills);

  return c.json({ entryPoint, steps, nextExecutableSkills: nextSkills });
});

// ─── GET /methodologies/pm-skills/skill-guide/:skill — 스킬 가이드 (F193) ───

methodologyRoute.get("/methodologies/pm-skills/skill-guide/:skill", async (c) => {
  const skill = "/" + c.req.param("skill");
  const guide = getSkillGuide(skill);
  if (!guide) return c.json({ error: "SKILL_NOT_FOUND" }, 404);

  return c.json({ guide });
});

// ─── GET /methodologies/pm-skills/criteria/:bizItemId — 기준 목록 (F194) ───

methodologyRoute.get("/methodologies/pm-skills/criteria/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  const progress = await criteriaService.getAll(bizItemId);

  return c.json(progress);
});

// ─── POST /methodologies/pm-skills/criteria/:bizItemId/:criterionId — 기준 갱신 (F194) ───

methodologyRoute.post("/methodologies/pm-skills/criteria/:bizItemId/:criterionId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");
  const criterionId = parseInt(c.req.param("criterionId"), 10);

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  if (isNaN(criterionId) || criterionId < 1 || criterionId > 12) {
    return c.json({ error: "INVALID_CRITERION_ID" }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdatePmSkillsCriterionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "VALIDATION_ERROR", details: parsed.error.issues }, 400);

  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  const criterion = await criteriaService.update(bizItemId, criterionId, parsed.data);

  return c.json({ criterion });
});

// ─── GET /methodologies/pm-skills/gate/:bizItemId — 게이트 판정 (F194) ───

methodologyRoute.get("/methodologies/pm-skills/gate/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, bizItemId);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const criteriaService = new PmSkillsCriteriaService(c.env.DB);
  const gate = await criteriaService.checkGate(bizItemId);

  return c.json(gate);
});
