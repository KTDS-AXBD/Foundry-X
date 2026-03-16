import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { ErrorBox } from './ErrorBox.js';

describe('ErrorBox', () => {
  it('타이틀과 메시지를 렌더링한다', () => {
    const { lastFrame } = render(
      <ErrorBox title="Error" message="Something went wrong" />,
    );
    expect(lastFrame()).toContain('Error');
    expect(lastFrame()).toContain('Something went wrong');
  });

  it('에러 코드가 있으면 함께 표시한다', () => {
    const { lastFrame } = render(
      <ErrorBox title="Init Failed" message="Git not found" code="E_NO_GIT" />,
    );
    expect(lastFrame()).toContain('Code: E_NO_GIT');
  });

  it('에러 코드가 없으면 Code 라벨이 표시되지 않는다', () => {
    const { lastFrame } = render(
      <ErrorBox title="Sync Error" message="No config" />,
    );
    expect(lastFrame()).not.toContain('Code:');
  });
});
