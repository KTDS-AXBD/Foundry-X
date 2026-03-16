import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConfigManager } from './config-manager.js';
import type { FoundryXConfig, RepoProfile } from '@foundry-x/shared';

const MINIMAL_PROFILE: RepoProfile = {
  mode: 'greenfield',
  languages: ['typescript'],
  frameworks: [],
  buildTools: ['pnpm'],
  testFrameworks: [],
  ci: null,
  packageManager: 'pnpm',
  markers: [],
  entryPoints: [],
  modules: [],
  architecturePattern: 'single-package',
};

describe('ConfigManager', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('exists() returns false for empty directory', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-cfg-'));
    const mgr = new ConfigManager(tmpDir);
    expect(await mgr.exists()).toBe(false);
  });

  it('init() makes exists() return true', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-cfg-'));
    const mgr = new ConfigManager(tmpDir);

    await mgr.init('greenfield', MINIMAL_PROFILE, 'standard');

    expect(await mgr.exists()).toBe(true);
  });

  it('init() then read() returns FoundryXConfig', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-cfg-'));
    const mgr = new ConfigManager(tmpDir);

    const written = await mgr.init('greenfield', MINIMAL_PROFILE, 'standard');
    const read = await mgr.read();

    expect(read).not.toBeNull();
    expect(read!.version).toBe('0.1.0');
    expect(read!.mode).toBe('greenfield');
    expect(read!.template).toBe('standard');
    expect(read!.repoProfile.languages).toEqual(['typescript']);
    expect(read!.initialized).toBe(written.initialized);
  });

  it('write() then read() returns identical data', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-cfg-'));
    const mgr = new ConfigManager(tmpDir);

    const config: FoundryXConfig = {
      version: '0.2.0',
      initialized: '2026-01-01T00:00:00Z',
      template: 'custom',
      mode: 'brownfield',
      repoProfile: {
        ...MINIMAL_PROFILE,
        mode: 'brownfield',
        languages: ['typescript', 'python'],
      },
      plumb: { timeout: 60_000, pythonPath: '/usr/bin/python3' },
      git: { provider: 'gitlab', remote: 'https://gitlab.com/test' },
    };

    await mgr.write(config);
    const read = await mgr.read();

    expect(read).toEqual(config);
  });
});
