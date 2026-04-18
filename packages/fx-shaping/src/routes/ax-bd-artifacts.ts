/**
 * F560: ax-bd-artifacts routes — fx-shaping 이전
 * api/src/core/discovery/routes/ax-bd-artifacts.ts → fx-shaping
 * gateway /api/ax-bd/* → SHAPING (기존 라우팅 유지)
 */
import { Hono } from "hono";
import type { ShapingEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { BdArtifactService } from "../services/bd-artifact-service.js";
import { artifactListQuerySchema } from "../schemas/artifact.schema.js";

export const axBdArtifactsRoute = new Hono<{ Bindings: ShapingEnv; Variables: TenantVariables }>();

axBdArtifactsRoute.get("/ax-bd/artifacts", async (c) => {
  const query = artifactListQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json({ error: "Invalid query", details: query.error.flatten() }, 400);
  }
  const svc = new BdArtifactService(c.env.DB);
  const result = await svc.list(c.get("orgId"), query.data);
  return c.json(result);
});

axBdArtifactsRoute.get("/ax-bd/artifacts/:id", async (c) => {
  const svc = new BdArtifactService(c.env.DB);
  const artifact = await svc.getById(c.get("orgId"), c.req.param("id"));
  if (!artifact) return c.json({ error: "Artifact not found" }, 404);
  return c.json(artifact);
});

axBdArtifactsRoute.get("/ax-bd/biz-items/:bizItemId/artifacts", async (c) => {
  const query = artifactListQuerySchema.safeParse({
    ...c.req.query(),
    bizItemId: c.req.param("bizItemId"),
  });
  if (!query.success) {
    return c.json({ error: "Invalid query", details: query.error.flatten() }, 400);
  }
  const svc = new BdArtifactService(c.env.DB);
  const result = await svc.list(c.get("orgId"), query.data);
  return c.json(result);
});

axBdArtifactsRoute.get("/ax-bd/artifacts/:bizItemId/:skillId/versions", async (c) => {
  const svc = new BdArtifactService(c.env.DB);
  const versions = await svc.getVersionHistory(
    c.get("orgId"),
    c.req.param("bizItemId"),
    c.req.param("skillId"),
  );
  return c.json({ versions, total: versions.length });
});
