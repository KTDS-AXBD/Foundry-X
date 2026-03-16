import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { ProgressStep } from './ProgressStep.js';

describe('ProgressStep', () => {
  it('done 상태는 체크 아이콘을 표시한다', () => {
    const { lastFrame } = render(
      <ProgressStep steps={[{ label: 'Git check', status: 'done' }]} />,
    );
    expect(lastFrame()).toContain('✓');
    expect(lastFrame()).toContain('Git check');
  });

  it('running 상태는 채움 원 아이콘을 표시한다', () => {
    const { lastFrame } = render(
      <ProgressStep steps={[{ label: 'Detect mode', status: 'running' }]} />,
    );
    expect(lastFrame()).toContain('●');
    expect(lastFrame()).toContain('Detect mode');
  });

  it('pending 상태는 빈 원 아이콘을 표시한다', () => {
    const { lastFrame } = render(
      <ProgressStep steps={[{ label: 'Analyze', status: 'pending' }]} />,
    );
    expect(lastFrame()).toContain('○');
    expect(lastFrame()).toContain('Analyze');
  });

  it('error 상태는 X 아이콘을 표시한다', () => {
    const { lastFrame } = render(
      <ProgressStep steps={[{ label: 'Verify', status: 'error' }]} />,
    );
    expect(lastFrame()).toContain('✗');
    expect(lastFrame()).toContain('Verify');
  });

  it('detail 텍스트가 있으면 함께 표시한다', () => {
    const { lastFrame } = render(
      <ProgressStep steps={[{ label: 'Save config', status: 'done', detail: 'OK' }]} />,
    );
    expect(lastFrame()).toContain('OK');
  });

  it('여러 단계를 순서대로 렌더링한다', () => {
    const steps = [
      { label: 'Step 1', status: 'done' as const },
      { label: 'Step 2', status: 'running' as const },
      { label: 'Step 3', status: 'pending' as const },
    ];
    const { lastFrame } = render(<ProgressStep steps={steps} />);
    const frame = lastFrame()!;
    expect(frame).toContain('Step 1');
    expect(frame).toContain('Step 2');
    expect(frame).toContain('Step 3');
    expect(frame).toContain('✓');
    expect(frame).toContain('●');
    expect(frame).toContain('○');
  });
});
