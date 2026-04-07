import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { BdSkillExecutor } from "../services/bd-skill-executor.js";
import { getSupportedSkillIds } from "../services/bd-skill-prompts.js";
import { executeSkillSchema } from "../../discovery/schemas/bd-artifact.js";

export const axBdSkillsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// GET /ax-bd/skills — 서버 측 지원 스킬 목록
axBdSkillsRoute.get("/ax-bd/skills", (c) => {
  const skillIds = getSupportedSkillIds();
  return c.json({ skills: skillIds, total: skillIds.length });
});

// POST /ax-bd/skills/:skillId/execute — 스킬 실행
axBdSkillsRoute.post("/ax-bd/skills/:skillId/execute", async (c) => {
  const skillId = c.req.param("skillId");
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "ANTHROPIC_API_KEY not configured" }, 503);
  }

  const body = await c.req.json();
  const parsed = executeSkillSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const executor = new BdSkillExecutor(c.env.DB, apiKey);
  try {
    const result = await executor.execute(
      c.get("orgId"),
      c.get("userId"),
      skillId,
      parsed.data,
    );
    const statusCode = result.status === "completed" ? 200 : 500;
    return c.json(result, statusCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Execution failed";
    return c.json({ error: message }, 400);
  }
});
