/**
 * Build-time content loader for TinaCMS-managed Markdown files.
 * Parses YAML frontmatter from raw Markdown strings (imported via Vite ?raw).
 * Falls back gracefully if parsing fails.
 */

/** Parse YAML frontmatter from a raw Markdown string. */
export function parseFrontmatter<T>(
  raw: string,
): { data: Partial<T>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {} as Partial<T>, body: raw.trim() };

  const [, frontmatterStr, body] = match;
  const data: Record<string, unknown> = {};

  // Simple YAML parser — handles scalars, simple lists, and list-of-objects
  let currentKey = "";
  let currentList: Record<string, string>[] | null = null;
  let currentObj: Record<string, string> | null = null;

  for (const line of frontmatterStr.split("\n")) {
    const trimmed = line.trimEnd();

    // List-of-objects: "  - key: value" (start new object)
    const listObjMatch = trimmed.match(/^\s{2}- (\w+):\s*"?(.*?)"?\s*$/);
    if (listObjMatch && currentList !== null) {
      if (currentObj) currentList.push(currentObj);
      currentObj = { [listObjMatch[1]]: listObjMatch[2] };
      continue;
    }

    // List-of-objects continuation: "    key: value"
    const contMatch = trimmed.match(/^\s{4}(\w+):\s*"?(.*?)"?\s*$/);
    if (contMatch && currentObj !== null) {
      currentObj[contMatch[1]] = contMatch[2];
      continue;
    }

    // Flush pending list object
    if (currentObj && currentList) {
      currentList.push(currentObj);
      currentObj = null;
    }

    // Flush pending list
    if (currentList && currentKey) {
      data[currentKey] = currentList;
      currentList = null;
    }

    // Top-level "key: value"
    const kvMatch = trimmed.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      if (kvMatch[2] === "") {
        // Could be start of a list
        currentList = [];
        currentObj = null;
      } else {
        data[currentKey] = kvMatch[2];
      }
    }
  }

  // Flush remaining
  if (currentObj && currentList) currentList.push(currentObj);
  if (currentList && currentKey) data[currentKey] = currentList;

  return { data: data as Partial<T>, body: body.trim() };
}

/** Landing hero content shape */
export interface HeroContent {
  title: string;
  section: string;
  tagline: string;
  phase: string;
  phaseTitle: string;
  stats: Array<{ value: string; label: string }>;
}
