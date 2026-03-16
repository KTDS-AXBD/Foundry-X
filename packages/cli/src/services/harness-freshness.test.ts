import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkHarnessFreshness } from './harness-freshness.js';
import { simpleGit } from 'simple-git';

describe('checkHarnessFreshness', () => {
  const dirs: string[] = [];

  async function makeTmpGitRepo(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fx-fresh-'));
    dirs.push(dir);
    const git = simpleGit(dir);
    await git.init();
    await git.addConfig('user.email', 'test@test.com');
    await git.addConfig('user.name', 'Test');
    return dir;
  }

  async function cleanup() {
    for (const d of dirs) {
      await rm(d, { recursive: true, force: true });
    }
    dirs.length = 0;
  }

  it('returns isStale=false when harness is newer than code', async () => {
    const dir = await makeTmpGitRepo();
    const git = simpleGit(dir);
    const { mkdir } = await import('node:fs/promises');

    // Create code and commit first
    await mkdir(join(dir, 'packages'), { recursive: true });
    await writeFile(join(dir, 'packages', 'index.ts'), 'export const x = 1;');
    await git.add('.');
    await git.commit('add code');

    // Then create harness files (newer mtime)
    await writeFile(join(dir, 'CLAUDE.md'), '# CLAUDE');
    await writeFile(join(dir, 'ARCHITECTURE.md'), '# ARCH');

    const result = await checkHarnessFreshness(dir);
    expect(result.isStale).toBe(false);
    await cleanup();
  });

  it('returns isStale=true when code is newer than harness', async () => {
    const dir = await makeTmpGitRepo();
    const git = simpleGit(dir);

    // Create harness files first
    await writeFile(join(dir, 'CLAUDE.md'), '# CLAUDE');
    await writeFile(join(dir, 'ARCHITECTURE.md'), '# ARCH');

    // Set harness files to old mtime
    const oldDate = new Date('2020-01-01');
    await utimes(join(dir, 'CLAUDE.md'), oldDate, oldDate);
    await utimes(join(dir, 'ARCHITECTURE.md'), oldDate, oldDate);

    // Create code and commit (newer)
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(dir, 'packages'), { recursive: true });
    await writeFile(join(dir, 'packages', 'index.ts'), 'export const x = 1;');
    await git.add('.');
    await git.commit('add code after harness');

    const result = await checkHarnessFreshness(dir);
    expect(result.isStale).toBe(true);
    expect(result.oldestHarnessFile.name).toBeDefined();
    await cleanup();
  });
});
