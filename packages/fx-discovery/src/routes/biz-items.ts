/**
 * F539c Group A: biz-items 3 라우트 (FX-REQ-578)
 * GET /api/biz-items, POST /api/biz-items, GET /api/biz-items/:id
 */
import { Hono } from "hono";
import type { DiscoveryEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { CreateBizItemSchema } from "../schemas/biz-item.js";
import { BizItemCrudService } from "../services/biz-item-crud.service.js";

export const bizItemsRoute = new Hono<{ Bindings: DiscoveryEnv; Variables: TenantVariables }>();

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
