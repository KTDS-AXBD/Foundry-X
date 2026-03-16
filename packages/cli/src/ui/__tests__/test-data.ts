import type { StatusData, InitData, SyncData, InitStepResult } from '../types.js';

// ── StatusData ──

export function makeStatusData(overrides?: Partial<StatusData>): StatusData {
  return {
    config: { mode: 'brownfield', template: 'default', initialized: '2026-03-16' },
    healthScore: {
      overall: 85.5,
      grade: 'B',
      specToCode: 90.0,
      codeToTest: 80.0,
      specToTest: 78.5,
    },
    integrity: {
      score: 95,
      passed: true,
      checks: [
        { name: 'CLAUDE.md', level: 'PASS' as const, message: 'found at root' },
        { name: '.gitignore', level: 'WARN' as const, message: 'missing patterns' },
        { name: 'tests', level: 'PASS' as const, message: '8 test files' },
      ],
    },
    plumbAvailable: true,
    ...overrides,
  };
}

export function makeStatusDataNoPlumb(): StatusData {
  return makeStatusData({ healthScore: null, plumbAvailable: false });
}

// ── InitData ──

const INIT_STEP_NAMES: Array<InitStepResult['step']> = [
  'git-check', 'detect-mode', 'discover-stack', 'analyze-arch',
  'resolve-template', 'generate-harness', 'verify-integrity', 'save-config',
];

const INIT_STEP_LABELS = [
  'Git repository check', 'Detect mode', 'Discover stack', 'Analyze architecture',
  'Resolve template', 'Generate harness', 'Verify integrity', 'Save config',
];

export function makeInitSteps(
  statuses: Array<InitStepResult['status']> = Array(8).fill('done'),
): InitStepResult[] {
  return INIT_STEP_NAMES.map((step, i) => ({
    step,
    label: INIT_STEP_LABELS[i],
    status: statuses[i] ?? 'pending',
    detail: statuses[i] === 'done' ? 'OK' : undefined,
  }));
}

export function makeInitData(overrides?: Partial<InitData>): InitData {
  return {
    steps: makeInitSteps(),
    result: { created: ['CLAUDE.md', '.github/ci.yml'], merged: ['.gitignore'], skipped: ['tsconfig.json'] },
    integrity: { score: 92 },
    ...overrides,
  };
}

// ── SyncData ──

export function makeSyncData(overrides?: Partial<SyncData>): SyncData {
  return {
    triangle: {
      specToCode: { matched: 9, total: 10, gaps: [] },
      codeToTest: { matched: 7, total: 10, gaps: [{ type: 'missing-test', path: 'src/foo.ts', description: 'No test file' }] },
      specToTest: { matched: 8, total: 10, gaps: [] },
    },
    decisions: [{ status: 'approved', summary: 'Add test for foo', source: 'plumb' }],
    healthScore: { overall: 80.0, grade: 'B', specToCode: 90, codeToTest: 70, specToTest: 80 },
    ...overrides,
  };
}
