import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import type { RequirementItem } from "@foundry-x/shared";
import { rbac } from "../middleware/rbac.js";
import {
  RequirementSchema,
  ReqUpdateSchema,
  ReqIdParamSchema,
} from "../schemas/requirements.js";
import { ErrorSchema, validationHook } from "../schemas/common.js";

export const requirementsRoute = new OpenAPIHono({
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

function parseStatusEmoji(raw: string): RequirementItem["status"] {
  const s = raw.trim().toLowerCase();
  if (s === "done" || s === "completed") return "done";
  if (s === "in_progress" || s === "in progress" || s === "wip") return "in_progress";
  if (s === "planned") return "planned";
  return "planned";
}

function parseSpecRequirements(specContent: string): RequirementItem[] {
  const items: RequirementItem[] = [];
  const lines = specContent.split("\n");

  const rowPattern = /^\|\s*(F\d+)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|/;
  const reqPattern = /\((FX-REQ-\d+)[^)]*\)/;

  for (const line of lines) {
    const match = rowPattern.exec(line);
    if (!match) continue;

    const id = (match[1] ?? "").trim();
    const rawTitle = (match[2] ?? "").trim();
    const version = (match[3] ?? "").trim();
    const rawStatus = (match[4] ?? "").trim();
    const note = (match[5] ?? "").trim();

    const reqMatch = reqPattern.exec(rawTitle);
    const reqCode = reqMatch?.[1] ?? "";
    const title = rawTitle.replace(/\s*\([^)]*\)\s*$/, "").trim();

    items.push({
      id,
      reqCode,
      title,
      version,
      status: parseStatusEmoji(rawStatus),
      note,
    });
  }

  return items;
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

requirementsRoute.openapi(listRequirements, (c) => {
  return c.json(MOCK_REQUIREMENTS);
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

  const updated: RequirementItem = { ...item, status };
  return c.json(updated);
});

export { parseSpecRequirements };
