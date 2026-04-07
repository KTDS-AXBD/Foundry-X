import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { GatePackageService, MissingArtifactsError } from "../services/gate-package-service.js";
import { CreateGatePackageSchema, UpdateGateStatusSchema } from "../schemas/gate-package.schema.js";

export const gatePackageRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

gatePackageRoute.post("/gate-package/:bizItemId", async (c) => {
  const body = await c.req.json();
  const parsed = CreateGatePackageSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  try {
    const pkg = await new GatePackageService(c.env.DB).create({ bizItemId: c.req.param("bizItemId"), orgId: c.get("orgId"), gateType: parsed.data.gateType, createdBy: c.get("userId") });
    return c.json(pkg, 201);
  } catch (e) {
    if (e instanceof MissingArtifactsError) return c.json({ error: `${e.missing.join("와 ")}가 필요해요`, missing: e.missing }, 422);
    throw e;
  }
});

gatePackageRoute.get("/gate-package/:bizItemId/download", async (c) => {
  const download = await new GatePackageService(c.env.DB).getDownload(c.req.param("bizItemId"), c.get("orgId"));
  if (!download) return c.json({ error: "게이트 패키지를 찾을 수 없어요" }, 404);
  return c.json(download);
});

gatePackageRoute.get("/gate-package/:bizItemId", async (c) => {
  const pkg = await new GatePackageService(c.env.DB).get(c.req.param("bizItemId"), c.get("orgId"));
  if (!pkg) return c.json({ error: "게이트 패키지를 찾을 수 없어요" }, 404);
  return c.json(pkg);
});

gatePackageRoute.patch("/gate-package/:bizItemId/status", async (c) => {
  const body = await c.req.json();
  const parsed = UpdateGateStatusSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const pkg = await new GatePackageService(c.env.DB).updateStatus(c.req.param("bizItemId"), c.get("orgId"), parsed.data.status);
  if (!pkg) return c.json({ error: "게이트 패키지를 찾을 수 없어요" }, 404);
  return c.json(pkg);
});
