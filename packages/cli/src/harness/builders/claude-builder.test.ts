import { describe, it, expect } from 'vitest';
import { buildClaude } from './claude-builder.js';
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

describe('buildClaude', () => {
  it('includes project overview with language and framework', () => {
    const result = buildClaude(BASE_PROFILE);

    expect(result).toContain('# CLAUDE.md');
    expect(result).toContain('Language: typescript');
    expect(result).toContain('Framework: react');
    expect(result).toContain('Architecture: single-package');
  });

  it('auto-detects commands from scripts field', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      scripts: { build: 'tsc', test: 'vitest run', lint: 'eslint src/' },
    };

    const result = buildClaude(profile);

    expect(result).toContain('Build: `pnpm run build`');
    expect(result).toContain('Test: `pnpm run test`');
    expect(result).toContain('Lint: `pnpm run lint`');
  });

  it('infers commands from stack when no scripts', () => {
    const result = buildClaude(BASE_PROFILE);

    expect(result).toContain('Build: `tsc --noEmit`');
    expect(result).toContain('Test: `npx vitest run`');
  });

  it('uses correct package manager prefix', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      packageManager: 'yarn',
      scripts: { test: 'vitest' },
    };

    const result = buildClaude(profile);
    expect(result).toContain('Test: `yarn run test`');
  });

  it('includes evolution rules', () => {
    const result = buildClaude(BASE_PROFILE);
    expect(result).toContain('하네스 갱신 규칙');
    expect(result).toContain('foundry-x status');
  });

  it('shows test framework in overview', () => {
    const result = buildClaude(BASE_PROFILE);
    expect(result).toContain('Test: vitest');
  });
});
