/**
 * Sprint 80: BDP Routes — 사업계획서 편집/버전관리 + 사업제안서 생성 (F234+F237)
 */
import { Hono } from "hono";
import type { OfferingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { BdpService, BdpFinalizedError } from "../services/bdp-service.js";
import { ProposalGenerator, NoBdpError } from "../services/proposal-generator.js";
import { CreateBdpVersionSchema, BdpDiffParamsSchema, GenerateProposalSchema } from "../schemas/bdp.schema.js";
import { BdpReviewService } from "../services/bdp-review-service.js";
import { sectionReviewSchema } from "../schemas/hitl-section.schema.js";

export const bdpRoute = new Hono<{ Bindings: OfferingEnv; Variables: TenantVariables }>();

// GET /bdp — 전체 사업기획서 목록 (P4: 사업기획서 페이지용)
bdpRoute.get("/bdp", async (c) => {
  const orgId = c.get("orgId");
  const db = c.env.DB;

  // bdp_versions + business_plan_drafts 양쪽에서 최신 버전만 조회
  const { results: bdpRows } = await db.prepare(
    `SELECT bv.id, bv.biz_item_id, bv.version_num, bv.is_final, bv.created_at, bi.title AS biz_item_title
     FROM bdp_versions bv
     JOIN biz_items bi ON bv.biz_item_id = bi.id
     WHERE bv.org_id = ?
     AND bv.version_num = (SELECT MAX(bv2.version_num) FROM bdp_versions bv2 WHERE bv2.biz_item_id = bv.biz_item_id AND bv2.org_id = ?)
     ORDER BY bv.created_at DESC`
  ).bind(orgId, orgId).all();

  // business_plan_drafts fallback (bdp_versions에 없는 아이템)
  const bdpBizIds = new Set((bdpRows ?? []).map((r: Record<string, unknown>) => r.biz_item_id as string));
  const { results: bpdRows } = await db.prepare(
    `SELECT bpd.id, bpd.biz_item_id, bpd.version, bpd.generated_at, bi.title AS biz_item_title
     FROM business_plan_drafts bpd
     JOIN biz_items bi ON bpd.biz_item_id = bi.id
     WHERE bi.org_id = ?
     AND bpd.version = (SELECT MAX(bpd2.version) FROM business_plan_drafts bpd2 WHERE bpd2.biz_item_id = bpd.biz_item_id)
     ORDER BY bpd.generated_at DESC`
  ).bind(orgId).all();

  const fallbackItems = (bpdRows ?? [])
    .filter((r: Record<string, unknown>) => !bdpBizIds.has(r.biz_item_id as string))
    .map((r: Record<string, unknown>) => ({
      id: r.id, bizItemId: r.biz_item_id, bizItemTitle: r.biz_item_title ?? r.biz_item_id,
      versionNum: r.version, isFinal: false, createdAt: r.generated_at, source: "business_plan_drafts",
    }));

  const items = [
    ...(bdpRows ?? []).map((r: Record<string, unknown>) => ({
      id: r.id, bizItemId: r.biz_item_id, bizItemTitle: r.biz_item_title ?? r.biz_item_id,
      versionNum: r.version_num, isFinal: !!r.is_final, createdAt: r.created_at, source: "bdp_versions",
    })),
    ...fallbackItems,
  ];

  return c.json({ items });
});

// GET /bdp/:bizItemId — 최신 BDP 버전 조회
bdpRoute.get("/bdp/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const svc = new BdpService(c.env.DB);
  const version = await svc.getLatest(bizItemId, orgId);

  if (version) {
    return c.json(version);
  }

  // Fallback: business_plan_drafts에서 조회 (bdp_versions 미등록 아이템용)
  const bpDraft = await c.env.DB.prepare(
    "SELECT id, biz_item_id, version, content, generated_at FROM business_plan_drafts WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1"
  ).bind(bizItemId).first<{ id: string; biz_item_id: string; version: number; content: string; generated_at: string }>();

  if (!bpDraft) {
    return c.json({ error: "BDP를 찾을 수 없어요" }, 404);
  }

  return c.json({
    id: bpDraft.id,
    bizItemId: bpDraft.biz_item_id,
    versionNum: bpDraft.version,
    content: bpDraft.content,
    isFinal: false,
    createdBy: "",
    createdAt: bpDraft.generated_at,
  });
});

