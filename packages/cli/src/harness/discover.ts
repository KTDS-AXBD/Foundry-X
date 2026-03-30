import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DirNode, DocFile, MarkerFile, ProjectContext, RepoMode, RepoProfile } from '@foundry-x/shared';

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

  // F220: Brownfield context discovery
  const existingDocs = await discoverDocs(cwd);
  const directoryStructure = await discoverDirectoryStructure(cwd);
  const projectContext = await buildProjectContext(cwd, existingDocs, directoryStructure);

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
    existingDocs,
    directoryStructure,
    projectContext,
  };
}

// ─── F220: Brownfield Context Discovery ───

const DOC_PATTERNS: { pattern: string; type: DocFile['type']; isDir?: boolean }[] = [
  { pattern: 'README.md', type: 'readme' },
  { pattern: 'README', type: 'readme' },
  { pattern: 'CHANGELOG.md', type: 'changelog' },
  { pattern: 'CHANGES.md', type: 'changelog' },
  { pattern: 'CONTRIBUTING.md', type: 'contributing' },
  { pattern: 'SPEC.md', type: 'spec' },
  { pattern: 'docs', type: 'docs', isDir: true },
  { pattern: 'documentation', type: 'docs', isDir: true },
  { pattern: 'adr', type: 'adr', isDir: true },
  { pattern: 'docs/adr', type: 'adr', isDir: true },
];

export async function discoverDocs(cwd: string): Promise<DocFile[]> {
  const found: DocFile[] = [];
  for (const { pattern, type, isDir } of DOC_PATTERNS) {
    const fullPath = join(cwd, pattern);
    if (await fileExists(fullPath)) {
      if (isDir) {
        // For directories, only add if it's actually a directory
        try {
          const entries = await readdir(fullPath);
          if (entries.length > 0) {
            found.push({ path: pattern, type });
          }
        } catch {
          // not a directory or not readable
        }
      } else {
        found.push({ path: pattern, type });
      }
    }
  }
  return found;
}

const DIR_ROLE_MAP: Record<string, DirNode['role']> = {
  routes: 'routes',
  api: 'routes',
  services: 'services',
  lib: 'services',
  components: 'components',
  ui: 'components',
  test: 'tests',
  tests: 'tests',
  __tests__: 'tests',
  '.github': 'config',
  '.gitlab': 'config',
  '.circleci': 'config',
  docs: 'docs',
  documentation: 'docs',
};

function inferDirRole(name: string): DirNode['role'] {
  return DIR_ROLE_MAP[name] ?? 'unknown';
}

export async function discoverDirectoryStructure(cwd: string): Promise<DirNode[]> {
  const nodes: DirNode[] = [];

  // Scan src/ if it exists, otherwise scan top-level
  const srcPath = join(cwd, 'src');
  const hasSrc = await fileExists(srcPath);
  const scanRoot = hasSrc ? srcPath : cwd;
  const prefix = hasSrc ? 'src/' : '';

  try {
    const entries = await readdir(scanRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') && !DIR_ROLE_MAP[entry.name]) continue;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      const role = inferDirRole(entry.name);
      const node: DirNode = { name: `${prefix}${entry.name}`, role };

      // One level deeper for known roles
      if (role !== 'unknown') {
        try {
          const subEntries = await readdir(join(scanRoot, entry.name), { withFileTypes: true });
          const children: DirNode[] = subEntries
            .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
            .slice(0, 10) // limit to 10 subdirs
            .map((e) => ({ name: e.name, role: inferDirRole(e.name) }));
          if (children.length > 0) node.children = children;
        } catch {
          // not readable
        }
      }

      nodes.push(node);
    }
  } catch {
    // scanRoot not readable
  }

  return nodes;
}

export async function buildProjectContext(
  cwd: string,
  docs: DocFile[],
  dirs: DirNode[],
): Promise<ProjectContext> {
  // Extract summary from README
  let summary = 'No README found';
  const readme = docs.find((d) => d.type === 'readme');
  if (readme) {
    try {
      const content = await readFile(join(cwd, readme.path), 'utf-8');
      // Take first non-empty, non-heading paragraph
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('[')) {
          summary = trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed;
          break;
        }
      }
    } catch {
      // not readable
    }
  }

  // Detect monorepo
  const hasMonorepo =
    (await fileExists(join(cwd, 'pnpm-workspace.yaml'))) ||
    (await fileExists(join(cwd, 'lerna.json'))) ||
    (await fileExists(join(cwd, 'nx.json')));

  // Top-level dirs
  const topLevelDirs = dirs.map((d) => d.name);

  return {
    summary,
    hasMonorepo,
    docCount: docs.length,
    topLevelDirs,
  };
}
