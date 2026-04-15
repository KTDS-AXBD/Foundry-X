/**
 * F539c Group A: biz-items 3 라우트 (FX-REQ-578)
 * GET /api/biz-items, POST /api/biz-items, GET /api/biz-items/:id
 *
 * Hotfix: 정적 경로 3개 추가 이전 — summary, portfolio-list, by-artifact.
 * fx-gateway `/api/biz-items/:id` → DISCOVERY 라우팅 시 정적 경로 3개가 `:id`에 잡혀 오동작하던 문제 해소.
 * 반드시 `:id` 라우트보다 먼저 등록해야 해요 (Hono 매칭 순서).
 */
import { Hono } from "hono";
import type { DiscoveryEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { CreateBizItemSchema } from "../schemas/biz-item.js";
import { BizItemCrudService } from "../services/biz-item-crud.service.js";
import { PortfolioService } from "../services/portfolio.service.js";

const STAGE_TO_NUMBER: Record<string, number> = {
  REGISTERED: 1,
  DISCOVERY: 2,
  FORMALIZATION: 3,
  REVIEW: 4,
  DECISION: 5,
  OFFERING: 6,
  MVP: 6,
};

export const bizItemsRoute = new Hono<{ Bindings: DiscoveryEnv; Variables: TenantVariables }>();

// GET /biz-items/summary — 대시보드 ToDo 요약 (F323)
// 주의: :id 라우트보다 먼저 등록 필수 (정적 경로 우선)
bizItemsRoute.get("/biz-items/summary", async (c) => {
  const orgId = c.get("orgId");

  const { results } = await c.env.DB
    .prepare(
      `SELECT bi.id AS biz_item_id, bi.title, ps.stage
       FROM biz_items bi
       LEFT JOIN pipeline_stages ps
         ON ps.biz_item_id = bi.id AND ps.exited_at IS NULL
       WHERE bi.org_id = ?
       ORDER BY bi.created_at DESC`,
    )
    .bind(orgId)
    .all<{ biz_item_id: string; title: string; stage: string | null }>();

  const items = results.map((r) => ({
    bizItemId: r.biz_item_id,
    title: r.title,
    currentStage: STAGE_TO_NUMBER[r.stage ?? "REGISTERED"] ?? 1,
  }));

  return c.json({ items });
});

// GET /biz-items/portfolio-list — 전체 포트폴리오 + coverage (F459)
bizItemsRoute.get("/biz-items/portfolio-list", async (c) => {
  const orgId = c.get("orgId");
  const service = new PortfolioService(c.env.DB);
  try {
    const result = await service.listWithCoverage(orgId);
    return c.json({ data: result });
  } catch {
    return c.json({ error: "포트폴리오 목록 조회 중 오류가 발생했어요" }, 500);
  }
});

// GET /biz-items/by-artifact — 산출물 ID로 역방향 조회 (F459)
bizItemsRoute.get("/biz-items/by-artifact", async (c) => {
  const orgId = c.get("orgId");
  const type = c.req.query("type") as "prd" | "offering" | "prototype" | undefined;
  const id = c.req.query("id");

  if (!type || !["prd", "offering", "prototype"].includes(type)) {
    return c.json({ error: "type 파라미터는 prd | offering | prototype 이어야 해요" }, 400);
  }
  if (!id) {
    return c.json({ error: "id 파라미터가 필요해요" }, 400);
  }

  const service = new PortfolioService(c.env.DB);
  try {
    const result = await service.findByArtifact(type, id, orgId);
    return c.json({ data: result });
  } catch {
    return c.json({ error: "역방향 조회 중 오류가 발생했어요" }, 500);
  }
});

// GET /biz-items — 목록 조회
bizItemsRoute.get("/biz-items", async (c) => {
  const orgId = c.get("orgId");
  const status = c.req.query("status") || undefined;
  const source = c.req.query("source") || undefined;

  const service = new BizItemCrudService(c.env.DB);
  const items = await service.list(orgId, { status, source });

  return c.json({ items });
});

// POST /biz-items — 생성
bizItemsRoute.post("/biz-items", async (c) => {
  const body = await c.req.json();
  const parsed = CreateBizItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const service = new BizItemCrudService(c.env.DB);
  const item = await service.create(orgId, userId, parsed.data);

  return c.json(item, 201);
});

// GET /biz-items/:id — 상세 조회
bizItemsRoute.get("/biz-items/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const service = new BizItemCrudService(c.env.DB);
  const item = await service.getById(orgId, id);

  if (!item) {
    return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);
  }

  return c.json(item);
});
