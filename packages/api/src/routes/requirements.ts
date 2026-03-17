import { Hono } from "hono";
import { join } from "node:path";
import type { RequirementItem } from "@foundry-x/shared";
import { getProjectRoot, readTextFile } from "../services/data-reader.js";

export const requirementsRoute = new Hono();

function parseSpecRequirements(specContent: string): RequirementItem[] {
  const items: RequirementItem[] = [];
  const lines = specContent.split("\n");

  // Match table rows like: | F1 | REQ-001 | Title | v0.1.0 | DONE | note |
  const rowPattern = /^\|\s*(F\d+)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|/;

  for (const line of lines) {
    const match = rowPattern.exec(line);
    if (!match) continue;

    const id = match[1] ?? "";
    const reqCode = match[2] ?? "";
    const title = match[3] ?? "";
    const version = match[4] ?? "";
    const rawStatus = match[5] ?? "";
    const note = match[6] ?? "";
    const statusLower = rawStatus.trim().toLowerCase();

    let status: RequirementItem["status"] = "planned";
    if (statusLower === "done" || statusLower === "completed") {
      status = "done";
    } else if (
      statusLower === "in_progress" ||
      statusLower === "in progress" ||
      statusLower === "wip"
    ) {
      status = "in_progress";
    }

    items.push({
      id: id.trim(),
      reqCode: reqCode.trim(),
      title: title.trim(),
      version: version.trim(),
      status,
      note: note.trim(),
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

requirementsRoute.put("/requirements/:id", async (c) => {
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
