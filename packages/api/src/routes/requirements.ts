import { Hono } from "hono";
import { join } from "node:path";
import type { RequirementItem } from "@foundry-x/shared";
import { getProjectRoot, readTextFile } from "../services/data-reader.js";
import { rbac } from "../middleware/rbac.js";

export const requirementsRoute = new Hono();

function parseStatusEmoji(raw: string): RequirementItem["status"] {
  const s = raw.trim().toLowerCase();
  if (s === "✅" || s === "done" || s === "completed") return "done";
  if (s === "🔧" || s === "in_progress" || s === "in progress" || s === "wip") return "in_progress";
  if (s === "📋" || s === "planned") return "planned";
  return "planned";
}

function parseSpecRequirements(specContent: string): RequirementItem[] {
  const items: RequirementItem[] = [];
  const lines = specContent.split("\n");

  // SPEC.md 5-column format:
  // | F1 | 제목 (FX-REQ-001, P1) | v0.1 | ✅ | 비고 |
  const rowPattern = /^\|\s*(F\d+)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|/;
  // Extract REQ code from title: "제목 (FX-REQ-001, P1)" → "FX-REQ-001"
  const reqPattern = /\((FX-REQ-\d+)[^)]*\)/;

  for (const line of lines) {
    const match = rowPattern.exec(line);
    if (!match) continue;

    const id = (match[1] ?? "").trim();
    const rawTitle = (match[2] ?? "").trim();
    const version = (match[3] ?? "").trim();
    const rawStatus = (match[4] ?? "").trim();
    const note = (match[5] ?? "").trim();

    // Extract reqCode and clean title
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

requirementsRoute.get("/requirements", async (c) => {
  const specPath = join(getProjectRoot(), "SPEC.md");
  const content = await readTextFile(specPath, "");

  if (!content) {
    return c.json([]);
  }

  const items = parseSpecRequirements(content);
  return c.json(items);
});

// In-memory mock store for status overrides (SPEC.md는 직접 수정하지 않음)
const statusOverrides = new Map<string, RequirementItem["status"]>();

requirementsRoute.put("/requirements/:id", rbac("member"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ status: RequirementItem["status"] }>();

  const validStatuses: RequirementItem["status"][] = ["planned", "in_progress", "done"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return c.json(
      { error: `status must be one of: ${validStatuses.join(", ")}` },
      400,
    );
  }

  // Parse SPEC.md to find the item
  const specPath = join(getProjectRoot(), "SPEC.md");
  const content = await readTextFile(specPath, "");
  const items = parseSpecRequirements(content);
  const item = items.find((it) => it.id === id);

  if (!item) {
    return c.json({ error: `Requirement '${id}' not found` }, 404);
  }

  // Apply override (mock — SPEC.md unchanged)
  statusOverrides.set(id, body.status);

  const updated: RequirementItem = { ...item, status: body.status };
  return c.json(updated);
});
