import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { roleGuard } from "../../../middleware/role-guard.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { BulkSignupSchema, BulkSignupResultSchema } from "../schemas/admin.js";
import { ErrorSchema, validationHook } from "../../../schemas/common.js";
import { AdminService } from "../services/admin-service.js";

export const adminRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>({
  defaultHook: validationHook as any,
});

// Admin routes require admin role — auth + tenant applied globally in app.ts
adminRoute.use("/admin/*", roleGuard("admin"));

// ─── POST /admin/bulk-signup ───

const bulkSignup = createRoute({
  method: "post",
  path: "/admin/bulk-signup",
  tags: ["Admin"],
  summary: "Bulk create user accounts and add to organization",
  request: {
    body: { content: { "application/json": { schema: BulkSignupSchema } } },
  },
  responses: {
    201: {
      content: { "application/json": { schema: BulkSignupResultSchema } },
      description: "Bulk signup result",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Admin role required",
    },
  },
});

adminRoute.openapi(bulkSignup, async (c) => {
  const { orgId, accounts, defaultPassword } = c.req.valid("json");
  const service = new AdminService(c.env.DB);

  const result = await service.bulkSignup({ orgId, accounts, defaultPassword });
  return c.json(result, 201);
});