// GET /bdp/:bizItemId/versions — 버전 히스토리
bdpRoute.get("/bdp/:bizItemId/versions", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const svc = new BdpService(c.env.DB);
  const versions = await svc.listVersions(bizItemId, orgId);
  return c.json(versions);
});

// POST /bdp/:bizItemId — 새 버전 저장
bdpRoute.post("/bdp/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateBdpVersionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new BdpService(c.env.DB);
  try {
    const version = await svc.createVersion({
      bizItemId,
      orgId,
      content: parsed.data.content,
      createdBy: userId,
    });
    return c.json(version, 201);
  } catch (e) {
    if (e instanceof BdpFinalizedError) {
      return c.json({ error: "최종본이 잠금된 BDP는 수정할 수 없어요" }, 409);
    }
    throw e;
  }
});

// PATCH /bdp/:bizItemId/finalize — 최종본 잠금
bdpRoute.patch("/bdp/:bizItemId/finalize", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const svc = new BdpService(c.env.DB);
  const version = await svc.finalize(bizItemId, orgId, userId);

  if (!version) {
    return c.json({ error: "BDP를 찾을 수 없어요" }, 404);
  }

  return c.json(version);
});

// GET /bdp/:bizItemId/diff/:v1/:v2 — 버전 diff
bdpRoute.get("/bdp/:bizItemId/diff/:v1/:v2", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const parsed = BdpDiffParamsSchema.safeParse({
    v1: c.req.param("v1"),
    v2: c.req.param("v2"),
  });
  if (!parsed.success) {
    return c.json({ error: "Invalid version numbers", details: parsed.error.flatten() }, 400);
  }

  const svc = new BdpService(c.env.DB);
  const diff = await svc.getDiff(bizItemId, orgId, parsed.data.v1, parsed.data.v2);

  if (!diff) {
    return c.json({ error: "해당 버전을 찾을 수 없어요" }, 404);
  }

  return c.json(diff);
});

// POST /bdp/:bizItemId/sections/:sectionId/review — 섹션 리뷰 제출 (F292)
bdpRoute.post("/bdp/:bizItemId/sections/:sectionId/review", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");
  const sectionId = c.req.param("sectionId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = sectionReviewSchema.safeParse({ ...body, sectionId });
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new BdpReviewService(c.env.DB);
  const review = await svc.reviewSection(orgId, bizItemId, parsed.data, userId);
  return c.json(review, 201);
});

// GET /bdp/:bizItemId/reviews — 리뷰 목록 (F292)
bdpRoute.get("/bdp/:bizItemId/reviews", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const svc = new BdpReviewService(c.env.DB);
  const reviews = await svc.listReviews(orgId, bizItemId);
  return c.json(reviews);
});

// GET /bdp/:bizItemId/review-summary — 상태 요약 (F292)
bdpRoute.get("/bdp/:bizItemId/review-summary", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const svc = new BdpReviewService(c.env.DB);
  const summary = await svc.getSummary(orgId, bizItemId);
  return c.json(summary);
});

// POST /bdp/:bizItemId/generate-proposal — 사업제안서 자동 생성 (F237)
bdpRoute.post("/bdp/:bizItemId/generate-proposal", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json().catch(() => ({}));
  const parsed = GenerateProposalSchema.safeParse(body);
  const maxLength = parsed.success ? parsed.data.maxLength : 1500;

  const generator = new ProposalGenerator(c.env.DB, c.env.AI);
  try {
    const proposal = await generator.generate({
      bizItemId,
      orgId,
      createdBy: userId,
      maxLength,
    });
    return c.json(proposal, 201);
  } catch (e) {
    if (e instanceof NoBdpError) {
      return c.json({ error: "BDP를 찾을 수 없어요" }, 404);
    }
    throw e;
  }
});
