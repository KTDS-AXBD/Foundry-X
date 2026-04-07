/**
 * F370: Offerings CRUD Routes (Sprint 167)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { OfferingService } from "../services/offering-service.js";
import {
  CreateOfferingSchema,
  UpdateOfferingSchema,
  OfferingFilterSchema,
  CreateVersionSchema,
} from "../schemas/offering.schema.js";

export const offeringsRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /offerings — 생성 (draft + 표준 목차 자동 초기화)
offeringsRoute.post("/offerings", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateOfferingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingService(c.env.DB);
  const offering = await svc.create({ ...parsed.data, orgId, createdBy: userId });
  return c.json(offering, 201);
});

// GET /offerings — 목록 (필터 + 페이지네이션)
offeringsRoute.get("/offerings", async (c) => {
  const orgId = c.get("orgId");
  const parsed = OfferingFilterSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingService(c.env.DB);
  const result = await svc.list(orgId, parsed.data);
  return c.json(result);
});

// GET /offerings/:id — 상세 + sections 포함
offeringsRoute.get("/offerings/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new OfferingService(c.env.DB);
  const offering = await svc.getById(orgId, id);
  if (!offering) return c.json({ error: "Offering not found" }, 404);
  return c.json(offering);
});

// PUT /offerings/:id — 수정
offeringsRoute.put("/offerings/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = UpdateOfferingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new OfferingService(c.env.DB);
  const offering = await svc.update(orgId, id, parsed.data);
  if (!offering) return c.json({ error: "Offering not found" }, 404);
  return c.json(offering);
});

// DELETE /offerings/:id — 삭제 (CASCADE)
offeringsRoute.delete("/offerings/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new OfferingService(c.env.DB);
  const deleted = await svc.delete(orgId, id);
  if (!deleted) return c.json({ error: "Offering not found" }, 404);
  return c.body(null, 204);
});

// POST /offerings/:id/versions — 버전 스냅샷 생성
offeringsRoute.post("/offerings/:id/versions", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateVersionSchema.safeParse(body);

  const svc = new OfferingService(c.env.DB);
  const version = await svc.createVersion(
    orgId,
    id,
    userId,
    parsed.success ? parsed.data.changeSummary : undefined,
  );
  if (!version) return c.json({ error: "Offering not found" }, 404);
  return c.json(version, 201);
});

// GET /offerings/:id/versions — 버전 히스토리
offeringsRoute.get("/offerings/:id/versions", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new OfferingService(c.env.DB);
  const versions = await svc.listVersions(orgId, id);
  return c.json({ versions, total: versions.length });
});
