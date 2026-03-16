import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { SyncView } from './SyncView.js';
import { makeSyncData } from '../__tests__/test-data.js';

describe('SyncView', () => {
  it('갭이 있을 때 갭 목록을 표시한다', () => {
    const data = makeSyncData();
    const { lastFrame } = render(<SyncView {...data} />);
    const output = lastFrame()!;

    expect(output).toContain('SDD Triangle Sync');
    expect(output).toContain('Gaps');
    expect(output).toContain('src/foo.ts');
    expect(output).toContain('No test file');
  });

  it('갭이 없을 때 갭 섹션을 표시하지 않는다', () => {
    const data = makeSyncData({
      triangle: {
        specToCode: { matched: 10, total: 10, gaps: [] },
        codeToTest: { matched: 10, total: 10, gaps: [] },
        specToTest: { matched: 10, total: 10, gaps: [] },
      },
    });
    const { lastFrame } = render(<SyncView {...data} />);
    const output = lastFrame()!;

    expect(output).toContain('SDD Triangle Sync');
    expect(output).not.toContain('Gaps');
  });
});
