import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverStack } from './discover.js';

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
});
