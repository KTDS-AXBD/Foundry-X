import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { Header } from './Header.js';

describe('Header', () => {
  it('타이틀만 렌더링한다', () => {
    const { lastFrame } = render(<Header title="Foundry-X" />);
    expect(lastFrame()).toContain('Foundry-X');
  });

  it('타이틀과 서브타이틀을 함께 렌더링한다', () => {
    const { lastFrame } = render(<Header title="Foundry-X" subtitle="v0.3.1" />);
    expect(lastFrame()).toContain('Foundry-X');
    expect(lastFrame()).toContain('v0.3.1');
  });

  it('서브타이틀이 없으면 타이틀만 표시된다', () => {
    const { lastFrame } = render(<Header title="Status" />);
    expect(lastFrame()).toContain('Status');
    expect(lastFrame()).not.toContain('undefined');
  });
});
