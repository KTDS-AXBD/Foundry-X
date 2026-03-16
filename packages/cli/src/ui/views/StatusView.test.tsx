import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StatusView } from './StatusView.js';
import { makeStatusData, makeStatusDataNoPlumb } from '../__tests__/test-data.js';

describe('StatusView', () => {
  it('정상 데이터를 렌더링한다', () => {
    const data = makeStatusData();
    const { lastFrame } = render(<StatusView {...data} />);
    const output = lastFrame()!;

    expect(output).toContain('Foundry-X Status');
    expect(output).toContain('brownfield');
    expect(output).toContain('default');
    expect(output).toContain('85.5%');
  });

  it('Plumb 미설치 시 healthScore null이면 "unavailable"을 표시한다', () => {
    const data = makeStatusDataNoPlumb();
    const { lastFrame } = render(<StatusView {...data} />);
    const output = lastFrame()!;

    expect(output).toContain('unavailable');
    expect(output).not.toContain('Overall');
  });

  it('무결성 검사 아이콘을 올바르게 표시한다 (✓ PASS, ! WARN)', () => {
    const data = makeStatusData();
    const { lastFrame } = render(<StatusView {...data} />);
    const output = lastFrame()!;

    expect(output).toContain('\u2713'); // ✓ for PASS
    expect(output).toContain('!');      // ! for WARN
    expect(output).toContain('CLAUDE.md');
    expect(output).toContain('.gitignore');
  });
});
