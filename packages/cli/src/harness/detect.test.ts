import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectRepoMode } from './detect.js';

describe('detectRepoMode', () => {
  let tempDir: string;

  async function createTempDir() {
    tempDir = await mkdtemp(join(tmpdir(), 'fx-test-'));
    return tempDir;
  }

  async function cleanup() {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  }

  it('returns greenfield for empty directory', async () => {
    await createTempDir();
    const mode = await detectRepoMode(tempDir);
    expect(mode).toBe('greenfield');
    await cleanup();
  });

  it('returns brownfield when package.json exists', async () => {
    await createTempDir();
    await writeFile(join(tempDir, 'package.json'), '{}');
    const mode = await detectRepoMode(tempDir);
    expect(mode).toBe('brownfield');
    await cleanup();
  });

  it('returns brownfield when go.mod exists', async () => {
    await createTempDir();
    await writeFile(join(tempDir, 'go.mod'), 'module test');
    const mode = await detectRepoMode(tempDir);
    expect(mode).toBe('brownfield');
    await cleanup();
  });

  it('respects forceMode override', async () => {
    await createTempDir();
    await writeFile(join(tempDir, 'package.json'), '{}');
    const mode = await detectRepoMode(tempDir, 'greenfield');
    expect(mode).toBe('greenfield');
    await cleanup();
  });
});
