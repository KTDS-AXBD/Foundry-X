import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { requireTenantAdmin } from "../middleware/tenant.js";
import { tenantService } from "../services/tenant-service.js";
import {
  CreateTenantSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
} from "../schemas/tenant-schema.js";

export const tenantsRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

// POST /api/tenants — 테넌트 생성 (인증 필요)
tenantsRoute.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = CreateTenantSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const userId = c.get("userId");
  try {
    const tenant = await tenantService.create(parsed.data, userId, c.env.DB);
    return c.json({ tenant }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tenant creation failed";
    return c.json({ error: msg }, 409);
  }
});

// GET /api/tenants/:id — 테넌트 조회
tenantsRoute.get("/:id", async (c) => {
  const tenant = await tenantService.get(c.req.param("id"), c.env.DB);
  if (!tenant) return c.json({ error: "Tenant not found" }, 404);
  return c.json({ tenant });
});

// GET /api/tenants/:id/members — 멤버 목록
tenantsRoute.get("/:id/members", async (c) => {
  const members = await tenantService.listMembers(c.req.param("id"), c.env.DB);
  return c.json({ members });
});

// POST /api/tenants/:id/members — 멤버 초대 (tenant_admin)
tenantsRoute.post("/:id/members", requireTenantAdmin, async (c) => {
  const body = await c.req.json();
  const parsed = InviteMemberSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const userId = c.get("userId");
  const tenantId = c.req.param("id") ?? "";
  try {
    const member = await tenantService.invite(tenantId, parsed.data, userId, c.env.DB);
    return c.json({ member }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invite failed";
    return c.json({ error: msg }, 409);
  }
});

// PUT /api/tenants/:id/members/:memberId — 역할 변경 (tenant_admin)
tenantsRoute.put("/:id/members/:memberId", requireTenantAdmin, async (c) => {
  const body = await c.req.json();
  const parsed = UpdateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const member = await tenantService.updateRole(
    c.req.param("id") ?? "",
    c.req.param("memberId") ?? "",
    parsed.data.role,
    c.env.DB,
  );
  if (!member) return c.json({ error: "Member not found" }, 404);
  return c.json({ member });
});

// DELETE /api/tenants/:id/members/:memberId — 멤버 제거 (tenant_admin)
tenantsRoute.delete("/:id/members/:memberId", requireTenantAdmin, async (c) => {
  const removed = await tenantService.removeMember(
    c.req.param("id") ?? "",
    c.req.param("memberId") ?? "",
    c.env.DB,
  );
  if (!removed) return c.json({ error: "Member not found" }, 404);
  return c.json({ success: true });
});
