import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseChanges, parseSpecDelta } from './changes-parser.js';

describe('parseSpecDelta', () => {
  it('parses Added/Modified/Removed sections', () => {
    const content = `# Spec Delta

## Added
- New auth endpoint
- Session management

## Modified
- Updated user profile schema

## Removed
- Legacy login method
`;

    const delta = parseSpecDelta(content);

    expect(delta.added).toEqual(['New auth endpoint', 'Session management']);
    expect(delta.modified).toEqual(['Updated user profile schema']);
    expect(delta.removed).toEqual(['Legacy login method']);
  });

  it('returns empty arrays for empty content', () => {
    const delta = parseSpecDelta('');

    expect(delta.added).toEqual([]);
    expect(delta.modified).toEqual([]);
    expect(delta.removed).toEqual([]);
  });

  it('handles case-insensitive section headers', () => {
    const content = `## ADDED\n- Item one\n## modified\n- Item two\n`;

    const delta = parseSpecDelta(content);

    expect(delta.added).toEqual(['Item one']);
    expect(delta.modified).toEqual(['Item two']);
  });
});

describe('parseChanges', () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when .foundry-x/changes/ does not exist', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-chg-'));

    const changes = await parseChanges(tmpDir);

    expect(changes).toEqual([]);
  });

  it('parses change with proposal only → proposed', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-chg-'));
    const changePath = join(tmpDir, '.foundry-x', 'changes', '001-add-auth');
    await mkdir(changePath, { recursive: true });
    await writeFile(join(changePath, 'proposal.md'), '# Add Auth\n\nWe need auth.');

    const changes = await parseChanges(tmpDir);

    expect(changes).toHaveLength(1);
    expect(changes[0]!.id).toBe('001-add-auth');
    expect(changes[0]!.status).toBe('proposed');
    expect(changes[0]!.hasProposal).toBe(true);
    expect(changes[0]!.hasDesign).toBe(false);
  });

  it('parses change with proposal + design → approved', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-chg-'));
    const changePath = join(tmpDir, '.foundry-x', 'changes', '002-add-db');
    await mkdir(changePath, { recursive: true });
    await writeFile(join(changePath, 'proposal.md'), '# DB');
    await writeFile(join(changePath, 'design.md'), '# Design');

    const changes = await parseChanges(tmpDir);

    expect(changes[0]!.status).toBe('approved');
    expect(changes[0]!.hasDesign).toBe(true);
  });

  it('parses change with tasks → implemented', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-chg-'));
    const changePath = join(tmpDir, '.foundry-x', 'changes', '003-refactor');
    await mkdir(changePath, { recursive: true });
    await writeFile(join(changePath, 'proposal.md'), '# Refactor');
    await writeFile(join(changePath, 'design.md'), '# Design');
    await writeFile(join(changePath, 'tasks.md'), '- [x] Task 1');

    const changes = await parseChanges(tmpDir);

    expect(changes[0]!.status).toBe('implemented');
  });

  it('detects REJECTED marker in proposal', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-chg-'));
    const changePath = join(tmpDir, '.foundry-x', 'changes', '004-rejected');
    await mkdir(changePath, { recursive: true });
    await writeFile(join(changePath, 'proposal.md'), '# Old Feature\n\nREJECTED: Not needed.');

    const changes = await parseChanges(tmpDir);

    expect(changes[0]!.status).toBe('rejected');
  });

  it('parses spec-delta.md when present', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'fx-chg-'));
    const changePath = join(tmpDir, '.foundry-x', 'changes', '005-with-delta');
    await mkdir(changePath, { recursive: true });
    await writeFile(join(changePath, 'proposal.md'), '# Feature');
    await writeFile(
      join(changePath, 'spec-delta.md'),
      '# Spec Delta\n\n## Added\n- New endpoint\n',
    );

    const changes = await parseChanges(tmpDir);

    expect(changes[0]!.hasSpecDelta).toBe(true);
    expect(changes[0]!.specDelta?.added).toEqual(['New endpoint']);
  });
});
