import { Hono } from "hono";
import type { ShapingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import {
  IdeaBmcLinkService,
  NotFoundError,
  ConflictError,
} from "../services/idea-bmc-link-service.js";
import {
  LinkBmcSchema,
  CreateBmcFromIdeaSchema,
} from "../schemas/idea-bmc-link.schema.js";

export const axBdLinksRoute = new Hono<{
  Bindings: ShapingEnv;
  Variables: TenantVariables;
}>();

// POST /ax-bd/ideas/:ideaId/bmc — 아이디어에서 새 BMC 생성 + 자동 링크
axBdLinksRoute.post("/ax-bd/ideas/:ideaId/bmc", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateBmcFromIdeaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new IdeaBmcLinkService(c.env.DB);
  try {
    const result = await svc.createBmcFromIdea(
      c.req.param("ideaId"),
      c.get("orgId"),
      c.get("userId"),
      parsed.data.title
    );
    return c.json(result, 201);
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: e.message }, 404);
    throw e;
  }
});

// POST /ax-bd/ideas/:ideaId/bmc/link — 기존 BMC 연결
axBdLinksRoute.post("/ax-bd/ideas/:ideaId/bmc/link", async (c) => {
  const body = await c.req.json();
  const parsed = LinkBmcSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new IdeaBmcLinkService(c.env.DB);
  try {
    const result = await svc.linkBmc(
      c.req.param("ideaId"),
      parsed.data.bmcId,
      c.get("orgId")
    );
    return c.json(result, 201);
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: e.message }, 404);
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    throw e;
  }
});

// DELETE /ax-bd/ideas/:ideaId/bmc/link — 연결 해제
axBdLinksRoute.delete("/ax-bd/ideas/:ideaId/bmc/link", async (c) => {
  const body = await c.req.json();
  const parsed = LinkBmcSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new IdeaBmcLinkService(c.env.DB);
  try {
    await svc.unlinkBmc(c.req.param("ideaId"), parsed.data.bmcId, c.get("orgId"));
    return c.json({ success: true });
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: e.message }, 404);
    throw e;
  }
});

// GET /ax-bd/ideas/:ideaId/bmcs — 아이디어에 연결된 BMC 목록
axBdLinksRoute.get("/ax-bd/ideas/:ideaId/bmcs", async (c) => {
  const svc = new IdeaBmcLinkService(c.env.DB);
  try {
    const bmcs = await svc.getBmcsByIdea(c.req.param("ideaId"), c.get("orgId"));
    return c.json({ items: bmcs });
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: e.message }, 404);
    throw e;
  }
});

// GET /ax-bd/bmcs/:bmcId/idea — BMC에 연결된 아이디어 조회
axBdLinksRoute.get("/ax-bd/bmcs/:bmcId/idea", async (c) => {
  const svc = new IdeaBmcLinkService(c.env.DB);
  try {
    const idea = await svc.getIdeaByBmc(c.req.param("bmcId"), c.get("orgId"));
    return c.json({ idea });
  } catch (e) {
    if (e instanceof NotFoundError) return c.json({ error: e.message }, 404);
    throw e;
  }
});
