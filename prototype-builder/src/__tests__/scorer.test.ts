import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrototypeJob, QualityScore } from '../types.js';
import { DIMENSION_WEIGHTS } from '../types.js';

// Mock child_process, fs, and Anthropic SDK before imports
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
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import {
  evaluateQuality,
  evaluateQualityWithLlm,
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

  describe('prdScore (LLM mode)', () => {
    it('LLM 응답에서 requirements/summary를 파싱해 점수를 산출해요 (F425 신규 포맷)', async () => {
      const job = makeJob({
        prdContent: '## Must Have\n- 대시보드\n- 차트\n- 로그인',
      });

      // Mock Anthropic API — F425 신규 포맷 (requirements + summary)
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            requirements: [
              { id: 1, text: '대시보드', implemented: true, evidence: 'Dashboard.tsx', fix: null },
              { id: 2, text: '차트', implemented: true, evidence: 'Chart 존재', fix: null },
              { id: 3, text: '로그인', implemented: false, evidence: null, fix: 'LoginForm 추가' },
            ],
            summary: { implemented: 2, total: 3, score: 0.667 },
          }),
        }],
      });
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate },
      }) as unknown as Anthropic);

      // Set API key
      process.env['ANTHROPIC_API_KEY'] = 'test-key';

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([] as never);

      const result = await prdScore(job, '/tmp/test', { useLlm: true });
      expect(result.dimension).toBe('prd');
      expect(result.score).toBeCloseTo(0.67, 1);
      expect(result.details).toContain('LLM');
      expect(result.details).toContain('2/3');

      delete process.env['ANTHROPIC_API_KEY'];
    });

    it('API 키가 없으면 키워드 모드로 fallback해요', async () => {
      const job = makeJob({
        prdContent: '대시보드를 구현해야 한다.',
      });

      delete process.env['ANTHROPIC_API_KEY'];
      mockFs.readdir.mockResolvedValue([] as never);

      const result = await prdScore(job, '/tmp/test', { useLlm: true });
      expect(result.dimension).toBe('prd');
      // keyword mode → default 0.5 or keyword match
    });

    it('LLM 호출 실패 시 키워드 모드로 fallback해요', async () => {
      const job = makeJob({
        prdContent: '대시보드를 구현해야 한다.',
      });

      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate },
      }) as unknown as Anthropic);

      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      mockFs.readdir.mockResolvedValue([] as never);

      const result = await prdScore(job, '/tmp/test', { useLlm: true });
      expect(result.dimension).toBe('prd');
      // Should not throw, falls back to keyword mode

      delete process.env['ANTHROPIC_API_KEY'];
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

  // ─────────────────────────────────────────────
  // F425: PRD 정합성 LLM 판별 개선
  // ─────────────────────────────────────────────
  describe('F425: prdScore LLM 의미론적 비교', () => {
    it('requirements 배열이 포함된 LLM 응답을 파싱해 점수를 산출해요', async () => {
      const job = makeJob({
        prdContent: '## Must Have\n- 사용자 인증 로그인\n- 대시보드 차트\n- 데이터 필터',
      });

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            requirements: [
              { id: 1, text: '사용자 인증 로그인', implemented: true, evidence: 'LoginForm 존재', fix: null },
              { id: 2, text: '대시보드 차트', implemented: true, evidence: 'ChartComponent 존재', fix: null },
              { id: 3, text: '데이터 필터', implemented: false, evidence: null, fix: 'FilterPanel 추가 필요' },
            ],
            summary: { implemented: 2, total: 3, score: 0.667 },
          }),
        }],
      });
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate },
      }) as unknown as Anthropic);

      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      mockFs.readdir.mockResolvedValue([] as never);

      const result = await prdScore(job, '/tmp/test', { useLlm: true });

      expect(result.dimension).toBe('prd');
      expect(result.score).toBeCloseTo(0.67, 1);
      expect(result.details).toContain('LLM');
      expect(result.details).toContain('2/3');
      expect(result.details).toContain('데이터 필터');

      delete process.env['ANTHROPIC_API_KEY'];
    });

    it('LLM 응답 파싱 실패 시 keyword fallback으로 에러 없이 동작해요', async () => {
      const job = makeJob({ prdContent: '대시보드 구현' });

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'invalid json {{{{' }],
      });
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate },
      }) as unknown as Anthropic);

      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      mockFs.readdir.mockResolvedValue([] as never);

      const result = await prdScore(job, '/tmp/test', { useLlm: true });
      expect(result.dimension).toBe('prd');
      // fallback: 에러 throw 없이 반환

      delete process.env['ANTHROPIC_API_KEY'];
    });
  });

  // ─────────────────────────────────────────────
  // F426: 5차원 LLM 통합 판별
  // ─────────────────────────────────────────────
  describe('F426: evaluateQualityWithLlm 5차원 통합 판별', () => {
    it('LLM이 5차원을 평가하고 llmEvaluation + staticAnalysis를 포함해요', async () => {
      const job = makeJob();

      const llmResponse = {
        build: { score: 90, rationale: '빌드 성공', fix: null },
        ui: { score: 72, rationale: '시맨틱 미흡', fix: 'header 추가' },
        functional: { score: 68, rationale: '핸들러 부족', fix: 'onClick 추가' },
        prd: { score: 80, rationale: '8/10 구현', fix: '차트 미구현' },
        code: { score: 85, rationale: 'TS 에러 1건', fix: null },
      };

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(llmResponse) }],
      });
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate },
      }) as unknown as Anthropic);

      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      mockFs.readdir.mockResolvedValue([] as never);
      mockExecSuccess();

      const result = await evaluateQualityWithLlm(job, '/tmp/test');

      expect(result.dimensions).toHaveLength(5);
      expect(result.llmEvaluation).toBeDefined();
      expect(result.staticAnalysis).toBeDefined();
      expect(result.llmEvaluation?.ui.score).toBe(72);
      expect(result.llmEvaluation?.ui.fix).toBe('header 추가');
      expect(result.total).toBeGreaterThan(0);
      expect(result.total).toBeLessThanOrEqual(100);

      // LLM 점수가 dimensions에 반영되는지 확인
      const uiDim = result.dimensions.find(d => d.dimension === 'ui');
      expect(uiDim?.details).toContain('LLM');
      expect(uiDim?.details).toContain('72');

      delete process.env['ANTHROPIC_API_KEY'];
    });

    it('API 키 없으면 정적 분석으로 fallback하고 staticAnalysis 필드를 포함해요', async () => {
      delete process.env['ANTHROPIC_API_KEY'];
      mockFs.readdir.mockResolvedValue([] as never);
      mockExecSuccess();

      const result = await evaluateQualityWithLlm(makeJob(), '/tmp/test');

      expect(result.dimensions).toHaveLength(5);
      expect(result.staticAnalysis).toBeDefined();
      expect(result.llmEvaluation).toBeUndefined();
    });

    it('LLM 호출 실패 시 정적 분석 fallback, 에러 throw 없어요', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('API timeout'));
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate },
      }) as unknown as Anthropic);

      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      mockFs.readdir.mockResolvedValue([] as never);
      mockExecSuccess();

      const result = await evaluateQualityWithLlm(makeJob(), '/tmp/test');

      expect(result.dimensions).toHaveLength(5);
      expect(result.staticAnalysis).toBeDefined();

      delete process.env['ANTHROPIC_API_KEY'];
    });

    it('evaluateQuality(useLlmIntegrated: true)이 evaluateQualityWithLlm을 호출해요', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          build: { score: 85, rationale: 'OK', fix: null },
          ui: { score: 75, rationale: 'OK', fix: null },
          functional: { score: 70, rationale: 'OK', fix: null },
          prd: { score: 80, rationale: 'OK', fix: null },
          code: { score: 90, rationale: 'OK', fix: null },
        }) }],
      });
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate },
      }) as unknown as Anthropic);

      process.env['ANTHROPIC_API_KEY'] = 'test-key';
      mockFs.readdir.mockResolvedValue([] as never);
      mockExecSuccess();

      const result = await evaluateQuality(makeJob(), '/tmp/test', {
        useLlmIntegrated: true,
        skipBuild: false,
      });

      expect(result.llmEvaluation).toBeDefined();
      expect(mockCreate).toHaveBeenCalled();

      delete process.env['ANTHROPIC_API_KEY'];
    });
  });
});
