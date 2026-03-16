import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { RepoMode } from '@foundry-x/shared';

const MARKER_FILES = [
  'package.json',
  'go.mod',
  'pom.xml',
  'Pipfile',
  'Cargo.toml',
] as const;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function detectRepoMode(
  cwd: string,
  forceMode?: RepoMode,
): Promise<RepoMode> {
  if (forceMode) return forceMode;

  const results = await Promise.all(
    MARKER_FILES.map((f) => fileExists(join(cwd, f))),
  );

  const found = results.some(Boolean);
  return found ? 'brownfield' : 'greenfield';
}
