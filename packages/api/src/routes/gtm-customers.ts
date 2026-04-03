/**
 * Sprint 121: GTM Customer Routes — 고객 프로필 관리 (F299)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { GtmCustomerService } from "../services/gtm-customer-service.js";
import {
  CreateGtmCustomerSchema,
  UpdateGtmCustomerSchema,
  GtmCustomerFilterSchema,
} from "../schemas/gtm-customer.schema.js";

export const gtmCustomersRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /gtm/customers — 고객 등록
gtmCustomersRoute.post("/gtm/customers", async (c) => {
  const orgId = c.get("orgId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateGtmCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new GtmCustomerService(c.env.DB);
  const customer = await svc.create({ ...parsed.data, orgId, createdBy: userId });
  return c.json(customer, 201);
});

// GET /gtm/customers — 고객 목록
gtmCustomersRoute.get("/gtm/customers", async (c) => {
  const orgId = c.get("orgId");
  const query = c.req.query();
  const parsed = GtmCustomerFilterSchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "Invalid filters", details: parsed.error.flatten() }, 400);
  }

  const svc = new GtmCustomerService(c.env.DB);
  const result = await svc.list(orgId, parsed.data);
  return c.json(result);
});

// GET /gtm/customers/:id — 고객 상세
gtmCustomersRoute.get("/gtm/customers/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const svc = new GtmCustomerService(c.env.DB);
  const customer = await svc.getById(id, orgId);
  if (!customer) {
    return c.json({ error: "Customer not found" }, 404);
  }
  return c.json(customer);
});

// PATCH /gtm/customers/:id — 고객 수정
gtmCustomersRoute.patch("/gtm/customers/:id", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = UpdateGtmCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new GtmCustomerService(c.env.DB);
  const updated = await svc.update(id, orgId, parsed.data);
  if (!updated) {
    return c.json({ error: "Customer not found" }, 404);
  }
  return c.json(updated);
});
