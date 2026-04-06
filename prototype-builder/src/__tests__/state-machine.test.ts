import { describe, it, expect } from 'vitest';
import {
  transition,
  checkTimeout,
  canDeadLetter,
  canRetry,
  canAcceptFeedback,
  isTerminal,
} from '../state-machine.js';

describe('State Machine', () => {
  describe('transition', () => {
    it('queued → building 전환을 허용해요', () => {
      const result = transition('queued', 'building');
      expect(result.success).toBe(true);
      expect(result.from).toBe('queued');
      expect(result.to).toBe('building');
    });

    it('building → deploying 전환을 허용해요', () => {
      expect(transition('building', 'deploying').success).toBe(true);
    });

    it('building → failed 전환을 허용해요', () => {
      expect(transition('building', 'failed').success).toBe(true);
    });

    it('deploying → live 전환을 허용해요', () => {
      expect(transition('deploying', 'live').success).toBe(true);
    });

    it('deploying → deploy_failed 전환을 허용해요', () => {
      expect(transition('deploying', 'deploy_failed').success).toBe(true);
    });

    it('live → feedback_pending 전환을 허용해요', () => {
      expect(transition('live', 'feedback_pending').success).toBe(true);
    });

    it('feedback_pending → building 전환을 허용해요 (재생성)', () => {
      expect(transition('feedback_pending', 'building').success).toBe(true);
    });

    it('failed → queued 재시도를 허용해요', () => {
      expect(transition('failed', 'queued').success).toBe(true);
    });

    it('failed → dead_letter 전환을 허용해요', () => {
      expect(transition('failed', 'dead_letter').success).toBe(true);
    });

    it('유효하지 않은 전환을 거부해요', () => {
      const result = transition('queued', 'live');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(result.error).toContain('queued');
      expect(result.error).toContain('live');
    });

    it('dead_letter에서는 어떤 전환도 불가해요', () => {
      expect(transition('dead_letter', 'queued').success).toBe(false);
      expect(transition('dead_letter', 'building').success).toBe(false);
    });

    it('queued에서 직접 live로 건너뛸 수 없어요', () => {
      expect(transition('queued', 'live').success).toBe(false);
    });
  });

  describe('checkTimeout', () => {
    it('building 15분 이내이면 timeout 아니에요', () => {
      const now = Date.now();
      const result = checkTimeout('building', now - 10 * 60 * 1000, now);
      expect(result.isTimedOut).toBe(false);
    });

    it('building 15분 초과이면 timeout이에요', () => {
      const now = Date.now();
      const result = checkTimeout('building', now - 16 * 60 * 1000, now);
      expect(result.isTimedOut).toBe(true);
      expect(result.timeoutMs).toBe(15 * 60 * 1000);
    });

    it('deploying 5분 초과이면 timeout이에요', () => {
      const now = Date.now();
      const result = checkTimeout('deploying', now - 6 * 60 * 1000, now);
      expect(result.isTimedOut).toBe(true);
      expect(result.timeoutMs).toBe(5 * 60 * 1000);
    });

    it('timeout이 정의되지 않은 상태는 timeout되지 않아요', () => {
      const now = Date.now();
      const result = checkTimeout('queued', now - 100 * 60 * 1000, now);
      expect(result.isTimedOut).toBe(false);
    });
  });

  describe('canDeadLetter', () => {
    it('failed 상태에서 dead_letter 전환 가능해요', () => {
      expect(canDeadLetter('failed')).toBe(true);
    });

    it('deploy_failed 상태에서 dead_letter 전환 가능해요', () => {
      expect(canDeadLetter('deploy_failed')).toBe(true);
    });

    it('queued 상태에서는 dead_letter 불가해요', () => {
      expect(canDeadLetter('queued')).toBe(false);
    });

    it('live 상태에서는 dead_letter 불가해요', () => {
      expect(canDeadLetter('live')).toBe(false);
    });
  });

  describe('canRetry', () => {
    it('failed 상태에서 재시도 가능해요', () => {
      expect(canRetry('failed')).toBe(true);
    });

    it('deploy_failed 상태에서 재시도 가능해요', () => {
      expect(canRetry('deploy_failed')).toBe(true);
    });

    it('dead_letter 상태에서는 재시도 불가해요', () => {
      expect(canRetry('dead_letter')).toBe(false);
    });
  });

  describe('canAcceptFeedback', () => {
    it('live 상태에서만 피드백 수신 가능해요', () => {
      expect(canAcceptFeedback('live')).toBe(true);
    });

    it('building 상태에서는 피드백 불가해요', () => {
      expect(canAcceptFeedback('building')).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('dead_letter는 터미널 상태에요', () => {
      expect(isTerminal('dead_letter')).toBe(true);
    });

    it('live는 터미널이 아니에요 (피드백 가능)', () => {
      expect(isTerminal('live')).toBe(false);
    });

    it('queued는 터미널이 아니에요', () => {
      expect(isTerminal('queued')).toBe(false);
    });
  });
});
