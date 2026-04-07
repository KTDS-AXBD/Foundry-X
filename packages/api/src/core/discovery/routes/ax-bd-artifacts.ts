import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { BdArtifactService } from "../../shaping/services/bd-artifact-service.js";
import { artifactListQuerySchema } from "../schemas/bd-artifact.js";

export const axBdArtifactsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /ax-bd/artifacts — 산출물 목록 (필터 가능)
axBdArtifactsRoute.get("/ax-bd/artifacts", async (c) => {
  const query = artifactListQuerySchema.safeParse(c.req.query());
  if (!query.success) {
    return c.json({ error: "Invalid query", details: query.error.flatten() }, 400);
  }
  const svc = new BdArtifactService(c.env.DB);
  const result = await svc.list(c.get("orgId"), query.data);
  return c.json(result);
});

// GET /ax-bd/artifacts/:id — 산출물 상세
axBdArtifactsRoute.get("/ax-bd/artifacts/:id", async (c) => {
  const svc = new BdArtifactService(c.env.DB);
  const artifact = await svc.getById(c.get("orgId"), c.req.param("id"));
  if (!artifact) return c.json({ error: "Artifact not found" }, 404);
  return c.json(artifact);
});

// GET /ax-bd/biz-items/:bizItemId/artifacts — biz-item별 산출물
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

// GET /ax-bd/artifacts/:bizItemId/:skillId/versions — 버전 히스토리
axBdArtifactsRoute.get("/ax-bd/artifacts/:bizItemId/:skillId/versions", async (c) => {
  const svc = new BdArtifactService(c.env.DB);
  const versions = await svc.getVersionHistory(
    c.get("orgId"),
    c.req.param("bizItemId"),
    c.req.param("skillId"),
  );
  return c.json({ versions, total: versions.length });
});
