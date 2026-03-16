import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';

export interface HarnessFreshness {
  oldestHarnessFile: { name: string; mtime: string };
  latestCodeCommit: string;
  isStale: boolean;
}

const HARNESS_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'ARCHITECTURE.md',
  'CONSTITUTION.md',
] as const;

export async function checkHarnessFreshness(
  cwd: string,
): Promise<HarnessFreshness> {
  // 1. Collect harness file mtimes
  const mtimes: { name: string; mtime: Date }[] = [];
  for (const f of HARNESS_FILES) {
    try {
      const s = await stat(join(cwd, f));
      mtimes.push({ name: f, mtime: s.mtime });
    } catch {
      // File doesn't exist — skip
    }
  }

  const oldest = mtimes.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())[0];

  // 2. Get latest code commit time
  const git = simpleGit(cwd);
  let latestCommitDate = new Date(0);
  try {
    const log = await git.log({ maxCount: 1, file: ['packages/', 'src/'] });
    if (log.latest?.date) {
      latestCommitDate = new Date(log.latest.date);
    }
  } catch {
    // git log failed — treat as no commits
  }

  return {
    oldestHarnessFile: oldest
      ? { name: oldest.name, mtime: oldest.mtime.toISOString() }
      : { name: '(none)', mtime: new Date(0).toISOString() },
    latestCodeCommit: latestCommitDate.toISOString(),
    isStale: oldest ? latestCommitDate > oldest.mtime : false,
  };
}
