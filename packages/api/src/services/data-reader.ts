import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  RepoProfile,
  HarnessIntegrity,
  HealthScore,
} from "@foundry-x/shared";
import type { FreshnessReport } from "@foundry-x/shared";

// ─── Project Root ───

export function getProjectRoot(): string {
  return process.env.PROJECT_ROOT ?? process.cwd();
}

export function foundryXPath(filename: string): string {
  return join(getProjectRoot(), ".foundry-x", filename);
}

// ─── Generic File I/O ───

export async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function readTextFile(
  path: string,
  fallback: string,
): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return fallback;
  }
}

export async function writeTextFile(
  path: string,
  content: string,
): Promise<void> {
  await writeFile(path, content, "utf-8");
}

// ─── Mock Data ───

export const MOCK_PROFILE: RepoProfile = {
  mode: "brownfield",
  languages: ["TypeScript", "Python"],
  frameworks: ["Hono", "Ink", "Vitest"],
  buildTools: ["tsc", "turborepo"],
  testFrameworks: ["vitest"],
  ci: "github-actions",
  packageManager: "pnpm",
  markers: [
    { path: "package.json", type: "node" },
    { path: "pyproject.toml", type: "python" },
  ],
  entryPoints: ["packages/cli/src/index.ts", "packages/api/src/index.ts"],
  modules: [
    { name: "cli", path: "packages/cli", role: "CLI application" },
    { name: "api", path: "packages/api", role: "API server" },
    { name: "shared", path: "packages/shared", role: "Shared types" },
  ],
  architecturePattern: "monorepo",
};

export const MOCK_INTEGRITY: HarnessIntegrity = {
  passed: true,
  score: 92,
  checks: [
    {
      name: "CLAUDE.md exists",
      passed: true,
      level: "PASS",
      message: "CLAUDE.md found at project root",
    },
    {
      name: "ARCHITECTURE.md exists",
      passed: true,
      level: "PASS",
      message: "ARCHITECTURE.md found",
    },
    {
      name: "CI config exists",
      passed: true,
      level: "PASS",
      message: ".github/workflows/ detected",
    },
    {
      name: "Lint config exists",
      passed: true,
      level: "PASS",
      message: "eslint.config.js found",
    },
    {
      name: "No placeholder content",
      passed: false,
      level: "WARN",
      message: "1 file contains TODO placeholders",
    },
  ],
};

export const MOCK_HEALTH: HealthScore = {
  overall: 82,
  specToCode: 85,
  codeToTest: 78,
  specToTest: 80,
  grade: "B",
};

export const MOCK_FRESHNESS: FreshnessReport = {
  documents: [
    {
      file: "CLAUDE.md",
      lastModified: "2026-03-17T00:00:00Z",
      codeLastCommit: "2026-03-17T00:00:00Z",
      stale: false,
      staleDays: 0,
    },
    {
      file: "ARCHITECTURE.md",
      lastModified: "2026-03-15T00:00:00Z",
      codeLastCommit: "2026-03-17T00:00:00Z",
      stale: true,
      staleDays: 2,
    },
  ],
  overallStale: true,
  checkedAt: new Date().toISOString(),
};
