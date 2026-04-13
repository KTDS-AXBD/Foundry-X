// F526: autopilot Verify E2E 통합 — e2e-runner.ts TDD Red
// Design 문서 → E2E 생성 → Playwright 실행 → Composite Score 산출 파이프라인

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VerifyResult } from './e2e-runner.js';

vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
  },
}));

vi.mock('node:child_process', () => ({
  default: {
    spawnSync: vi.fn(),
  },
}));

// --- 테스트용 픽스처 ---
const SAMPLE_DESIGN_DOC = `
# Sprint 279 Design

## 4 기능 명세

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | E2E Verify 통합 | autopilot Step 5~6에 E2E 삽입 | P0 |

## 5 파일 매핑

| 파일 | 역할 |
|------|------|
| \`src/routes/dashboard.tsx\` | 대시보드 UI |
| \`src/routes/sprint/index.tsx\` | Sprint 목록 |
`;

const PLAYWRIGHT_JSON_PASS = JSON.stringify({
  suites: [],
  stats: { expected: 3, skipped: 0, unexpected: 0, flaky: 0, duration: 1500 },
});

const PLAYWRIGHT_JSON_PARTIAL_FAIL = JSON.stringify({
  suites: [],
  stats: { expected: 2, skipped: 0, unexpected: 1, flaky: 0, duration: 2000 },
});

describe('F526: e2e-runner — E2E Verify 파이프라인', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runE2EVerify', () => {
    it('디자인 문서가 없으면 error를 포함한 VerifyResult를 반환한다', async () => {
      const { default: fs } = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { runE2EVerify } = await import('./e2e-runner.js');
      const result = await runE2EVerify({ sprintNum: 279, gapRate: 95, projectRoot: '/repo' });

      expect(result.error).toMatch(/design.*not found/i);
      expect(result.compositeScore.status).toBe('FAIL');
    });

    it('Playwright 전체 PASS 시 Composite = Gap×0.6 + 100×0.4', async () => {
      const { default: fs } = await import('node:fs');
      const { default: cp } = await import('node:child_process');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(SAMPLE_DESIGN_DOC);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(cp.spawnSync).mockReturnValue({
        status: 0,
        stdout: Buffer.from(PLAYWRIGHT_JSON_PASS),
        stderr: Buffer.from(''),
        pid: 1,
        output: [],
        signal: null,
      });

      const { runE2EVerify } = await import('./e2e-runner.js');
      const result = await runE2EVerify({ sprintNum: 279, gapRate: 95, projectRoot: '/repo' });

      expect(result.error).toBeUndefined();
      expect(result.e2eResult).not.toBeNull();
      expect(result.e2eResult?.pass).toBe(3);
      expect(result.e2eResult?.fail).toBe(0);
      // Composite = 95×0.6 + 100×0.4 = 57 + 40 = 97
      expect(result.compositeScore.compositeRate).toBeCloseTo(97, 1);
      expect(result.compositeScore.status).toBe('PASS');
    });

    it('Playwright 일부 실패 시 Composite 점수가 낮아진다', async () => {
      const { default: fs } = await import('node:fs');
      const { default: cp } = await import('node:child_process');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(SAMPLE_DESIGN_DOC);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(cp.spawnSync).mockReturnValue({
        status: 1,
        stdout: Buffer.from(PLAYWRIGHT_JSON_PARTIAL_FAIL),
        stderr: Buffer.from(''),
        pid: 1,
        output: [],
        signal: null,
      });

      const { runE2EVerify } = await import('./e2e-runner.js');
      const result = await runE2EVerify({ sprintNum: 279, gapRate: 95, projectRoot: '/repo' });

      // E2E: 2pass / 3total = 66.7%
      // Composite = 95×0.6 + 66.7×0.4 = 57 + 26.7 = 83.7 → FAIL
      expect(result.compositeScore.status).toBe('FAIL');
      expect(result.compositeScore.compositeRate).toBeLessThan(90);
    });

    it('Playwright 실행 실패(spawnSync 오류) 시 Gap만으로 Composite를 계산한다', async () => {
      const { default: fs } = await import('node:fs');
      const { default: cp } = await import('node:child_process');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(SAMPLE_DESIGN_DOC);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(cp.spawnSync).mockReturnValue({
        status: null,
        stdout: Buffer.from(''),
        stderr: Buffer.from('playwright not found'),
        pid: 0,
        output: [],
        signal: 'SIGTERM',
      });

      const { runE2EVerify } = await import('./e2e-runner.js');
      const result = await runE2EVerify({ sprintNum: 279, gapRate: 92, projectRoot: '/repo' });

      expect(result.e2eResult).toBeNull();
      // Gap만으로: Composite = 92
      expect(result.compositeScore.compositeRate).toBe(92);
      expect(result.compositeScore.status).toBe('PASS');
    });

    it('생성된 spec 파일 경로가 VerifyResult에 포함된다', async () => {
      const { default: fs } = await import('node:fs');
      const { default: cp } = await import('node:child_process');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(SAMPLE_DESIGN_DOC);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(cp.spawnSync).mockReturnValue({
        status: 0,
        stdout: Buffer.from(PLAYWRIGHT_JSON_PASS),
        stderr: Buffer.from(''),
        pid: 1,
        output: [],
        signal: null,
      });

      const { runE2EVerify } = await import('./e2e-runner.js');
      const result = await runE2EVerify({ sprintNum: 279, gapRate: 95, projectRoot: '/repo' });

      expect(result.generatedSpecPath).toContain('sprint-279.spec.ts');
      expect(result.sprintNum).toBe(279);
    });

    it('디자인 문서에서 추출된 시나리오 수가 VerifyResult에 반영된다', async () => {
      const { default: fs } = await import('node:fs');
      const { default: cp } = await import('node:child_process');

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(SAMPLE_DESIGN_DOC);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(cp.spawnSync).mockReturnValue({
        status: 0,
        stdout: Buffer.from(PLAYWRIGHT_JSON_PASS),
        stderr: Buffer.from(''),
        pid: 1,
        output: [],
        signal: null,
      });

      const { runE2EVerify } = await import('./e2e-runner.js');
      const result = await runE2EVerify({ sprintNum: 279, gapRate: 95, projectRoot: '/repo' });

      // SAMPLE_DESIGN_DOC에 route 파일 2개(§5) + 기능 1개(§4)
      // smoke 포함하면 scenarioCount >= 1
      expect(result.scenarioCount).toBeGreaterThan(0);
    });
  });
});
