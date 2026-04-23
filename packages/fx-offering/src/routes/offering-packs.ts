/**
 * F570: Offering Pack 라우트 — api/modules/launch에서 fx-offering으로 이관 (Sprint 318)
 * Sprint 81: Offering Pack + Offering Brief (F236, F293)
 */
import { Hono } from "hono";
import type { OfferingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { OfferingPackService } from "../services/offering-pack-service.js";
import { OfferingBriefService } from "../services/offering-brief-service.js";
import {
  CreateOfferingPackSchema,
  CreatePackItemSchema,
  UpdatePackStatusSchema,
  CreatePackShareSchema,
  OfferingPackFilterSchema,
} from "../schemas/offering-pack.schema.js";
import { CreateOfferingBriefSchema, OfferingBriefFilterSchema } from "../schemas/offering-brief.schema.js";

export const offeringPacksRoute = new Hono<{ Bindings: OfferingEnv; Variables: TenantVariables }>();

// POST /offering-packs — 생성 (draft)
offeringPacksRoute.post("/offering-packs", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateOfferingPackSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingPackService(c.env.DB);
  const pack = await svc.create({ ...parsed.data, orgId, createdBy: userId });

  return c.json(pack, 201);
});

// GET /offering-packs — 목록
offeringPacksRoute.get("/offering-packs", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = OfferingPackFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingPackService(c.env.DB);
  const packs = await svc.list(orgId, parsed.data);
  return c.json(packs);
});

// GET /offering-packs/:id — 상세 + 항목
offeringPacksRoute.get("/offering-packs/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new OfferingPackService(c.env.DB);
  const pack = await svc.getById(id, orgId);
  if (!pack) {
    return c.json({ error: "Offering pack not found" }, 404);
  }

  return c.json(pack);
});

// POST /offering-packs/:id/items — 항목 추가
offeringPacksRoute.post("/offering-packs/:id/items", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = CreatePackItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingPackService(c.env.DB);
  try {
    const item = await svc.addItem(id, orgId, parsed.data);
    return c.json(item, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});

// PATCH /offering-packs/:id/status — 상태 변경
offeringPacksRoute.patch("/offering-packs/:id/status", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = UpdatePackStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingPackService(c.env.DB);
  try {
    const pack = await svc.updateStatus(id, orgId, parsed.data.status);
    return c.json(pack);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});

// POST /offering-packs/:id/share — 공유 링크 생성
offeringPacksRoute.post("/offering-packs/:id/share", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = CreatePackShareSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingPackService(c.env.DB);
  try {
    const result = await svc.createShareLink(id, orgId, parsed.data.expiresInDays);
    return c.json(result, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 400);
  }
});

// ─── Sprint 119: Offering Brief (F293) ───

// POST /offering-packs/:id/brief — 브리프 생성
offeringPacksRoute.post("/offering-packs/:id/brief", async (c) => {
  const orgId = c.get("orgId");
  const packId = c.req.param("id");

  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateOfferingBriefSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const packSvc = new OfferingPackService(c.env.DB);
  const pack = await packSvc.getById(packId, orgId);
  if (!pack) {
    return c.json({ error: "Offering pack not found" }, 404);
  }

  const briefSvc = new OfferingBriefService(c.env.DB);
  const brief = await briefSvc.createWithContent(
    {
      orgId,
      offeringPackId: packId,
      title: `${pack.title} — Brief`,
      targetAudience: parsed.data.targetAudience,
      meetingType: parsed.data.meetingType,
    },
    pack,
  );

  return c.json(brief, 201);
});

// GET /offering-packs/:id/brief — 최신 브리프 조회
offeringPacksRoute.get("/offering-packs/:id/brief", async (c) => {
  const orgId = c.get("orgId");
  const packId = c.req.param("id");

  const svc = new OfferingBriefService(c.env.DB);
  const brief = await svc.getLatest(packId, orgId);
  if (!brief) {
    return c.json({ error: "No brief found for this offering pack" }, 404);
  }

  return c.json(brief);
});

// GET /offering-packs/:id/briefs — 브리프 목록
offeringPacksRoute.get("/offering-packs/:id/briefs", async (c) => {
  const orgId = c.get("orgId");
  const packId = c.req.param("id");

  const query = c.req.query();
  const parsed = OfferingBriefFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingBriefService(c.env.DB);
  const briefs = await svc.list(packId, orgId, parsed.data);
  return c.json({ items: briefs });
});
