import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ModuleInfo, RepoProfile } from './types.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function detectArchitecturePattern(
  cwd: string,
): Promise<'monorepo' | 'single-package'> {
  const monorepoIndicators = [
    'pnpm-workspace.yaml',
    'lerna.json',
    'turbo.json',
  ];

  for (const indicator of monorepoIndicators) {
    if (await fileExists(join(cwd, indicator))) {
      return 'monorepo';
    }
  }
  return 'single-package';
}

async function discoverModules(cwd: string): Promise<ModuleInfo[]> {
  const packagesDir = join(cwd, 'packages');
  if (!(await fileExists(packagesDir))) return [];

  const entries = await readdir(packagesDir, { withFileTypes: true });
  const modules: ModuleInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pkgPath = join(packagesDir, entry.name, 'package.json');
    if (await fileExists(pkgPath)) {
      const raw = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw) as { name?: string };
      modules.push({
        name: pkg.name ?? entry.name,
        path: join('packages', entry.name),
      });
    } else {
      modules.push({
        name: entry.name,
        path: join('packages', entry.name),
      });
    }
  }

  return modules;
}

const ENTRY_CANDIDATES = [
  'src/index.ts',
  'src/main.ts',
  'src/index.js',
  'src/main.js',
  'main.py',
  'app.py',
  'main.go',
  'cmd/main.go',
  'src/main.rs',
  'src/lib.rs',
] as const;

async function discoverEntryPoints(cwd: string): Promise<string[]> {
  const found: string[] = [];
  for (const candidate of ENTRY_CANDIDATES) {
    if (await fileExists(join(cwd, candidate))) {
      found.push(candidate);
    }
  }
  return found;
}

export async function analyzeArchitecture(
  cwd: string,
  profile: RepoProfile,
): Promise<RepoProfile> {
  const architecturePattern = await detectArchitecturePattern(cwd);
  const modules = await discoverModules(cwd);
  const entryPoints = await discoverEntryPoints(cwd);

  return {
    ...profile,
    architecturePattern,
    modules: modules.length > 0 ? modules : undefined,
    entryPoints: entryPoints.length > 0 ? entryPoints : undefined,
  };
}
