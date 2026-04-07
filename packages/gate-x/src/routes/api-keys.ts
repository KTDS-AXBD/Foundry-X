import { Hono } from "hono";
import { z } from "zod";
import { rbac } from "@foundry-x/harness-kit";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { ApiKeyService } from "../services/api-key-service.js";

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "member", "viewer"]).optional().default("member"),
});

export const apiKeysRoute = new Hono<{
  Bindings: GateEnv;
  Variables: TenantVariables;
}>();

// POST / → API Key 발급 (member+)
apiKeysRoute.post("/", rbac("member"), async (c) => {
  const body = await c.req.json();
  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      400,
    );
  }

  const { name, role } = parsed.data;
  const orgId = c.get("orgId");
  const userId = c.get("userId");

  const service = new ApiKeyService(c.env.DB);
  const { key, record } = await service.create(orgId, name, role, userId);

  return c.json(
    {
      key, // 원문 키 — 1회만 반환
      record,
      message:
        "API Key가 발급되었어요. 이 키는 다시 확인할 수 없으니 안전한 곳에 보관하세요.",
    },
    201,
  );
});

// GET / → API Key 목록 (member+)
apiKeysRoute.get("/", rbac("member"), async (c) => {
  const orgId = c.get("orgId");
  const service = new ApiKeyService(c.env.DB);
  const keys = await service.list(orgId);

  return c.json({ keys });
});

// DELETE /:id → API Key 폐기 (admin)
apiKeysRoute.delete("/:id", rbac("admin"), async (c) => {
  const id = c.req.param("id");
  const orgId = c.get("orgId");

  const service = new ApiKeyService(c.env.DB);
  await service.revoke(id, orgId);

  return c.json({ success: true });
});
