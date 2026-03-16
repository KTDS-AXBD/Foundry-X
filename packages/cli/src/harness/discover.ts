import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerFile, RepoMode, RepoProfile } from '@foundry-x/shared';

const MARKER_MAP: Record<string, MarkerFile['type']> = {
  'package.json': 'node',
  'go.mod': 'go',
  'pom.xml': 'java',
  'Pipfile': 'python',
  'Cargo.toml': 'unknown',
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function scanMarkers(cwd: string): Promise<MarkerFile[]> {
  const found: MarkerFile[] = [];
  for (const [name, type] of Object.entries(MARKER_MAP)) {
    if (await fileExists(join(cwd, name))) {
      found.push({ path: name, type });
    }
  }
  return found;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

function detectFromPackageJson(pkg: PackageJson): {
  languages: string[];
  frameworks: string[];
  testFrameworks: string[];
} {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const devDeps = pkg.devDependencies ?? {};

  const languages: string[] = [];
  const frameworks: string[] = [];
  const testFrameworks: string[] = [];

  if ('typescript' in devDeps || 'typescript' in deps) {
    languages.push('typescript', 'javascript');
  } else {
    languages.push('javascript');
  }

  if ('react' in deps) frameworks.push('react');
  if ('next' in deps) frameworks.push('next');
  if ('express' in deps) frameworks.push('express');
  if ('hono' in deps) frameworks.push('hono');
  if ('fastify' in deps) frameworks.push('fastify');

  if ('vitest' in devDeps) testFrameworks.push('vitest');
  if ('jest' in devDeps) testFrameworks.push('jest');
  if ('mocha' in devDeps) testFrameworks.push('mocha');

  return { languages, frameworks, testFrameworks };
}

async function detectCI(cwd: string): Promise<string | undefined> {
  if (await fileExists(join(cwd, '.github', 'workflows'))) {
    return 'github-actions';
  }
  if (await fileExists(join(cwd, '.gitlab-ci.yml'))) {
    return 'gitlab-ci';
  }
  return undefined;
}

function greenfieldDefault(markers: MarkerFile[]): RepoProfile {
  return {
    mode: 'greenfield',
    languages: ['typescript'],
    frameworks: [],
    buildTools: ['pnpm'],
    testFrameworks: [],
    ci: null,
    packageManager: 'pnpm',
    markers,
    entryPoints: [],
    modules: [],
    architecturePattern: 'single-package',
  };
}

export async function discoverStack(
  cwd: string,
  mode: RepoMode,
): Promise<RepoProfile> {
  const markers = await scanMarkers(cwd);

  if (mode === 'greenfield') {
    return greenfieldDefault(markers);
  }

  // Brownfield detection
  let languages: string[] = [];
  let frameworks: string[] = [];
  const buildTools: string[] = [];
  let testFrameworks: string[] = [];

  let packageManager: string | null = null;

  let pkg: PackageJson | null = null;
  const pkgMarker = markers.find((m) => m.path === 'package.json');
  if (pkgMarker) {
    const raw = await readFile(join(cwd, 'package.json'), 'utf-8');
    pkg = JSON.parse(raw) as PackageJson;
    const result = detectFromPackageJson(pkg);
    languages = result.languages;
    frameworks = result.frameworks;
    testFrameworks = result.testFrameworks;

    if (await fileExists(join(cwd, 'pnpm-lock.yaml'))) {
      buildTools.push('pnpm');
      packageManager = 'pnpm';
    } else if (await fileExists(join(cwd, 'yarn.lock'))) {
      buildTools.push('yarn');
      packageManager = 'yarn';
    } else {
      buildTools.push('npm');
      packageManager = 'npm';
    }
  }

  if (markers.find((m) => m.path === 'go.mod')) {
    if (!languages.includes('go')) languages.push('go');
  }
  if (markers.find((m) => m.path === 'Pipfile')) {
    if (!languages.includes('python')) languages.push('python');
  }
  if (markers.find((m) => m.path === 'Cargo.toml')) {
    if (!languages.includes('rust')) languages.push('rust');
  }
  if (markers.find((m) => m.path === 'pom.xml')) {
    if (!languages.includes('java')) languages.push('java');
    buildTools.push('maven');
  }

  const ci = await detectCI(cwd);

  // Detect relevant scripts from package.json (reuse parsed pkg)
  const RELEVANT_SCRIPT_KEYS = ['build', 'test', 'lint', 'dev', 'typecheck', 'start', 'format'] as const;
  let scripts: Record<string, string> | undefined;
  if (pkg?.scripts) {
    const found: Record<string, string> = {};
    for (const key of RELEVANT_SCRIPT_KEYS) {
      if (pkg.scripts[key]) found[key] = pkg.scripts[key];
    }
    if (Object.keys(found).length > 0) scripts = found;
  }

  return {
    mode,
    languages,
    frameworks,
    buildTools,
    testFrameworks,
    ci: ci ?? null,
    packageManager,
    markers,
    entryPoints: [],
    modules: [],
    architecturePattern: 'single-package',
    scripts,
  };
}
