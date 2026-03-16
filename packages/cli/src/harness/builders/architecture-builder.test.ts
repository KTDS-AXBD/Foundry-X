import { describe, it, expect } from 'vitest';
import { buildArchitecture } from './architecture-builder.js';
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

describe('buildArchitecture', () => {
  it('generates single-package layout for non-monorepo', () => {
    const result = buildArchitecture(BASE_PROFILE);

    expect(result).toContain('# ARCHITECTURE.md');
    expect(result).toContain('## 레이어 구조');
    expect(result).toContain('## 모듈 맵');
    expect(result).toContain('(단일 패키지)');
    expect(result).toContain('## 하네스 갱신 규칙');
  });

  it('generates monorepo layout with module table', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      architecturePattern: 'monorepo',
      modules: [
        { name: 'cli', path: 'packages/cli', role: 'CLI' },
        { name: 'shared', path: 'packages/shared', role: 'types' },
      ],
    };

    const result = buildArchitecture(profile);

    expect(result).toContain('packages/');
    expect(result).toContain('| cli | packages/cli | CLI |');
    expect(result).toContain('| shared | packages/shared | types |');
  });

  it('includes entry points when available', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      entryPoints: ['src/index.ts', 'src/main.ts'],
    };

    const result = buildArchitecture(profile);

    expect(result).toContain('## 진입점');
    expect(result).toContain('`src/index.ts`');
    expect(result).toContain('`src/main.ts`');
  });

  it('omits entry points section when empty', () => {
    const result = buildArchitecture(BASE_PROFILE);
    expect(result).not.toContain('## 진입점');
  });

  it('generates dependency rules for monorepo with 2+ modules', () => {
    const profile: RepoProfile = {
      ...BASE_PROFILE,
      architecturePattern: 'monorepo',
      modules: [
        { name: 'cli', path: 'packages/cli', role: 'CLI' },
        { name: 'shared', path: 'packages/shared', role: 'types' },
      ],
    };

    const result = buildArchitecture(profile);

    expect(result).toContain('cli ↔ shared');
    expect(result).toContain('package.json 확인');
  });

  it('includes forbidden patterns section', () => {
    const result = buildArchitecture(BASE_PROFILE);
    expect(result).toContain('## 금지 패턴');
    expect(result).toContain('순환 의존');
  });
});
