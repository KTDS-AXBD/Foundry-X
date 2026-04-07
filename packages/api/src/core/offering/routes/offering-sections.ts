/**
 * F371: Offering Sections Routes (Sprint 167)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { OfferingSectionService } from "../services/offering-section-service.js";
import {
  UpdateSectionSchema,
  InitSectionsSchema,
  ReorderSectionsSchema,
} from "../schemas/offering-section.schema.js";

export const offeringSectionsRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// GET /offerings/:id/sections — 전체 섹션 목록
offeringSectionsRoute.get("/offerings/:id/sections", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  const svc = new OfferingSectionService(c.env.DB);
  const exists = await svc.offeringExists(offeringId, orgId);
  if (!exists) return c.json({ error: "Offering not found" }, 404);

  const sections = await svc.listByOffering(offeringId);
  return c.json({ sections });
});

// POST /offerings/:id/sections/init — 표준 목차 초기화 (정적 경로 — 동적 :sectionId 앞에 위치)
offeringSectionsRoute.post("/offerings/:id/sections/init", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  const svc = new OfferingSectionService(c.env.DB);
  const exists = await svc.offeringExists(offeringId, orgId);
  if (!exists) return c.json({ error: "Offering not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = InitSectionsSchema.safeParse(body);
  const includeOptional = parsed.success ? parsed.data.includeOptional : true;

  const sections = await svc.initStandard(offeringId, includeOptional);
  return c.json({ sections }, 201);
});

// PUT /offerings/:id/sections/reorder — 순서 변경 (정적 경로 — 동적 :sectionId 앞에 위치)
offeringSectionsRoute.put("/offerings/:id/sections/reorder", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  const svc = new OfferingSectionService(c.env.DB);
  const exists = await svc.offeringExists(offeringId, orgId);
  if (!exists) return c.json({ error: "Offering not found" }, 404);

  const body = await c.req.json();
  const parsed = ReorderSectionsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const sections = await svc.reorder(offeringId, parsed.data.sectionIds);
  return c.json({ sections });
});

// PUT /offerings/:id/sections/:sectionId — 콘텐츠/제목 수정 (동적 경로)
offeringSectionsRoute.put("/offerings/:id/sections/:sectionId", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");
  const sectionId = c.req.param("sectionId");

  const svc = new OfferingSectionService(c.env.DB);
  const exists = await svc.offeringExists(offeringId, orgId);
  if (!exists) return c.json({ error: "Offering not found" }, 404);

  const body = await c.req.json();
  const parsed = UpdateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const section = await svc.update(sectionId, parsed.data);
  if (!section) return c.json({ error: "Section not found" }, 404);
  return c.json(section);
});

// PATCH /offerings/:id/sections/:sectionId/toggle — is_included 토글
offeringSectionsRoute.patch("/offerings/:id/sections/:sectionId/toggle", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");
  const sectionId = c.req.param("sectionId");

  const svc = new OfferingSectionService(c.env.DB);
  const exists = await svc.offeringExists(offeringId, orgId);
  if (!exists) return c.json({ error: "Offering not found" }, 404);

  const section = await svc.toggleIncluded(sectionId);
  if (!section) return c.json({ error: "Cannot toggle: section is required or not found" }, 400);
  return c.json(section);
});
