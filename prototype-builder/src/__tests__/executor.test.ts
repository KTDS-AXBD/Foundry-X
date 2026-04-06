import { describe, it, expect } from 'vitest';
import { buildGeneratorPrompt, buildCliArgs } from '../executor.js';
import type { PrototypeJob } from '../types.js';

function makeJob(overrides: Partial<PrototypeJob> = {}): PrototypeJob {
  return {
    id: 'test-job-1',
    projectId: 'proj-1',
    name: 'Test Prototype',
    prdContent: '# Test PRD\n\n사용자가 로그인하면 대시보드를 볼 수 있다.',
    feedbackContent: null,
    workDir: '/tmp/test-work',
    round: 0,
    ...overrides,
  };
}

describe('executor', () => {
  describe('buildGeneratorPrompt', () => {
    it('PRD 내용을 프롬프트에 포함해요', () => {
      const prompt = buildGeneratorPrompt(makeJob(), 0);
      expect(prompt).toContain('# Test PRD');
      expect(prompt).toContain('대시보드');
    });

    it('피드백이 있으면 프롬프트에 포함해요', () => {
      const job = makeJob({ feedbackContent: 'KPI를 3개로 늘려주세요' });
      const prompt = buildGeneratorPrompt(job, 1);
      expect(prompt).toContain('이전 피드백');
      expect(prompt).toContain('KPI를 3개로');
    });

    it('round > 0이면 개선 지시를 포함해요', () => {
      const prompt = buildGeneratorPrompt(makeJob(), 1);
      expect(prompt).toContain('Round 2');
      expect(prompt).toContain('품질을 개선');
    });

    it('round 0에서는 개선 지시를 포함하지 않아요', () => {
      const prompt = buildGeneratorPrompt(makeJob(), 0);
      expect(prompt).not.toContain('Round');
    });
  });

  describe('buildCliArgs', () => {
    it('--bare 플래그를 포함해요', () => {
      const args = buildCliArgs(makeJob(), 0);
      expect(args).toContain('--bare');
    });

    it('round < 2에서는 haiku 모델을 사용해요', () => {
      const args = buildCliArgs(makeJob(), 0);
      const modelIdx = args.indexOf('--model');
      expect(args[modelIdx + 1]).toBe('haiku');
    });

    it('round >= 2에서는 sonnet 모델을 사용해요', () => {
      const args = buildCliArgs(makeJob(), 2);
      const modelIdx = args.indexOf('--model');
      expect(args[modelIdx + 1]).toBe('sonnet');
    });

    it('도구 권한을 제한해요', () => {
      const args = buildCliArgs(makeJob(), 0);
      expect(args).toContain('--allowedTools');
      expect(args).toContain('Bash,Read,Edit,Write');
    });

    it('JSON 출력 형식을 사용해요', () => {
      const args = buildCliArgs(makeJob(), 0);
      expect(args).toContain('--output-format');
      expect(args).toContain('json');
    });
  });
});
