import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge.js';

describe('StatusBadge', () => {
  it('PASS 레벨은 체크 아이콘을 표시한다', () => {
    const { lastFrame } = render(<StatusBadge level="PASS" label="CLAUDE.md" />);
    expect(lastFrame()).toContain('✓');
    expect(lastFrame()).toContain('CLAUDE.md');
  });

  it('WARN 레벨은 느낌표 아이콘을 표시한다', () => {
    const { lastFrame } = render(<StatusBadge level="WARN" label=".gitignore" />);
    expect(lastFrame()).toContain('!');
    expect(lastFrame()).toContain('.gitignore');
  });

  it('FAIL 레벨은 X 아이콘을 표시한다', () => {
    const { lastFrame } = render(<StatusBadge level="FAIL" label="tests" />);
    expect(lastFrame()).toContain('✗');
    expect(lastFrame()).toContain('tests');
  });

  it('메시지가 있으면 함께 렌더링한다', () => {
    const { lastFrame } = render(
      <StatusBadge level="PASS" label="CLAUDE.md" message="found at root" />,
    );
    expect(lastFrame()).toContain('found at root');
  });

  it('메시지가 없으면 라벨만 표시된다', () => {
    const { lastFrame } = render(<StatusBadge level="FAIL" label="lint" />);
    expect(lastFrame()).toContain('lint');
    expect(lastFrame()).not.toContain('undefined');
  });
});
