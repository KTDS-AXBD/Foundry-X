import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateHarness } from './generate.js';
import type { RepoProfile } from '@foundry-x/shared';

const MOCK_PROFILE: RepoProfile = {
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

describe('generateHarness', () => {
  const dirs: string[] = [];

  async function makeTmpDir(prefix: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    dirs.push(dir);
    return dir;
  }

  afterEach(async () => {
    for (const d of dirs) {
      await rm(d, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  // ── Template path tests (non-builder files) ──

  it('copies template files to empty target — all listed as created', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    // Use progress.md (no builder) to test pure template copy
    await writeFile(join(templateDir, 'progress.md'), '## Current\nDefault progress');
    await writeFile(
      join(templateDir, 'config.json'),
      JSON.stringify({ key: 'value' }),
    );

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir);

    expect(result.created).toContain('progress.md');
    expect(result.created).toContain('config.json');
    expect(result.merged).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);

    const content = await readFile(join(targetDir, 'progress.md'), 'utf-8');
    expect(content).toContain('Default progress');
  });

  it('merges existing .md files — preserves existing content', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    // Use progress.md (no builder) to test pure merge
    await writeFile(
      join(templateDir, 'progress.md'),
      '## Existing\nTemplate version\n## New Section\nNew content',
    );
    await writeFile(
      join(targetDir, 'progress.md'),
      '## Existing\nMy custom content',
    );

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir);

    expect(result.merged).toContain('progress.md');

    const content = await readFile(join(targetDir, 'progress.md'), 'utf-8');
    expect(content).toContain('My custom content');
    expect(content).toContain('## New Section');
    expect(content).not.toContain('Template version');
  });

  it('is idempotent — second run produces merged with same content', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(join(templateDir, 'progress.md'), '## Section A\nContent A');

    const first = await generateHarness(targetDir, MOCK_PROFILE, templateDir);
    expect(first.created).toContain('progress.md');

    const second = await generateHarness(targetDir, MOCK_PROFILE, templateDir);
    expect(second.merged).toContain('progress.md');

    const contentAfterFirst = await readFile(
      join(targetDir, 'progress.md'),
      'utf-8',
    );
    const contentAfterSecond = await readFile(
      join(targetDir, 'progress.md'),
      'utf-8',
    );
    expect(contentAfterFirst).toBe(contentAfterSecond);
  });

  it('force mode overwrites existing files', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(join(templateDir, 'progress.md'), '## Fresh\nTemplate only');
    await writeFile(
      join(targetDir, 'progress.md'),
      '## Old\nShould be overwritten',
    );

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir, {
      force: true,
    });

    expect(result.created).toContain('progress.md');

    const content = await readFile(join(targetDir, 'progress.md'), 'utf-8');
    expect(content).toContain('Template only');
    expect(content).not.toContain('Should be overwritten');
  });

  // ── Builder path tests ──

  it('uses builder output for CLAUDE.md instead of template content', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    // Template has placeholder content, but builder should override
    await writeFile(join(templateDir, 'CLAUDE.md'), '## Placeholder\nOld content');

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir);

    expect(result.created).toContain('CLAUDE.md');

    const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
    // Builder generates profile-based content
    expect(content).toContain('# CLAUDE.md');
    expect(content).toContain('typescript');
    expect(content).toContain('react');
    expect(content).not.toContain('Old content');
  });

  it('uses builder output for ARCHITECTURE.md with module map', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(join(templateDir, 'ARCHITECTURE.md'), '# placeholder');

    const profileWithModules: RepoProfile = {
      ...MOCK_PROFILE,
      architecturePattern: 'monorepo',
      modules: [
        { name: '@app/cli', path: 'packages/cli', role: 'CLI' },
        { name: '@app/shared', path: 'packages/shared', role: 'types' },
      ],
    };

    const result = await generateHarness(targetDir, profileWithModules, templateDir);

    expect(result.created).toContain('ARCHITECTURE.md');

    const content = await readFile(join(targetDir, 'ARCHITECTURE.md'), 'utf-8');
    expect(content).toContain('## 모듈 맵');
    expect(content).toContain('@app/cli');
    expect(content).toContain('packages/cli');
    expect(content).toContain('@app/shared');
  });

  it('uses builder output for CONSTITUTION.md with stack-specific rules', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(join(templateDir, 'CONSTITUTION.md'), '# placeholder');

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir);

    expect(result.created).toContain('CONSTITUTION.md');

    const content = await readFile(join(targetDir, 'CONSTITUTION.md'), 'utf-8');
    expect(content).toContain('## Always');
    expect(content).toContain('## Ask');
    expect(content).toContain('## Never');
    // TypeScript/Node stack → vitest rule
    expect(content).toContain('vitest');
  });

  it('builder output merges with existing user content', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(join(templateDir, 'CLAUDE.md'), '# placeholder');
    // User has custom section
    await writeFile(
      join(targetDir, 'CLAUDE.md'),
      '## My Custom Section\nDo not touch this\n## Commands\nMy commands',
    );

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir);

    expect(result.merged).toContain('CLAUDE.md');

    const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
    // User section preserved
    expect(content).toContain('My Custom Section');
    expect(content).toContain('Do not touch this');
  });
});
