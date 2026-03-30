export interface SpecRequirement {
  id: string;
  title: string;
  reqCode: string;
  priority: string;
  version: string;
  status: "planned" | "in_progress" | "done" | "rejected";
  notes: string;
}

export function parseSpecRequirements(
  specContent: string,
): SpecRequirement[] {
  const requirements: SpecRequirement[] = [];

  const tableRowRegex =
    /\|\s*F(\d+)\s*\|\s*(.+?)\s*\(([A-Z-]+\d+),\s*(P\d)\)\s*\|\s*(v[\d.]+)\s*\|\s*(\S+)\s*\|\s*(.*?)\s*\|/g;

  let match: RegExpExecArray | null;
  while ((match = tableRowRegex.exec(specContent)) !== null) {
    const fNum = match[1] ?? "";
    const title = (match[2] ?? "").trim();
    const reqCode = match[3] ?? "";
    const priority = match[4] ?? "";
    const version = match[5] ?? "";
    const statusEmoji = match[6] ?? "";
    const notes = (match[7] ?? "").trim();

    requirements.push({
      id: `F${fNum}`,
      title,
      reqCode,
      priority,
      version,
      status: parseStatusEmoji(statusEmoji),
      notes,
    });
  }

  return requirements;
}

export function parseStatusEmoji(
  emoji: string,
): SpecRequirement["status"] {
  if (emoji.includes("\u2705")) return "done";
  if (emoji.includes("\uD83D\uDD27")) return "in_progress";
  if (emoji.includes("\uD83D\uDCCB")) return "planned";
  if (emoji.includes("\u274C")) return "rejected";
  return "planned";
}

// ─── F222: Spec Delta Parsing ───

export interface SpecDeltaParsed {
  added: string[];
  modified: string[];
  removed: string[];
}

/** changes/ 구조의 spec-delta.md 파싱 */
export function parseSpecDeltas(content: string): SpecDeltaParsed {
  const delta: SpecDeltaParsed = { added: [], modified: [], removed: [] };
  let currentSection: keyof SpecDeltaParsed | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (/^##\s+added/i.test(trimmed)) {
      currentSection = "added";
    } else if (/^##\s+modified/i.test(trimmed)) {
      currentSection = "modified";
    } else if (/^##\s+removed/i.test(trimmed)) {
      currentSection = "removed";
    } else if (currentSection && trimmed.startsWith("- ")) {
      delta[currentSection].push(trimmed.slice(2).trim());
    }
  }

  return delta;
}
