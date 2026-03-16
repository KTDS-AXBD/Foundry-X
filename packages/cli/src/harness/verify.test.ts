import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyHarness } from './verify.js';

describe('verifyHarness', () => {
  let tempDir: string;

  async function createTempDir() {
    tempDir = await mkdtemp(join(tmpdir(), 'fx-verify-'));
    return tempDir;
  }

  async function cleanup() {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  }

  it('returns low score for empty directory', async () => {
    await createTempDir();
    const result = await verifyHarness(tempDir);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(60);
    await cleanup();
  });

  it('returns score 100 for fully populated harness', async () => {
    await createTempDir();

    // Create all required files
    await writeFile(join(tempDir, 'CLAUDE.md'), '## 하네스 갱신 규칙\nContent');
    await writeFile(join(tempDir, 'AGENTS.md'), '## Evolution Rules\nContent');
    await writeFile(join(tempDir, 'ARCHITECTURE.md'), '## 갱신 규칙\nContent');
    await writeFile(
      join(tempDir, 'CONSTITUTION.md'),
      '## Always\nDo\n## Ask\nCheck\n## Never\nDont',
    );
    await mkdir(join(tempDir, '.plumb'), { recursive: true });
    await writeFile(join(tempDir, '.plumb', 'config.json'), '{}');
    await writeFile(join(tempDir, 'progress.md'), '## Current');

    const result = await verifyHarness(tempDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    await cleanup();
  });

  it('deducts points for missing CONSTITUTION.md sections', async () => {
    await createTempDir();

    await writeFile(join(tempDir, 'CLAUDE.md'), '## Evolution Rules\n');
    await writeFile(join(tempDir, 'AGENTS.md'), '## Evolution Rules\n');
    await writeFile(join(tempDir, 'ARCHITECTURE.md'), '## 갱신 규칙\n');
    await writeFile(join(tempDir, 'CONSTITUTION.md'), '## Always\nOnly always');
    await mkdir(join(tempDir, '.plumb'), { recursive: true });
    await writeFile(join(tempDir, '.plumb', 'config.json'), '{}');
    await writeFile(join(tempDir, 'progress.md'), '');

    const result = await verifyHarness(tempDir);
    // Missing ## Ask and ## Never = -20
    expect(result.score).toBe(80);
    await cleanup();
  });
});
