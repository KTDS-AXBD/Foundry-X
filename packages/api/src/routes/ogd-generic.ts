// F360: O-G-D Generic Routes (Sprint 163)
// POST /ogd/run — 도메인 독립 O-G-D Loop 실행
// GET /ogd/domains — 등록된 도메인 목록
// GET /ogd/runs — 실행 이력
// GET /ogd/runs/:runId — 특정 실행 상세

import { Hono } from "hono";
import { OgdRunRequestSchema } from "../schemas/ogd-generic-schema.js";
import { OgdDomainRegistry } from "../services/ogd-domain-registry.js";
import { OgdGenericRunner, OgdDomainNotFoundError } from "../services/ogd-generic-runner.js";
import { BdShapingOgdAdapter } from "../services/adapters/bd-shaping-ogd-adapter.js";
import { PrototypeOgdAdapter } from "../services/adapters/prototype-ogd-adapter.js";
import { CodeReviewOgdAdapter } from "../services/adapters/code-review-ogd-adapter.js";
import { DocVerifyOgdAdapter } from "../services/adapters/doc-verify-ogd-adapter.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const ogdGenericRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

/** 요청마다 레지스트리 + 러너 구성 (DI 컨테이너 없는 패턴) */
function createRunner(env: Env): { registry: OgdDomainRegistry; runner: OgdGenericRunner } {
  const registry = new OgdDomainRegistry();

  // 4개 빌트인 어댑터 등록
  registry.register(new BdShapingOgdAdapter(env.AI));
  registry.register(new PrototypeOgdAdapter(env.AI));
  registry.register(new CodeReviewOgdAdapter(env.AI));
  registry.register(new DocVerifyOgdAdapter(env.AI));

  const runner = new OgdGenericRunner(registry, env.DB);
  return { registry, runner };
}

// POST /ogd/run — O-G-D Loop 실행
ogdGenericRoute.post("/ogd/run", async (c) => {
  const tenantId = c.get("orgId");
  const raw = await c.req.json();
  const parsed = OgdRunRequestSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { runner } = createRunner(c.env);

  try {
    const result = await runner.run({
      domain: parsed.data.domain,
      input: parsed.data.input ?? {},
      rubric: parsed.data.rubric,
      maxRounds: parsed.data.maxRounds,
      minScore: parsed.data.minScore,
      tenantId,
    });
    return c.json(result);
  } catch (e) {
    if (e instanceof OgdDomainNotFoundError) {
      return c.json({ error: e.message }, 404);
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// GET /ogd/domains — 등록된 도메인 목록
ogdGenericRoute.get("/ogd/domains", async (c) => {
  const { registry } = createRunner(c.env);
  const domains = registry.list().map((a) => ({
    domain: a.domain,
    displayName: a.displayName,
    description: a.description,
    adapterType: "builtin",
    defaultMaxRounds: 3,
    defaultMinScore: 0.85,
    enabled: true,
  }));
  return c.json({ domains });
});

// GET /ogd/runs — 실행 이력
ogdGenericRoute.get("/ogd/runs", async (c) => {
  const tenantId = c.get("orgId");
  const limit = Number(c.req.query("limit") ?? 20);
  const { runner } = createRunner(c.env);
  const runs = await runner.getRunHistory(tenantId, limit);
  return c.json({ runs });
});

// GET /ogd/runs/:runId — 특정 실행 상세
ogdGenericRoute.get("/ogd/runs/:runId", async (c) => {
  const tenantId = c.get("orgId");
  const runId = c.req.param("runId");
  const { runner } = createRunner(c.env);
  const result = await runner.getRunById(runId, tenantId);
  if (!result) return c.json({ error: "Run not found" }, 404);
  return c.json(result);
});
