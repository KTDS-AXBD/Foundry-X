/**
 * Sprint 215: 사업기획서 편집기 라우트 (F444)
 * 섹션별 편집 + AI 재생성 + 버전 diff
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { BusinessPlanEditorService } from "../services/business-plan-editor-service.js";
import { UpdateSectionSchema, RegenerateSectionSchema, SaveDraftSchema } from "../schemas/business-plan.js";

export const businessPlanRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// GET /biz-items/:id/business-plan/sections — 섹션 목록 조회
businessPlanRoute.get("/biz-items/:id/business-plan/sections", async (c) => {
  const bizItemId = c.req.param("id");
  const svc = new BusinessPlanEditorService(c.env.DB);
  const sections = await svc.getSections(bizItemId);
  return c.json({ sections });
});

// PATCH /biz-items/:id/business-plan/sections/:num — 섹션 내용 업데이트
businessPlanRoute.patch("/biz-items/:id/business-plan/sections/:num", async (c) => {
  const bizItemId = c.req.param("id");
  const sectionNum = parseInt(c.req.param("num"), 10);

  if (isNaN(sectionNum) || sectionNum < 1 || sectionNum > 10) {
    return c.json({ error: "섹션 번호는 1~10 사이여야 해요" }, 400);
  }

  const body = await c.req.json();
  const parsed = UpdateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new BusinessPlanEditorService(c.env.DB);
  const section = await svc.updateSection(bizItemId, sectionNum, parsed.data.content);
  return c.json(section);
});

// POST /biz-items/:id/business-plan/sections/:num/regenerate — AI 재생성
businessPlanRoute.post("/biz-items/:id/business-plan/sections/:num/regenerate", async (c) => {
  const bizItemId = c.req.param("id");
  const sectionNum = parseInt(c.req.param("num"), 10);

  if (isNaN(sectionNum) || sectionNum < 1 || sectionNum > 10) {
    return c.json({ error: "섹션 번호는 1~10 사이여야 해요" }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = RegenerateSectionSchema.safeParse(body);
  const customPrompt = parsed.success ? parsed.data.customPrompt : undefined;

  const svc = new BusinessPlanEditorService(c.env.DB);
  const content = await svc.regenerateSection(bizItemId, sectionNum, customPrompt);
  return c.json({ sectionNum, content });
});

// POST /biz-items/:id/business-plan/save — 편집 결과를 새 버전으로 저장
businessPlanRoute.post("/biz-items/:id/business-plan/save", async (c) => {
  const bizItemId = c.req.param("id");

  const body = await c.req.json().catch(() => ({}));
  const parsed = SaveDraftSchema.safeParse(body);
  const note = parsed.success ? parsed.data.note : undefined;

  const svc = new BusinessPlanEditorService(c.env.DB);
  const draft = await svc.saveDraft(bizItemId, note);
  return c.json(draft, 201);
});

// GET /biz-items/:id/business-plan/diff — 두 버전 diff
businessPlanRoute.get("/biz-items/:id/business-plan/diff", async (c) => {
  const bizItemId = c.req.param("id");
  const v1 = parseInt(c.req.query("v1") ?? "", 10);
  const v2 = parseInt(c.req.query("v2") ?? "", 10);

  if (isNaN(v1) || isNaN(v2)) {
    return c.json({ error: "v1과 v2 버전 번호를 쿼리 파라미터로 전달해주세요" }, 400);
  }

  const svc = new BusinessPlanEditorService(c.env.DB);
  try {
    const diff = await svc.diffVersions(bizItemId, v1, v2);
    return c.json(diff);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Diff 오류";
    return c.json({ error: msg }, 404);
  }
});
