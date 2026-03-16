import { describe, it, expect } from 'vitest';
import { buildAgents } from './agents-builder.js';
import type { RepoProfile } from '@foundry-x/shared';

const BASE_PROFILE: RepoProfile = {
  mode: 'brownfield',
  languages: ['typescript'],
  frameworks: ['react'],
  buildTools: ['pnpm'],
  testFrameworks: ['vitest'],
  ci: null,
  packageManager: 'pnpm',
  markers: [],
  entryPoints: [],
  modules: [],
  architecturePattern: 'single-package',
};

describe('buildAgents', () => {
  it('includes project overview with language and framework', () => {
    const result = buildAgents(BASE_PROFILE);

    expect(result).toContain('# AGENTS.md');
    expect(result).toContain('Language: typescript');
    expect(result).toContain('Framework: react');
  });

  it('includes test framework in workflow', () => {
    const result = buildAgents(BASE_PROFILE);

    expect(result).toContain('## Workflow');
    expect(result).toContain('vitest');
  });

  it('includes lint step when lint script exists', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      scripts: { lint: 'eslint src/' },
    };

    const result = buildAgents(profile);

    expect(result).toContain('lint');
    expect(result).toContain('pnpm run lint');
  });

  it('includes typecheck step for TypeScript projects', () => {
    const result = buildAgents(BASE_PROFILE);

    expect(result).toContain('typecheck');
    expect(result).toContain('tsc --noEmit');
  });

  it('lists modules for monorepo projects', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      architecturePattern: 'monorepo',
      modules: [
        { name: 'cli', path: 'packages/cli', role: 'CLI' },
        { name: 'shared', path: 'packages/shared', role: 'types' },
      ],
    };

    const result = buildAgents(profile);

    expect(result).toContain('Modules: cli, shared');
  });

  it('includes evolution rules', () => {
    const result = buildAgents(BASE_PROFILE);
    expect(result).toContain('하네스 갱신 규칙');
  });
});
