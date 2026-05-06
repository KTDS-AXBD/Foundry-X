import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import type { RequirementItem } from "@foundry-x/shared";
import type { Env } from "../env.js";
import { rbac } from "../middleware/rbac.js";
import {
  RequirementSchema,
  ReqUpdateSchema,
  ReqIdParamSchema,
} from "../schemas/requirements.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";
import { GitHubService } from "../modules/portal/services/github.js";
import { KVCacheService } from "../core/infra/kv-cache.js";
import {
  parseSpecRequirements as parseSpecFItems,
  type SpecRequirement,
} from "../core/spec/services/spec-parser.js";

export const requirementsRoute = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: validationHook as any,
});

// ─── Mock Data (replaces SPEC.md filesystem read) ───

const MOCK_REQUIREMENTS: RequirementItem[] = [
  { id: "F1", reqCode: "FX-REQ-001", title: "CLI Init", version: "v0.1.0", status: "done", note: "Phase 1 complete" },
  { id: "F2", reqCode: "FX-REQ-002", title: "CLI Status", version: "v0.2.0", status: "done", note: "Phase 1 complete" },
  { id: "F3", reqCode: "FX-REQ-003", title: "CLI Sync", version: "v0.3.0", status: "done", note: "Phase 1 complete" },
  { id: "F37", reqCode: "FX-REQ-037", title: "배포 파이프라인", version: "v0.6.0", status: "done", note: "Sprint 6" },
  { id: "F38", reqCode: "FX-REQ-038", title: "OpenAPI 동적 스펙", version: "v0.7.0", status: "in_progress", note: "Sprint 7" },
  { id: "F39", reqCode: "FX-REQ-039", title: "D1 스키마", version: "v0.6.0", status: "done", note: "Sprint 6" },
  { id: "F40", reqCode: "FX-REQ-040", title: "JWT 인증", version: "v0.6.0", status: "done", note: "Sprint 6" },
  { id: "F41", reqCode: "FX-REQ-041", title: "API 실데이터 연동", version: "v0.7.0", status: "in_progress", note: "Sprint 7" },
];

function toRequirementItem(spec: SpecRequirement): RequirementItem {
  return {
    id: spec.id,
    reqCode: spec.reqCode,
    title: spec.title,
    version: spec.version,
    status: spec.status === "rejected" ? "planned" : spec.status,
    note: spec.notes,
  };
}

// ─── RBAC middleware for write operations ───

requirementsRoute.put("/requirements/:id", rbac("member"));

// ─── GET /requirements ───

const listRequirements = createRoute({
  method: "get",
  path: "/requirements",
  tags: ["Requirements"],
  summary: "List all requirements from SPEC.md",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(RequirementSchema) } },
      description: "Parsed F-items from SPEC.md",
    },
  },
});

requirementsRoute.openapi(listRequirements, async (c) => {
  let items: RequirementItem[];
  try {
    const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
    const cache = new KVCacheService(c.env.CACHE);

    const specItems = await cache.getOrFetch<SpecRequirement[]>(
      "spec:requirements",
      async () => {
        const { content } = await github.getFileContent("SPEC.md");
        return parseSpecFItems(content);
      },
      300,
    );

    items = specItems.map(toRequirementItem);
  } catch {
    items = [...MOCK_REQUIREMENTS];
  }

  // Apply in-memory status overrides (ephemeral, isolate-scoped)
  return c.json(
    items.map((item) => {
      const override = statusOverrides.get(item.id);
      return override ? { ...item, status: override } : item;
    }),
  );
});

// ─── PUT /requirements/:id ───

const statusOverrides = new Map<string, RequirementItem["status"]>();

const updateRequirement = createRoute({
  method: "put",
  path: "/requirements/{id}",
  tags: ["Requirements"],
  summary: "Update requirement status",
  request: {
    params: ReqIdParamSchema,
    body: {
      content: { "application/json": { schema: ReqUpdateSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RequirementSchema } },
      description: "Updated requirement",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Requirement not found",
    },
  },
});

requirementsRoute.openapi(updateRequirement, (c) => {
  const { id } = c.req.valid("param");
  const { status } = c.req.valid("json");

  const item = MOCK_REQUIREMENTS.find((it) => it.id === id);
  if (!item) {
    return c.json({ error: `Requirement '${id}' not found` }, 404);
  }

  statusOverrides.set(id, status);

  // Return the updated item (override is ephemeral — Workers isolate scope only)
  const updated: RequirementItem = { ...item, status };
  return c.json(updated);
});


