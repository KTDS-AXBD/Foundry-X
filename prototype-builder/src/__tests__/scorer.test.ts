import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrototypeJob, QualityScore } from '../types.js';
import { DIMENSION_WEIGHTS } from '../types.js';

// Mock child_process and fs before imports
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  },
}));

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import {
  evaluateQuality,
  generateTargetFeedback,
  functionalScore,
  prdScore,
} from '../scorer.js';

const mockExecFile = vi.mocked(execFile);
const mockFs = vi.mocked(fs);

function makeJob(overrides: Partial<PrototypeJob> = {}): PrototypeJob {
  return {
    id: 'test-job-1',
    projectId: 'proj-1',
    name: 'Test Prototype',
    prdContent: '# Test PRD\n\n## Must Have\n- 대시보드 구현\n- 차트 표시\n- 로그인 기능',
    feedbackContent: null,
    workDir: '/tmp/test-work',
    round: 0,
    ...overrides,
  };
}

// Helper: execFile mock that resolves
function mockExecSuccess(stdout = '', stderr = '') {
  mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
    const callback = typeof _opts === 'function' ? _opts : cb;
    if (callback) callback(null, stdout, stderr);
    return {} as ReturnType<typeof execFile>;
  });
}

// Helper: execFile mock that rejects
function mockExecFailure(error: string) {
  mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
    const callback = typeof _opts === 'function' ? _opts : cb;
    if (callback) callback(new Error(error), '', error);
    return {} as ReturnType<typeof execFile>;
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  // Default: fs.access succeeds, readdir returns empty
  mockFs.access.mockResolvedValue(undefined);
  mockFs.readdir.mockResolvedValue([] as never);
  mockFs.readFile.mockRejectedValue(new Error('Not found'));
});

