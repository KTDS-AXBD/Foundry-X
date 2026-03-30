import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChangeEntry, SpecDelta } from '@foundry-x/shared';

const CHANGES_DIR = '.foundry-x/changes';

const _EXPECTED_FILES = ['proposal.md', 'design.md', 'tasks.md', 'spec-delta.md'] as const;

async function dirExists(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return Array.isArray(entries);
  } catch {
    return false;
  }
}

/** 개별 spec-delta.md 파싱 → SpecDelta */
export function parseSpecDelta(content: string): SpecDelta {
  const delta: SpecDelta = { added: [], modified: [], removed: [] };
  let currentSection: 'added' | 'modified' | 'removed' | null = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (/^##\s+added/i.test(trimmed)) {
      currentSection = 'added';
    } else if (/^##\s+modified/i.test(trimmed)) {
      currentSection = 'modified';
    } else if (/^##\s+removed/i.test(trimmed)) {
      currentSection = 'removed';
    } else if (currentSection && trimmed.startsWith('- ')) {
      delta[currentSection].push(trimmed.slice(2).trim());
    }
  }

  return delta;
}

function inferStatus(
  hasProposal: boolean,
  hasDesign: boolean,
  hasTasks: boolean,
  proposalContent?: string,
): ChangeEntry['status'] {
  if (proposalContent?.includes('REJECTED')) return 'rejected';
  if (hasTasks) return 'implemented';
  if (hasDesign) return 'approved';
  if (hasProposal) return 'proposed';
  return 'proposed';
}

/** .foundry-x/changes/ 디렉토리를 파싱하여 변경 목록 반환 */
export async function parseChanges(cwd: string): Promise<ChangeEntry[]> {
  const changesPath = join(cwd, CHANGES_DIR);
  if (!(await dirExists(changesPath))) return [];

  const entries = await readdir(changesPath, { withFileTypes: true });
  const changes: ChangeEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const changePath = join(changesPath, entry.name);
    let changeFiles: string[];
    try {
      changeFiles = await readdir(changePath).then((f) => f.map((n) => n.toLowerCase()));
    } catch {
      continue;
    }

    const hasProposal = changeFiles.includes('proposal.md');
    const hasDesign = changeFiles.includes('design.md');
    const hasTasks = changeFiles.includes('tasks.md');
    const hasSpecDelta = changeFiles.includes('spec-delta.md');

    // Read proposal to check for REJECTED marker
    let proposalContent: string | undefined;
    if (hasProposal) {
      try {
        proposalContent = await readFile(join(changePath, 'proposal.md'), 'utf-8');
      } catch {
        // not readable
      }
    }

    // Parse spec-delta if present
    let specDelta: SpecDelta | undefined;
    if (hasSpecDelta) {
      try {
        const deltaContent = await readFile(join(changePath, 'spec-delta.md'), 'utf-8');
        specDelta = parseSpecDelta(deltaContent);
      } catch {
        // not readable
      }
    }

    changes.push({
      id: entry.name,
      status: inferStatus(hasProposal, hasDesign, hasTasks, proposalContent),
      hasProposal,
      hasDesign,
      hasTasks,
      hasSpecDelta,
      specDelta,
    });
  }

  return changes;
}
