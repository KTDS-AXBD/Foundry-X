import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HarnessIntegrity, IntegrityCheck, IntegrityLevel } from './types.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readFileIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

function check(
  name: string,
  level: IntegrityLevel,
  message: string,
): IntegrityCheck {
  return { name, level, message };
}

const REQUIRED_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  'ARCHITECTURE.md',
  'CONSTITUTION.md',
  '.plumb/config.json',
] as const;

const CONSTITUTION_SECTIONS = ['## Always', '## Ask', '## Never'] as const;

const EVOLUTION_DOCS = ['CLAUDE.md', 'AGENTS.md', 'ARCHITECTURE.md'] as const;
const EVOLUTION_PATTERNS = ['갱신 규칙', 'Evolution Rules'] as const;

export async function verifyHarness(cwd: string): Promise<HarnessIntegrity> {
  let score = 100;
  const checks: IntegrityCheck[] = [];

  // 1. Required file existence (-15 each)
  for (const file of REQUIRED_FILES) {
    const exists = await fileExists(join(cwd, file));
    if (exists) {
      checks.push(check(`file:${file}`, 'PASS', `${file} exists`));
    } else {
      score -= 15;
      checks.push(check(`file:${file}`, 'FAIL', `${file} is missing`));
    }
  }

  // 2. CONSTITUTION.md required sections (-10 each)
  const constitution = await readFileIfExists(join(cwd, 'CONSTITUTION.md'));
  if (constitution) {
    for (const section of CONSTITUTION_SECTIONS) {
      if (constitution.includes(section)) {
        checks.push(
          check(`constitution:${section}`, 'PASS', `${section} section found`),
        );
      } else {
        score -= 10;
        checks.push(
          check(
            `constitution:${section}`,
            'FAIL',
            `${section} section missing in CONSTITUTION.md`,
          ),
        );
      }
    }
  }

  // 3. Evolution rules in key docs (-5 each)
  for (const doc of EVOLUTION_DOCS) {
    const content = await readFileIfExists(join(cwd, doc));
    if (!content) continue; // Already flagged as missing in step 1

    const hasEvolution = EVOLUTION_PATTERNS.some((p) => content.includes(p));
    if (hasEvolution) {
      checks.push(
        check(`evolution:${doc}`, 'PASS', `${doc} contains evolution rules`),
      );
    } else {
      score -= 5;
      checks.push(
        check(
          `evolution:${doc}`,
          'WARN',
          `${doc} is missing evolution/갱신 규칙 section`,
        ),
      );
    }
  }

  // 4. progress.md existence (-5)
  const hasProgress = await fileExists(join(cwd, 'progress.md'));
  if (hasProgress) {
    checks.push(check('file:progress.md', 'PASS', 'progress.md exists'));
  } else {
    score -= 5;
    checks.push(check('file:progress.md', 'WARN', 'progress.md is missing'));
  }

  return {
    score: Math.max(0, score),
    passed: score >= 60,
    checks,
  };
}
