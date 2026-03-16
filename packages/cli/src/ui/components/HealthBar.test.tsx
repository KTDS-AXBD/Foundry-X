import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { HealthBar } from './HealthBar.js';

describe('HealthBar', () => {
  it('일반 점수를 라벨과 퍼센트로 렌더링한다', () => {
    const { lastFrame } = render(<HealthBar label="Spec↔Code" score={85} />);
    expect(lastFrame()).toContain('Spec↔Code');
    expect(lastFrame()).toContain('85%');
  });

  it('0% 점수는 빈 바를 표시한다', () => {
    const { lastFrame } = render(<HealthBar label="Empty" score={0} width={10} />);
    expect(lastFrame()).toContain('0%');
    expect(lastFrame()).toContain('░'.repeat(10));
  });

  it('100% 점수는 꽉 찬 바를 표시한다', () => {
    const { lastFrame } = render(<HealthBar label="Full" score={100} width={10} />);
    expect(lastFrame()).toContain('100%');
    expect(lastFrame()).toContain('█'.repeat(10));
  });

  it('50% 점수는 반만 채운 바를 표시한다', () => {
    const { lastFrame } = render(<HealthBar label="Half" score={50} width={10} />);
    expect(lastFrame()).toContain('50%');
    expect(lastFrame()).toContain('█'.repeat(5));
    expect(lastFrame()).toContain('░'.repeat(5));
  });

  it('음수 점수는 0으로 클램핑된다', () => {
    const { lastFrame } = render(<HealthBar label="Neg" score={-20} width={10} />);
    expect(lastFrame()).toContain('0%');
  });

  it('100 초과 점수는 100으로 클램핑된다', () => {
    const { lastFrame } = render(<HealthBar label="Over" score={150} width={10} />);
    expect(lastFrame()).toContain('100%');
  });

  it('width 미지정 시 기본값 20을 사용한다', () => {
    const { lastFrame } = render(<HealthBar label="Default" score={100} />);
    expect(lastFrame()).toContain('█'.repeat(20));
  });
});
