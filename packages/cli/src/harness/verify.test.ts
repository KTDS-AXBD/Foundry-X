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

  /** Helper: create a full harness with all files passing all checks */
  async function createFullHarness(dir: string) {
    await writeFile(join(dir, 'CLAUDE.md'), '## 하네스 갱신 규칙\nContent');
    await writeFile(join(dir, 'AGENTS.md'), '## Evolution Rules\nContent');
    await writeFile(join(dir, 'ARCHITECTURE.md'), '## 갱신 규칙\nContent');
    await writeFile(
      join(dir, 'CONSTITUTION.md'),
      '## Always\nDo\n## Ask\nCheck\n## Never\nDont',
    );
    await mkdir(join(dir, '.plumb'), { recursive: true });
    await writeFile(join(dir, '.plumb', 'config.json'), '{}');
    await writeFile(join(dir, 'progress.md'), '## Current');
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
    await createFullHarness(tempDir);

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

  // ── Placeholder detection tests ──

  it('detects placeholder content in harness files and deducts points', async () => {
    await createTempDir();
    await createFullHarness(tempDir);

    // Add placeholder to ARCHITECTURE.md
    await writeFile(
      join(tempDir, 'ARCHITECTURE.md'),
      '## 갱신 규칙\nContent\n## 모듈 맵\n[분석 후 자동 채움]',
    );

    const result = await verifyHarness(tempDir);
    const placeholderCheck = result.checks.find((c) => c.name === 'placeholder:ARCHITECTURE.md');
    expect(placeholderCheck).toBeDefined();
    expect(placeholderCheck!.level).toBe('WARN');
    expect(placeholderCheck!.message).toContain('placeholder');
    // -5 for placeholder
    expect(result.score).toBe(95);
    await cleanup();
  });

  it('passes placeholder check when no placeholders present', async () => {
    await createTempDir();
    await createFullHarness(tempDir);

    const result = await verifyHarness(tempDir);
    const placeholderChecks = result.checks.filter((c) => c.name.startsWith('placeholder:'));
    for (const c of placeholderChecks) {
      expect(c.level).toBe('PASS');
    }
    await cleanup();
  });

  it('detects [TODO: pattern as placeholder', async () => {
    await createTempDir();
    await createFullHarness(tempDir);

    await writeFile(
      join(tempDir, 'CLAUDE.md'),
      '## 하네스 갱신 규칙\nBuild: [TODO: add build command]',
    );

    const result = await verifyHarness(tempDir);
    const check = result.checks.find((c) => c.name === 'placeholder:CLAUDE.md');
    expect(check).toBeDefined();
    expect(check!.level).toBe('WARN');
    await cleanup();
  });

  // ── Module map consistency tests ──

  it('passes module map check when packages/ matches ARCHITECTURE.md', async () => {
    await createTempDir();
    await createFullHarness(tempDir);

    // Create packages/ with two dirs
    await mkdir(join(tempDir, 'packages', 'cli'), { recursive: true });
    await mkdir(join(tempDir, 'packages', 'shared'), { recursive: true });

    // ARCHITECTURE.md with matching module map
    await writeFile(
      join(tempDir, 'ARCHITECTURE.md'),
      [
        '## 갱신 규칙',
        'Content',
        '## 모듈 맵',
        '',
        '| 모듈 | 경로 | 역할 | 진입점 |',
        '|------|------|------|--------|',
        '| cli | packages/cli | CLI | — |',
        '| shared | packages/shared | types | — |',
      ].join('\n'),
    );

    const result = await verifyHarness(tempDir);
    const mmCheck = result.checks.find((c) => c.name === 'modulemap');
    expect(mmCheck).toBeDefined();
    expect(mmCheck!.level).toBe('PASS');
    await cleanup();
  });

  it('warns when packages/ has undocumented directories', async () => {
    await createTempDir();
    await createFullHarness(tempDir);

    // Create packages/ with 3 dirs but only 2 documented
    await mkdir(join(tempDir, 'packages', 'cli'), { recursive: true });
    await mkdir(join(tempDir, 'packages', 'shared'), { recursive: true });
    await mkdir(join(tempDir, 'packages', 'web'), { recursive: true });

    await writeFile(
      join(tempDir, 'ARCHITECTURE.md'),
      [
        '## 갱신 규칙',
        'Content',
        '## 모듈 맵',
        '',
        '| 모듈 | 경로 | 역할 | 진입점 |',
        '|------|------|------|--------|',
        '| cli | packages/cli | CLI | — |',
        '| shared | packages/shared | types | — |',
      ].join('\n'),
    );

    const result = await verifyHarness(tempDir);
    const mmCheck = result.checks.find((c) => c.name === 'modulemap');
    expect(mmCheck).toBeDefined();
    expect(mmCheck!.level).toBe('WARN');
    expect(mmCheck!.message).toContain('packages/web');
    await cleanup();
  });
});
