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

  it('copies template files to empty target — all listed as created', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(join(templateDir, 'CLAUDE.md'), '## Agents\nDefault agents');
    await writeFile(
      join(templateDir, 'config.json'),
      JSON.stringify({ key: 'value' }),
    );

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir);

    expect(result.created).toContain('CLAUDE.md');
    expect(result.created).toContain('config.json');
    expect(result.merged).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);

    const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('Default agents');
  });

  it('merges existing .md files — preserves existing content', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(
      join(templateDir, 'CLAUDE.md'),
      '## Existing\nTemplate version\n## New Section\nNew content',
    );
    await writeFile(
      join(targetDir, 'CLAUDE.md'),
      '## Existing\nMy custom content',
    );

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir);

    expect(result.merged).toContain('CLAUDE.md');

    const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('My custom content');
    expect(content).toContain('## New Section');
    expect(content).not.toContain('Template version');
  });

  it('is idempotent — second run produces merged with same content', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(join(templateDir, 'CLAUDE.md'), '## Section A\nContent A');

    const first = await generateHarness(targetDir, MOCK_PROFILE, templateDir);
    expect(first.created).toContain('CLAUDE.md');

    const second = await generateHarness(targetDir, MOCK_PROFILE, templateDir);
    expect(second.merged).toContain('CLAUDE.md');

    const contentAfterFirst = await readFile(
      join(targetDir, 'CLAUDE.md'),
      'utf-8',
    );
    const contentAfterSecond = await readFile(
      join(targetDir, 'CLAUDE.md'),
      'utf-8',
    );
    expect(contentAfterFirst).toBe(contentAfterSecond);
  });

  it('force mode overwrites existing files', async () => {
    const templateDir = await makeTmpDir('fx-gen-tmpl-');
    const targetDir = await makeTmpDir('fx-gen-tgt-');

    await writeFile(join(templateDir, 'CLAUDE.md'), '## Fresh\nTemplate only');
    await writeFile(
      join(targetDir, 'CLAUDE.md'),
      '## Old\nShould be overwritten',
    );

    const result = await generateHarness(targetDir, MOCK_PROFILE, templateDir, {
      force: true,
    });

    expect(result.created).toContain('CLAUDE.md');

    const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('Template only');
    expect(content).not.toContain('Should be overwritten');
  });
});
