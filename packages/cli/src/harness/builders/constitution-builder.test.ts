import { describe, it, expect } from 'vitest';
import { buildConstitution } from './constitution-builder.js';
import type { RepoProfile } from '@foundry-x/shared';

const BASE_PROFILE: RepoProfile = {
  mode: 'brownfield',
  languages: ['typescript'],
  frameworks: [],
  buildTools: ['pnpm'],
  testFrameworks: ['vitest'],
  ci: null,
  packageManager: 'pnpm',
  markers: [],
  entryPoints: [],
  modules: [],
  architecturePattern: 'single-package',
};

describe('buildConstitution', () => {
  it('always has 3 required sections', () => {
    const result = buildConstitution(BASE_PROFILE);

    expect(result).toContain('## Always');
    expect(result).toContain('## Ask');
    expect(result).toContain('## Never');
  });

  it('includes Node/TS-specific rules for TypeScript project', () => {
    const result = buildConstitution(BASE_PROFILE);

    expect(result).toContain('vitest');
    expect(result).toContain('pnpm install');
    expect(result).toContain('--force');
  });

  it('includes Python-specific rules', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      languages: ['python'],
      testFrameworks: [],
      packageManager: null,
    };

    const result = buildConstitution(profile);

    expect(result).toContain('pytest');
    expect(result).toContain('pip install');
    expect(result).toContain('virtualenv');
  });

  it('includes Go-specific rules', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      languages: ['go'],
      testFrameworks: [],
      packageManager: null,
    };

    const result = buildConstitution(profile);

    expect(result).toContain('go test');
    expect(result).toContain('go get');
    expect(result).toContain('go mod tidy');
  });

  it('includes multiple stack rules for polyglot projects', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      languages: ['typescript', 'python'],
      testFrameworks: ['vitest'],
    };

    const result = buildConstitution(profile);

    expect(result).toContain('vitest');
    expect(result).toContain('pytest');
  });

  it('includes base rules in all profiles', () => {
    const result = buildConstitution(BASE_PROFILE);

    expect(result).toContain('specs/ 파일 읽기');
    expect(result).toContain('main 브랜치 직접 push');
    expect(result).toContain('--no-verify');
  });
});
