/**
 * F427: vision-evaluator 단위 테스트
 */
import { describe, it, expect, vi } from 'vitest';
import {
  isRateLimitError,
  retryWithBackoff,
} from '../fallback.js';
import {
  visionResultToDimensionScore,
} from '../vision-evaluator.js';
import type { VisionEvalResult } from '../vision-evaluator.js';

// ─────────────────────────────────────────────
// F427: visionResultToDimensionScore
// ─────────────────────────────────────────────

describe('visionResultToDimensionScore', () => {
  function makeVisionResult(overrides: Partial<VisionEvalResult> = {}): VisionEvalResult {
    return {
      layout: 80,
      color: 70,
      typography: 75,
      hierarchy: 65,
      responsive: 60,
      overall: 70,
      rationale: '전반적으로 양호',
      method: 'html-text',
      ...overrides,
    };
  }

  it('overall 점수를 0~1 범위 score로 변환해요', () => {
    const result = makeVisionResult({ overall: 80 });
    const score = visionResultToDimensionScore(result);
    expect(score.score).toBe(0.80);
    expect(score.dimension).toBe('ui');
  });

  it('가중치 0.25를 곱해 weighted를 계산해요', () => {
    const result = makeVisionResult({ overall: 60 });
    const score = visionResultToDimensionScore(result);
    expect(score.weight).toBe(0.25);
    expect(score.weighted).toBeCloseTo(0.15, 2);
  });

  it('details에 5개 항목 점수를 포함해요', () => {
    const result = makeVisionResult({ layout: 90, color: 80, typography: 85, hierarchy: 70, responsive: 75 });
    const score = visionResultToDimensionScore(result);
    expect(score.details).toContain('layout=90');
    expect(score.details).toContain('color=80');
    expect(score.details).toContain('typo=85');
    expect(score.details).toContain('hierarchy=70');
    expect(score.details).toContain('responsive=75');
  });

  it('overall 0이면 score=0, weighted=0이에요', () => {
    const result = makeVisionResult({ overall: 0 });
    const score = visionResultToDimensionScore(result);
    expect(score.score).toBe(0);
    expect(score.weighted).toBe(0);
  });

  it('overall 100이면 score=1.0이에요', () => {
    const result = makeVisionResult({ overall: 100 });
    const score = visionResultToDimensionScore(result);
    expect(score.score).toBe(1.0);
    expect(score.weighted).toBeCloseTo(0.25, 2);
  });

  it('method 정보를 details에 포함해요', () => {
    const screenshotResult = makeVisionResult({ method: 'screenshot' });
    const htmlResult = makeVisionResult({ method: 'html-text' });
    expect(visionResultToDimensionScore(screenshotResult).details).toContain('screenshot');
    expect(visionResultToDimensionScore(htmlResult).details).toContain('html-text');
  });
});

// ─────────────────────────────────────────────
// F428: isRateLimitError
// ─────────────────────────────────────────────

describe('isRateLimitError', () => {
  it('rate limit 키워드를 감지해요', () => {
    expect(isRateLimitError('Error: rate limit exceeded')).toBe(true);
    expect(isRateLimitError('rate-limit hit')).toBe(true);
    expect(isRateLimitError('ratelimit error')).toBe(true);
  });

  it('429 상태코드를 감지해요', () => {
    expect(isRateLimitError('HTTP 429 Too Many Requests')).toBe(true);
    expect(isRateLimitError('status: 429')).toBe(true);
  });

  it('overloaded 키워드를 감지해요', () => {
    expect(isRateLimitError('API overloaded, please try again')).toBe(true);
  });

  it('too many requests를 감지해요', () => {
    expect(isRateLimitError('Too Many Requests')).toBe(true);
    expect(isRateLimitError('too-many-requests error')).toBe(true);
  });

  it('일반 에러는 rate limit으로 감지하지 않아요', () => {
    expect(isRateLimitError('ENOENT: no such file or directory')).toBe(false);
    expect(isRateLimitError('TypeError: Cannot read property')).toBe(false);
    expect(isRateLimitError('Build failed')).toBe(false);
    expect(isRateLimitError('')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// F428: retryWithBackoff
// ─────────────────────────────────────────────

describe('retryWithBackoff', () => {
  it('성공하면 즉시 결과를 반환해요', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('rate limit 에러 시 재시도해요', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('rate limit exceeded'))
      .mockRejectedValueOnce(new Error('429 Too Many Requests'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelayMs: 1,
      onRetry,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('rate limit이 아닌 에러는 즉시 throw해요', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('ENOENT: file not found'));

    await expect(
      retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 1 }),
    ).rejects.toThrow('ENOENT');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('maxRetries 소진 후에도 실패하면 throw해요', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('rate limit always'));

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 1 }),
    ).rejects.toThrow('rate limit always');
    expect(fn).toHaveBeenCalledTimes(3); // 최초 1회 + 재시도 2회
  });

  it('onRetry 콜백에 attempt 번호와 delay를 전달해요', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValue('done');

    const onRetry = vi.fn();
    await retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 100, onRetry });

    expect(onRetry).toHaveBeenCalledWith(1, 100, expect.stringContaining('rate limit'));
  });
});
