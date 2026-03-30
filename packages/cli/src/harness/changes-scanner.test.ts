import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanChanges } from './changes-scanner.js';

describe('scanChanges', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no changes directory', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-scan-'));

    const changes = await scanChanges(tmpDir);

    expect(changes).toEqual([]);
  });

  it('sorts changes by status: proposed first, implemented last', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-scan-'));
    const changesBase = join(tmpDir, '.foundry-x', 'changes');

    // implemented change
    const implPath = join(changesBase, 'aaa-impl');
    await mkdir(implPath, { recursive: true });
    await writeFile(join(implPath, 'proposal.md'), 'done');
    await writeFile(join(implPath, 'design.md'), 'design');
    await writeFile(join(implPath, 'tasks.md'), 'tasks');

    // proposed change
    const propPath = join(changesBase, 'bbb-proposed');
    await mkdir(propPath, { recursive: true });
    await writeFile(join(propPath, 'proposal.md'), 'new');

    const changes = await scanChanges(tmpDir);

    expect(changes).toHaveLength(2);
    expect(changes[0]!.status).toBe('proposed');
    expect(changes[1]!.status).toBe('implemented');
  });
});
