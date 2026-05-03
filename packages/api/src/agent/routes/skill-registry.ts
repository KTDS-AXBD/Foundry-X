import { Hono } from "hono";
import type { Env } from "../../env.js";
import type { TenantVariables } from "../../middleware/tenant.js";
import { SkillRegistryService } from "../services/skill-registry.js";
import { SkillSearchService } from "../services/skill-search.js";
import {
  registerSkillSchema,
  updateSkillSchema,
  listSkillsQuerySchema,
  searchSkillsSchema,
  bulkRegisterSkillSchema,
  deploySkillSchema,
} from "../schemas/skill-registry.js";
import { SkillMdGeneratorService } from "../services/skill-md-generator.js";

export const skillRegistryRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /skills/registry — 스킬 등록
skillRegistryRoute.post("/skills/registry", async (c) => {
  const body = await c.req.json();
  const parsed = registerSkillSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillRegistryService(c.env.DB);
  const result = await svc.register(c.get("orgId"), parsed.data, c.get("userId"));
  return c.json(result, 201);
});

// GET /skills/registry — 스킬 목록
skillRegistryRoute.get("/skills/registry", async (c) => {
  const parsed = listSkillsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillRegistryService(c.env.DB);
  const result = await svc.list(c.get("orgId"), parsed.data);
  return c.json(result);
});

// GET /skills/search — 시맨틱 검색
skillRegistryRoute.get("/skills/search", async (c) => {
  const parsed = searchSkillsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);
  }

  const searchSvc = new SkillSearchService(c.env.DB);
  const results = await searchSvc.search(c.get("orgId"), parsed.data.q, {
    category: parsed.data.category,
    limit: parsed.data.limit,
  });
  return c.json({ results, total: results.length, query: parsed.data.q });
});

// POST /skills/registry/bulk �� 벌크 등록/업서트 (admin only, F304)
skillRegistryRoute.post("/skills/registry/bulk", async (c) => {
  const role = c.get("orgRole") as string;
  if (role !== "admin" && role !== "owner") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const body = await c.req.json();
  const parsed = bulkRegisterSkillSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillRegistryService(c.env.DB);
  const result = await svc.bulkUpsert(c.get("orgId"), parsed.data.skills, c.get("userId"));
  return c.json(result, 200);
});

// GET /skills/registry/:skillId — 스킬 상세
skillRegistryRoute.get("/skills/registry/:skillId", async (c) => {
  const skillId = c.req.param("skillId");
  const svc = new SkillRegistryService(c.env.DB);
  const entry = await svc.getById(c.get("orgId"), skillId);
  if (!entry) {
    return c.json({ error: "Skill not found" }, 404);
  }
  return c.json(entry);
});

// PUT /skills/registry/:skillId — 스킬 수정
skillRegistryRoute.put("/skills/registry/:skillId", async (c) => {
  const skillId = c.req.param("skillId");
  const body = await c.req.json();
  const parsed = updateSkillSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillRegistryService(c.env.DB);
  const updated = await svc.update(c.get("orgId"), skillId, parsed.data, c.get("userId"));
  return c.json(updated);
});

// DELETE /skills/registry/:skillId — 소프트 삭제
skillRegistryRoute.delete("/skills/registry/:skillId", async (c) => {
  const skillId = c.req.param("skillId");
  const svc = new SkillRegistryService(c.env.DB);
  await svc.softDelete(c.get("orgId"), skillId, c.get("userId"));
  return c.json({ deleted: true });
});

// POST /skills/registry/:skillId/deploy — SKILL.md 생성 (F306, admin only)
skillRegistryRoute.post("/skills/registry/:skillId/deploy", async (c) => {
  const role = c.get("orgRole") as string;
  if (role !== "admin" && role !== "owner") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const skillId = c.req.param("skillId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = deploySkillSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const svc = new SkillRegistryService(c.env.DB);
  const entry = await svc.getById(c.get("orgId"), skillId);
  if (!entry) {
    return c.json({ error: "Skill not found" }, 404);
  }

  const mdGenerator = new SkillMdGeneratorService();
  const skillMd = mdGenerator.generate({
    skillId: entry.skillId,
    name: entry.name,
    description: entry.description ?? "",
    category: entry.category,
    tags: entry.tags,
    sourceType: entry.sourceType,
    promptTemplate: entry.promptTemplate ?? undefined,
    version: entry.currentVersion,
  });

  // D1에 SKILL.md 캐시 저장
  await c.env.DB.prepare(
    "UPDATE skill_registry SET skill_md_content = ?, skill_md_generated_at = datetime('now') WHERE tenant_id = ? AND skill_id = ?"
  ).bind(skillMd, c.get("orgId"), skillId).run();

  if (parsed.data.format === "download") {
    return new Response(skillMd, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="SKILL.md"`,
      },
    });
  }

  return c.json({
    skillId,
    skillMd,
    fileName: `${skillId}/SKILL.md`,
    generatedAt: new Date().toISOString(),
  });
});

// POST /skills/registry/:skillId/safety-check — 안전성 검사
skillRegistryRoute.post("/skills/registry/:skillId/safety-check", async (c) => {
  const skillId = c.req.param("skillId");
  const svc = new SkillRegistryService(c.env.DB);
  const result = await svc.runSafetyCheck(c.get("orgId"), skillId);
  return c.json(result);
});

// GET /skills/registry/:skillId/enriched — 통합 조회 (registry + metrics + versions + lineage)
skillRegistryRoute.get("/skills/registry/:skillId/enriched", async (c) => {
  const skillId = c.req.param("skillId");
  const svc = new SkillRegistryService(c.env.DB);
  const enriched = await svc.getEnriched(c.get("orgId"), skillId);
  if (!enriched) {
    return c.json({ error: "Skill not found" }, 404);
  }
  return c.json(enriched);
});
