import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MarkerFile, RepoMode, RepoProfile } from './types.js';

const MARKER_NAMES = [
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

async function scanMarkers(cwd: string): Promise<MarkerFile[]> {
  return Promise.all(
    MARKER_NAMES.map(async (name) => {
      const path = join(cwd, name);
      return { name, path, exists: await fileExists(path) };
    }),
  );
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
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
    markers,
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

  const pkgMarker = markers.find((m) => m.name === 'package.json');
  if (pkgMarker?.exists) {
    const raw = await readFile(join(cwd, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as PackageJson;
    const result = detectFromPackageJson(pkg);
    languages = result.languages;
    frameworks = result.frameworks;
    testFrameworks = result.testFrameworks;

    if (await fileExists(join(cwd, 'pnpm-lock.yaml'))) buildTools.push('pnpm');
    else if (await fileExists(join(cwd, 'yarn.lock'))) buildTools.push('yarn');
    else buildTools.push('npm');
  }

  if (markers.find((m) => m.name === 'go.mod')?.exists) {
    if (!languages.includes('go')) languages.push('go');
  }
  if (markers.find((m) => m.name === 'Pipfile')?.exists) {
    if (!languages.includes('python')) languages.push('python');
  }
  if (markers.find((m) => m.name === 'Cargo.toml')?.exists) {
    if (!languages.includes('rust')) languages.push('rust');
  }
  if (markers.find((m) => m.name === 'pom.xml')?.exists) {
    if (!languages.includes('java')) languages.push('java');
    buildTools.push('maven');
  }

  const ci = await detectCI(cwd);

  return {
    mode,
    languages,
    frameworks,
    buildTools,
    testFrameworks,
    ci,
    markers,
  };
}
