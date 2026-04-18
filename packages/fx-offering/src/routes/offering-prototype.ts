/**
 * F382: Offering → Prototype 연동 라우트 (Sprint 173)
 */
import { Hono } from "hono";
import type { OfferingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import {
  OfferingPrototypeService,
  OfferingNotFoundError,
} from "../services/offering-prototype-service.js";

export const offeringPrototypeRoute = new Hono<{
  Bindings: OfferingEnv;
  Variables: TenantVariables;
}>();

// POST /offerings/:id/prototype — Offering 기반 Prototype 생성
offeringPrototypeRoute.post("/offerings/:id/prototype", async (c) => {
  const orgId = c.get("orgId");
  const offeringId = c.req.param("id");

  const svc = new OfferingPrototypeService(c.env.DB, null);
  try {
    const result = await svc.generateFromOffering(orgId, offeringId);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof OfferingNotFoundError) {
      return c.json({ error: "Offering not found" }, 404);
    }
    throw err;
  }
});

// GET /offerings/:id/prototypes — 연결된 Prototype 목록
offeringPrototypeRoute.get("/offerings/:id/prototypes", async (c) => {
  const offeringId = c.req.param("id");

  const svc = new OfferingPrototypeService(c.env.DB, null);
  const prototypes = await svc.getLinkedPrototypes(offeringId);
  return c.json({ items: prototypes, total: prototypes.length });
});
