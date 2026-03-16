import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HarnessIntegrity, IntegrityCheck, IntegrityLevel } from '@foundry-x/shared';

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
  return { name, passed: level === 'PASS', level, message };
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

  // 5. Placeholder content detection (-5 per file with placeholders)
  for (const doc of PLACEHOLDER_CHECK_DOCS) {
    const content = await readFileIfExists(join(cwd, doc));
    if (!content) continue;

    const found = PLACEHOLDER_PATTERNS.filter((p) => p.test(content));
    if (found.length === 0) {
      checks.push(
        check(`placeholder:${doc}`, 'PASS', `${doc} has no placeholder content`),
      );
    } else {
      score -= 5;
      checks.push(
        check(
          `placeholder:${doc}`,
          'WARN',
          `${doc} contains ${found.length} placeholder(s) — run 'foundry-x init --force' to regenerate`,
        ),
      );
    }
  }

  // 6. Module map consistency — ARCHITECTURE.md vs packages/ (-5)
  const moduleMapCheck = await checkModuleMapConsistency(cwd);
  if (moduleMapCheck) {
    checks.push(moduleMapCheck);
    if (!moduleMapCheck.passed) score -= 5;
  }

  return {
    score: Math.max(0, score),
    passed: score >= 60,
    checks,
  };
}

// ── Placeholder detection ──

const PLACEHOLDER_CHECK_DOCS = ['CLAUDE.md', 'AGENTS.md', 'ARCHITECTURE.md'] as const;

const PLACEHOLDER_PATTERNS = [
  /\[분석 후 자동 채움\]/,
  /\[분석 후 자동 생성됨\]/,
  /\[프로젝트별 정의\]/,
  /\[TODO:/,
] as const;

// ── Module map consistency ──

async function checkModuleMapConsistency(
  cwd: string,
): Promise<IntegrityCheck | null> {
  const archContent = await readFileIfExists(join(cwd, 'ARCHITECTURE.md'));
  if (!archContent) return null;

  // Parse module paths from the module map table
  const documentedPaths = parseModuleMapPaths(archContent);
  if (documentedPaths.length === 0) return null;

  // Scan actual packages/ directory
  const packagesDir = join(cwd, 'packages');
  let actualPackages: string[];
  try {
    const entries = await readdir(packagesDir, { withFileTypes: true });
    actualPackages = entries
      .filter((e) => e.isDirectory())
      .map((e) => `packages/${e.name}`);
  } catch {
    return null; // No packages/ dir
  }

  const undocumented = actualPackages.filter(
    (pkg) => !documentedPaths.includes(pkg),
  );

  if (undocumented.length === 0) {
    return check(
      'modulemap',
      'PASS',
      'Module map matches packages/ directory',
    );
  }

  return check(
    'modulemap',
    'WARN',
    `${undocumented.length} package(s) not in ARCHITECTURE.md: ${undocumented.join(', ')}`,
  );
}

/** Extract package paths from ARCHITECTURE.md module map table */
function parseModuleMapPaths(content: string): string[] {
  const lines = content.split('\n');
  const paths: string[] = [];
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    if (line.startsWith('## 모듈 맵')) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith('## ')) break; // Next section

    if (!inTable) continue;

    // Skip header row and separator
    if (line.includes('| 모듈') || line.includes('|---')) {
      headerPassed = true;
      continue;
    }
    if (!headerPassed) continue;

    // Parse table row: | name | path | role | entry |
    const cols = line.split('|').map((c) => c.trim()).filter(Boolean);
    const pathCol = cols[1];
    if (pathCol && pathCol.startsWith('packages/')) {
      paths.push(pathCol);
    }
  }

  return paths;
}
