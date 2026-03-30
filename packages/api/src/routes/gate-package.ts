/**
 * Sprint 80: Gate Package Routes — ORB/PRB 게이트 문서 패키징 (F235)
 */
import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { GatePackageService, MissingArtifactsError } from "../services/gate-package-service.js";
import { CreateGatePackageSchema, UpdateGateStatusSchema } from "../schemas/gate-package.schema.js";

export const gatePackageRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// POST /gate-package/:bizItemId — 게이트 패키지 자동 구성
gatePackageRoute.post("/gate-package/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");
  const userId = (c.get("jwtPayload") as Record<string, string> | undefined)?.sub ?? "";

  const body = await c.req.json();
  const parsed = CreateGatePackageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new GatePackageService(c.env.DB);
  try {
    const pkg = await svc.create({
      bizItemId,
      orgId,
      gateType: parsed.data.gateType,
      createdBy: userId,
    });
    return c.json(pkg, 201);
  } catch (e) {
    if (e instanceof MissingArtifactsError) {
      return c.json({ error: `${e.missing.join("와 ")}가 필요해요`, missing: e.missing }, 422);
    }
    throw e;
  }
});

// GET /gate-package/:bizItemId — 패키지 내용 조회
gatePackageRoute.get("/gate-package/:bizItemId", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const svc = new GatePackageService(c.env.DB);
  const pkg = await svc.get(bizItemId, orgId);

  if (!pkg) {
    return c.json({ error: "게이트 패키지를 찾을 수 없어요" }, 404);
  }

  return c.json(pkg);
});

// GET /gate-package/:bizItemId/download — ZIP 다운로드 (메타데이터)
gatePackageRoute.get("/gate-package/:bizItemId/download", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const svc = new GatePackageService(c.env.DB);
  const download = await svc.getDownload(bizItemId, orgId);

  if (!download) {
    return c.json({ error: "게이트 패키지를 찾을 수 없어요" }, 404);
  }

  return c.json(download);
});

// PATCH /gate-package/:bizItemId/status — 상태 변경
gatePackageRoute.patch("/gate-package/:bizItemId/status", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.param("bizItemId");

  const body = await c.req.json();
  const parsed = UpdateGateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const svc = new GatePackageService(c.env.DB);
  const pkg = await svc.updateStatus(bizItemId, orgId, parsed.data.status);

  if (!pkg) {
    return c.json({ error: "게이트 패키지를 찾을 수 없어요" }, 404);
  }

  return c.json(pkg);
});
