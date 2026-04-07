import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  ClassificationRuleSchema,
  UpdateRuleSchema,
  RuleQuerySchema,
  RuleListResponseSchema,
  RuleUpdateResponseSchema,
  ErrorResponseSchema,
} from "../schemas/governance.js";
import type { Env } from "../../../env.js";
import type { JwtPayload } from "../../../middleware/auth.js";

export const governanceRoute = new OpenAPIHono<{ Bindings: Env }>();

function getTenantId(c: { get: (key: string) => unknown }): string {
  try {
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    return payload?.orgId || "default";
  } catch {
    return "default";
  }
}

function isAdmin(c: { get: (key: string) => unknown }): boolean {
  try {
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    return payload?.role === "admin";
  } catch {
    return false;
  }
}

// ─── GET /api/governance/rules ───

const listRules = createRoute({
  method: "get",
  path: "/governance/rules",
  tags: ["Governance"],
  summary: "데이터 분류 규칙 조회",
  request: {
    query: RuleQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: RuleListResponseSchema } },
      description: "분류 규칙 목록",
    },
  },
});

governanceRoute.openapi(listRules, async (c) => {
  const { classification, isActive } = c.req.valid("query");
  const tenantId = getTenantId(c);

  let query = "SELECT * FROM data_classification_rules WHERE tenant_id = ?";
  const params: unknown[] = [tenantId];

  if (classification) {
    query += " AND classification = ?";
    params.push(classification);
  }

  if (isActive !== undefined) {
    query += " AND is_active = ?";
    params.push(isActive ? 1 : 0);
  }

  query += " ORDER BY created_at DESC";

  const stmt = c.env.DB.prepare(query);
  const { results } = await stmt.bind(...params).all<{
    id: string;
    tenant_id: string;
    pattern_name: string;
    pattern_regex: string;
    classification: string;
    masking_strategy: string;
    is_active: number;
    created_at: string;
    updated_at: string;
  }>();

  const rules = (results || []).map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    patternName: r.pattern_name,
    patternRegex: r.pattern_regex,
    classification: r.classification as "public" | "internal" | "confidential" | "restricted",
    maskingStrategy: r.masking_strategy as "redact" | "hash" | "partial" | "tokenize",
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return c.json({ rules, total: rules.length });
});

// ─── PUT /api/governance/rules/:id ───

const updateRule = createRoute({
  method: "put",
  path: "/governance/rules/{id}",
  tags: ["Governance"],
  summary: "분류 규칙 수정 (admin 전용)",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: UpdateRuleSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RuleUpdateResponseSchema } },
      description: "수정된 규칙",
    },
    403: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "권한 없음",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "규칙 없음",
    },
  },
});

governanceRoute.openapi(updateRule, async (c) => {
  if (!isAdmin(c)) {
    return c.json({ error: "Admin role required" }, 403);
  }

  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");
  const tenantId = getTenantId(c);

  // Check rule exists and belongs to tenant
  const existing = await c.env.DB.prepare(
    "SELECT * FROM data_classification_rules WHERE id = ? AND tenant_id = ?",
  )
    .bind(id, tenantId)
    .first<{
      id: string;
      tenant_id: string;
      pattern_name: string;
      pattern_regex: string;
      classification: string;
      masking_strategy: string;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>();

  if (!existing) {
    return c.json({ error: "Rule not found" }, 404);
  }

  // Build SET clause dynamically
  const setClauses: string[] = ["updated_at = datetime('now')"];
  const setParams: unknown[] = [];

  if (updates.classification !== undefined) {
    setClauses.push("classification = ?");
    setParams.push(updates.classification);
  }
  if (updates.maskingStrategy !== undefined) {
    setClauses.push("masking_strategy = ?");
    setParams.push(updates.maskingStrategy);
  }
  if (updates.isActive !== undefined) {
    setClauses.push("is_active = ?");
    setParams.push(updates.isActive ? 1 : 0);
  }

  setParams.push(id, tenantId);
  await c.env.DB.prepare(
    `UPDATE data_classification_rules SET ${setClauses.join(", ")} WHERE id = ? AND tenant_id = ?`,
  )
    .bind(...setParams)
    .run();

  // Fetch updated rule
  const updated = await c.env.DB.prepare(
    "SELECT * FROM data_classification_rules WHERE id = ?",
  )
    .bind(id)
    .first<{
      id: string;
      tenant_id: string;
      pattern_name: string;
      pattern_regex: string;
      classification: string;
      masking_strategy: string;
      is_active: number;
      created_at: string;
      updated_at: string;
    }>();

  const rule = {
    id: updated!.id,
    tenantId: updated!.tenant_id,
    patternName: updated!.pattern_name,
    patternRegex: updated!.pattern_regex,
    classification: updated!.classification as "public" | "internal" | "confidential" | "restricted",
    maskingStrategy: updated!.masking_strategy as "redact" | "hash" | "partial" | "tokenize",
    isActive: updated!.is_active === 1,
    createdAt: updated!.created_at,
    updatedAt: updated!.updated_at,
  };

  return c.json({ updated: true, rule });
});