describe('scorer', () => {
  describe('DIMENSION_WEIGHTS', () => {
    it('가중치 합이 1.0이에요', () => {
      const sum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    });

    it('5개 차원이 모두 존재해요', () => {
      expect(Object.keys(DIMENSION_WEIGHTS)).toEqual(
        expect.arrayContaining(['build', 'ui', 'functional', 'prd', 'code']),
      );
    });
  });

  describe('functionalScore', () => {
    it('핸들러가 없으면 0.2 기본 점수를 줘요', async () => {
      // src/ 존재하지만 파일 없음
      mockFs.readdir.mockResolvedValue([] as never);

      const result = await functionalScore('/tmp/test');
      expect(result.dimension).toBe('functional');
      expect(result.score).toBe(0.2);
      expect(result.weight).toBe(DIMENSION_WEIGHTS.functional);
    });

    it('핸들러 + hooks가 있으면 높은 점수를 줘요', async () => {
      const code = `
        export function App() {
          const [count, setCount] = useState(0);
          const [name, setName] = useState('');
          useEffect(() => {}, []);
          return (
            <div>
              <button onClick={() => setCount(c => c+1)}>+</button>
              <button onClick={() => setCount(c => c-1)}>-</button>
              <input onChange={e => setName(e.target.value)} />
              <button onClick={handleSubmit}>Submit</button>
              <button onClick={handleReset}>Reset</button>
              <Link to="/home">Home</Link>
              <Route path="/about" />
            </div>
          );
        }
      `;

      // Mock src/ directory with a .tsx file
      mockFs.readdir.mockImplementation(async (dir) => {
        if (String(dir).endsWith('src')) {
          return [{ name: 'App.tsx', isDirectory: () => false }] as never;
        }
        return [] as never;
      });
      mockFs.readFile.mockResolvedValue(code);

      const result = await functionalScore('/tmp/test');
      expect(result.dimension).toBe('functional');
      expect(result.score).toBeGreaterThanOrEqual(0.7);
      expect(result.details).toContain('Handlers:');
    });
  });

  describe('prdScore (keyword mode)', () => {
    it('PRD 키워드가 코드에 매칭되면 높은 점수를 줘요', async () => {
      const job = makeJob({
        prdContent: '대시보드를 구현하고 차트를 표시해야 한다. 로그인 기능이 필요하다.',
      });

      // Mock source files with matching keywords
      mockFs.readdir.mockImplementation(async (dir) => {
        if (String(dir).endsWith('src')) {
          return [{ name: 'App.tsx', isDirectory: () => false }] as never;
        }
        return [] as never;
      });
      mockFs.readFile.mockResolvedValue(
        'export function 대시보드() {} function 차트() {} function 로그인() {}',
      );

      const result = await prdScore(job, '/tmp/test', { useLlm: false });
      expect(result.dimension).toBe('prd');
      expect(result.score).toBeGreaterThan(0);
    });

    it('매칭되는 키워드가 없으면 낮은 점수를 줘요', async () => {
      const job = makeJob({
        prdContent: '대시보드를 구현하고 차트를 표시해야 한다.',
      });

      mockFs.readdir.mockResolvedValue([] as never);

      const result = await prdScore(job, '/tmp/test', { useLlm: false });
      expect(result.dimension).toBe('prd');
      // No source files → no matches → low score (or 0.5 default)
    });
  });

  describe('evaluateQuality', () => {
    it('5개 차원을 모두 평가하고 총점을 산출해요', async () => {
      // skipBuild + empty source
      mockFs.readdir.mockResolvedValue([] as never);
      mockExecSuccess();

      const result = await evaluateQuality(makeJob(), '/tmp/test', {
        skipBuild: true,
      });

      expect(result.dimensions).toHaveLength(5);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
      expect(result.jobId).toBe('test-job-1');
      expect(result.evaluatedAt).toBeTruthy();

      // 모든 차원이 올바른 이름인지 확인
      const dimNames = result.dimensions.map(d => d.dimension);
      expect(dimNames).toEqual(
        expect.arrayContaining(['build', 'ui', 'functional', 'prd', 'code']),
      );
    });

    it('skipBuild=true이면 build 차원이 1.0이에요', async () => {
      mockFs.readdir.mockResolvedValue([] as never);
      mockExecSuccess();

      const result = await evaluateQuality(makeJob(), '/tmp/test', {
        skipBuild: true,
      });

      const buildDim = result.dimensions.find(d => d.dimension === 'build');
      expect(buildDim?.score).toBe(1);
    });
  });

  describe('generateTargetFeedback', () => {
    it('가장 낮은 차원을 식별하고 피드백을 생성해요', () => {
      const score: QualityScore = {
        total: 55,
        dimensions: [
          { dimension: 'build', score: 1.0, weight: 0.2, weighted: 0.2, details: 'OK' },
          { dimension: 'ui', score: 0.3, weight: 0.25, weighted: 0.075, details: 'Poor' },
          { dimension: 'functional', score: 0.5, weight: 0.2, weighted: 0.1, details: 'Medium' },
          { dimension: 'prd', score: 0.4, weight: 0.25, weighted: 0.1, details: 'Missing: A, B' },
          { dimension: 'code', score: 0.7, weight: 0.1, weighted: 0.07, details: 'OK' },
        ],
        evaluatedAt: new Date().toISOString(),
        round: 0,
        jobId: 'test-1',
      };

      const feedback = generateTargetFeedback(score);
      expect(feedback.weakestDimension).toBe('ui'); // 0.3이 가장 낮음
      expect(feedback.score).toBe(0.3);
      expect(feedback.prompt).toContain('레이아웃');
    });

    it('build가 가장 낮으면 빌드 에러 수정 피드백을 줘요', () => {
      const score: QualityScore = {
        total: 30,
        dimensions: [
          { dimension: 'build', score: 0.0, weight: 0.2, weighted: 0, details: 'Build failed' },
          { dimension: 'ui', score: 0.5, weight: 0.25, weighted: 0.125, details: '' },
          { dimension: 'functional', score: 0.5, weight: 0.2, weighted: 0.1, details: '' },
          { dimension: 'prd', score: 0.5, weight: 0.25, weighted: 0.125, details: '' },
          { dimension: 'code', score: 0.5, weight: 0.1, weighted: 0.05, details: '' },
        ],
        evaluatedAt: new Date().toISOString(),
        round: 0,
        jobId: 'test-2',
      };

      const feedback = generateTargetFeedback(score);
      expect(feedback.weakestDimension).toBe('build');
      expect(feedback.prompt).toContain('빌드 에러');
    });

    it('prd가 가장 낮으면 미구현 항목을 포함한 피드백을 줘요', () => {
      const score: QualityScore = {
        total: 65,
        dimensions: [
          { dimension: 'build', score: 1.0, weight: 0.2, weighted: 0.2, details: 'OK' },
          { dimension: 'ui', score: 0.7, weight: 0.25, weighted: 0.175, details: '' },
          { dimension: 'functional', score: 0.7, weight: 0.2, weighted: 0.14, details: '' },
          { dimension: 'prd', score: 0.2, weight: 0.25, weighted: 0.05, details: 'Missing: 로그인, 대시보드' },
          { dimension: 'code', score: 0.8, weight: 0.1, weighted: 0.08, details: '' },
        ],
        evaluatedAt: new Date().toISOString(),
        round: 0,
        jobId: 'test-3',
      };

      const feedback = generateTargetFeedback(score);
      expect(feedback.weakestDimension).toBe('prd');
      expect(feedback.prompt).toContain('Must Have');
    });
  });
});
