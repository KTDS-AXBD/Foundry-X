import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { InitView } from './InitView.js';
import { makeInitData, makeInitSteps } from '../__tests__/test-data.js';

describe('InitView', () => {
  it('모든 스텝 완료 시 ✓ 아이콘과 성공 메시지를 표시한다', () => {
    const data = makeInitData();
    const { lastFrame } = render(<InitView {...data} />);
    const output = lastFrame()!;

    expect(output).toContain('Foundry-X Init');
    expect(output).toContain('\u2713'); // ✓ done icon
    expect(output).toContain('initialized successfully');
    expect(output).toContain('CLAUDE.md');
  });

  it('혼합 진행 상태(done+running+pending)의 아이콘을 구분하여 표시한다', () => {
    const steps = makeInitSteps([
      'done', 'done', 'done', 'running', 'pending', 'pending', 'pending', 'pending',
    ]);
    const data = makeInitData({ steps });
    const { lastFrame } = render(<InitView {...data} />);
    const output = lastFrame()!;

    expect(output).toContain('\u2713'); // ✓ done
    expect(output).toContain('\u25CF'); // ● running
    expect(output).toContain('\u25CB'); // ○ pending
  });
});
