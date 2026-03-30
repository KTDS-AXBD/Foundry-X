import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverStack, discoverDocs, discoverDirectoryStructure, buildProjectContext } from './discover.js';

describe('discoverStack', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('greenfield: returns typescript + pnpm defaults', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-disc-'));

    const profile = await discoverStack(tmpDir, 'greenfield');

    expect(profile.mode).toBe('greenfield');
    expect(profile.languages).toEqual(['typescript']);
    expect(profile.packageManager).toBe('pnpm');
  });

  it('brownfield + package.json with react: detects react framework', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-disc-'));
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { react: '^18.0.0' } }),
    );

    const profile = await discoverStack(tmpDir, 'brownfield');

    expect(profile.frameworks).toContain('react');
  });

  it('brownfield + pnpm-lock.yaml: detects pnpm as package manager', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-disc-'));
    await writeFile(
      join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: {} }),
    );
    await writeFile(join(tmpDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');

    const profile = await discoverStack(tmpDir, 'brownfield');

    expect(profile.packageManager).toBe('pnpm');
    expect(profile.buildTools).toContain('pnpm');
  });

  it('brownfield + go.mod: includes go in languages', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-disc-'));
    await writeFile(join(tmpDir, 'go.mod'), 'module example.com/app\n');

    const profile = await discoverStack(tmpDir, 'brownfield');

    expect(profile.languages).toContain('go');
  });

  it('brownfield: populates existingDocs and directoryStructure', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-disc-'));
    await writeFile(join(tmpDir, 'package.json'), JSON.stringify({ dependencies: {} }));
    await writeFile(join(tmpDir, 'README.md'), '# Test\n\nThis is a test project.');
    await mkdir(join(tmpDir, 'docs'), { recursive: true });
    await writeFile(join(tmpDir, 'docs', 'guide.md'), 'guide');
    await mkdir(join(tmpDir, 'src', 'services'), { recursive: true });

    const profile = await discoverStack(tmpDir, 'brownfield');

    expect(profile.existingDocs).toBeDefined();
    expect(profile.existingDocs!.length).toBeGreaterThanOrEqual(2);
    expect(profile.directoryStructure).toBeDefined();
    expect(profile.projectContext).toBeDefined();
    expect(profile.projectContext!.summary).toContain('test project');
  });
});

describe('discoverDocs', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it('detects README.md', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-docs-'));
    await writeFile(join(tmpDir, 'README.md'), '# Hello');

    const docs = await discoverDocs(tmpDir);

    expect(docs).toContainEqual({ path: 'README.md', type: 'readme' });
  });

  it('detects docs/ directory', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-docs-'));
    await mkdir(join(tmpDir, 'docs'));
    await writeFile(join(tmpDir, 'docs', 'guide.md'), 'guide');

    const docs = await discoverDocs(tmpDir);

    expect(docs).toContainEqual({ path: 'docs', type: 'docs' });
  });

  it('skips empty directories', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-docs-'));
    await mkdir(join(tmpDir, 'docs'));

    const docs = await discoverDocs(tmpDir);

    expect(docs.find((d) => d.path === 'docs')).toBeUndefined();
  });

  it('returns empty array for no docs', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-docs-'));

    const docs = await discoverDocs(tmpDir);

    expect(docs).toEqual([]);
  });
});

describe('discoverDirectoryStructure', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it('scans src/ subdirectories with roles', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-dirs-'));
    await mkdir(join(tmpDir, 'src', 'routes'), { recursive: true });
    await mkdir(join(tmpDir, 'src', 'services'), { recursive: true });
    await mkdir(join(tmpDir, 'src', 'components'), { recursive: true });

    const dirs = await discoverDirectoryStructure(tmpDir);

    expect(dirs.find((d) => d.name === 'src/routes')?.role).toBe('routes');
    expect(dirs.find((d) => d.name === 'src/services')?.role).toBe('services');
    expect(dirs.find((d) => d.name === 'src/components')?.role).toBe('components');
  });

  it('returns empty array for empty directory', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-dirs-'));

    const dirs = await discoverDirectoryStructure(tmpDir);

    expect(dirs).toEqual([]);
  });
});

describe('buildProjectContext', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it('extracts summary from README', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-ctx-'));
    await writeFile(join(tmpDir, 'README.md'), '# Title\n\nThis is a great project for testing.');

    const ctx = await buildProjectContext(
      tmpDir,
      [{ path: 'README.md', type: 'readme' }],
      [],
    );

    expect(ctx.summary).toBe('This is a great project for testing.');
  });

  it('returns default summary when no README', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-ctx-'));

    const ctx = await buildProjectContext(tmpDir, [], []);

    expect(ctx.summary).toBe('No README found');
  });

  it('detects monorepo via pnpm-workspace.yaml', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-ctx-'));
    await writeFile(join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');

    const ctx = await buildProjectContext(tmpDir, [], []);

    expect(ctx.hasMonorepo).toBe(true);
  });
});
