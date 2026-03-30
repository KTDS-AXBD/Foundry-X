import { describe, it, expect } from 'vitest';
import { buildProjectContext } from './project-context-builder.js';
import type { RepoProfile } from '@foundry-x/shared';

function makeProfile(overrides: Partial<RepoProfile> = {}): RepoProfile {
  return {
    mode: 'brownfield',
    languages: ['typescript', 'javascript'],
    frameworks: ['react', 'next'],
    buildTools: ['pnpm'],
    testFrameworks: ['vitest'],
    ci: 'github-actions',
    packageManager: 'pnpm',
    markers: [],
    entryPoints: ['src/index.ts'],
    modules: [],
    architecturePattern: 'monorepo',
    existingDocs: [
      { path: 'README.md', type: 'readme' },
      { path: 'docs', type: 'docs' },
    ],
    directoryStructure: [
      { name: 'src/routes', role: 'routes' },
      { name: 'src/services', role: 'services', children: [{ name: 'auth', role: 'unknown' }] },
    ],
    projectContext: {
      summary: 'An awesome project',
      hasMonorepo: true,
      docCount: 2,
      topLevelDirs: ['src/routes', 'src/services'],
    },
    ...overrides,
  };
}

describe('buildProjectContext', () => {
  it('generates complete project-context.md with all sections', () => {
    const md = buildProjectContext(makeProfile());

    expect(md).toContain('# Project Context');
    expect(md).toContain('An awesome project');
    expect(md).toContain('typescript, javascript');
    expect(md).toContain('react, next');
    expect(md).toContain('src/routes/  (routes)');
    expect(md).toContain('`README.md` (readme)');
    expect(md).toContain('`src/index.ts`');
    expect(md).toContain('**monorepo**');
  });

  it('handles greenfield profile with minimal data', () => {
    const md = buildProjectContext(makeProfile({
      mode: 'greenfield',
      frameworks: [],
      existingDocs: [],
      directoryStructure: [],
      projectContext: undefined,
      entryPoints: [],
      architecturePattern: 'single-package',
    }));

    expect(md).toContain('# Project Context');
    expect(md).toContain('No README found');
    expect(md).not.toContain('## Directory Structure');
    expect(md).not.toContain('## Existing Documentation');
    expect(md).not.toContain('## Entry Points');
  });

  it('renders directory children', () => {
    const md = buildProjectContext(makeProfile());

    expect(md).toContain('  auth/');
  });
});
