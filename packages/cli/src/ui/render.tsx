import React from 'react';
import { render } from 'ink';
import type { StatusData, InitData, SyncData, RenderOptions } from './types.js';
import { StatusView } from './views/StatusView.js';
import { InitView } from './views/InitView.js';
import { SyncView } from './views/SyncView.js';

type ViewType = 'status' | 'init' | 'sync';
type ViewDataMap = {
  status: StatusData;
  init: InitData;
  sync: SyncData;
};

/**
 * 출력 디스패처 — TTY/옵션에 따라 Ink 또는 plain text로 렌더링
 *
 * 분기 우선순위:
 * 1. --json → JSON.stringify
 * 2. --short → formatShort()
 * 3. !isTTY → formatPlainText()
 * 4. isTTY → Ink render()
 */
export async function renderOutput<T extends ViewType>(
  view: T,
  data: ViewDataMap[T],
  options: RenderOptions,
): Promise<void> {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (options.short) {
    console.log(formatShort(view, data));
    return;
  }

  if (!process.stdout.isTTY) {
    console.log(formatPlainText(view, data));
    return;
  }

  const Component = getViewComponent(view);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic dispatch requires type erasure
  const { waitUntilExit } = render(React.createElement(Component as React.FC<any>, data));
  await waitUntilExit();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- view registry uses heterogeneous FC types
function getViewComponent(view: ViewType): React.FC<any> {
  const views: Record<ViewType, React.FC<any>> = {
    status: StatusView,
    init: InitView,
    sync: SyncView,
  };
  return views[view];
}

// ── Short formatters ──

function formatShort(view: ViewType, data: StatusData | InitData | SyncData): string {
  switch (view) {
    case 'status': {
      const d = data as StatusData;
      const hs = d.healthScore
        ? `${d.healthScore.overall.toFixed(0)}(${d.healthScore.grade})`
        : 'N/A';
      return `[${d.config.mode}] health=${hs} integrity=${d.integrity.score}/100`;
    }
    case 'init': {
      const d = data as InitData;
      return `init: ${d.result.created.length} created, ${d.result.merged.length} merged, integrity=${d.integrity.score}/100`;
    }
    case 'sync': {
      const d = data as SyncData;
      return `sync: health=${d.healthScore.overall.toFixed(0)}(${d.healthScore.grade})`;
    }
  }
}

// ── Plain text formatters (backward-compatible with original console.log output) ──

function formatPlainText(view: ViewType, data: StatusData | InitData | SyncData): string {
  switch (view) {
    case 'status': return formatStatusPlain(data as StatusData);
    case 'init': return formatInitPlain(data as InitData);
    case 'sync': return formatSyncPlain(data as SyncData);
  }
}

function formatStatusPlain(d: StatusData): string {
  const lines: string[] = ['Foundry-X Status\n'];
  lines.push('  Project');
  lines.push(`    Mode:      ${d.config.mode}`);
  lines.push(`    Template:  ${d.config.template}`);
  lines.push(`    Init:      ${d.config.initialized}`);

  if (d.healthScore) {
    lines.push('\n  Health Score');
    lines.push(`    Overall:     ${d.healthScore.overall.toFixed(1)} (${d.healthScore.grade})`);
    lines.push(`    Spec→Code:   ${d.healthScore.specToCode.toFixed(1)}`);
    lines.push(`    Code→Test:   ${d.healthScore.codeToTest.toFixed(1)}`);
    lines.push(`    Spec→Test:   ${d.healthScore.specToTest.toFixed(1)}`);
  } else {
    lines.push('\n  Health Score: unavailable (Plumb not installed)');
  }

  lines.push('\n  Harness Integrity');
  lines.push(`    Score: ${d.integrity.score}/100 (${d.integrity.passed ? 'PASS' : 'FAIL'})`);
  d.integrity.checks.forEach((c) => {
    const icon = c.level === 'PASS' ? '+' : c.level === 'WARN' ? '!' : 'x';
    lines.push(`    [${icon}] ${c.name}: ${c.message}`);
  });
  return lines.join('\n');
}

function formatInitPlain(d: InitData): string {
  const lines: string[] = [];
  for (const s of d.steps) {
    const icon = s.status === 'done' ? '✓' : s.status === 'error' ? '✗' : '○';
    lines.push(`  ${icon} ${s.label}${s.detail ? `: ${s.detail}` : ''}`);
  }
  lines.push('\nFoundry-X initialized successfully!\n');
  if (d.result.created.length > 0) {
    lines.push('  Created:');
    d.result.created.forEach((f) => lines.push(`    + ${f}`));
  }
  if (d.result.merged.length > 0) {
    lines.push('  Merged:');
    d.result.merged.forEach((f) => lines.push(`    ~ ${f}`));
  }
  if (d.result.skipped.length > 0) {
    lines.push('  Skipped:');
    d.result.skipped.forEach((f) => lines.push(`    - ${f}`));
  }
  lines.push(`\n  Harness Integrity: ${d.integrity.score}/100`);
  return lines.join('\n');
}

function formatSyncPlain(d: SyncData): string {
  const lines: string[] = ['SDD Triangle Sync\n'];
  lines.push(`  Spec → Code: ${d.triangle.specToCode.matched}/${d.triangle.specToCode.total}`);
  lines.push(`  Code → Test: ${d.triangle.codeToTest.matched}/${d.triangle.codeToTest.total}`);
  lines.push(`  Spec → Test: ${d.triangle.specToTest.matched}/${d.triangle.specToTest.total}`);

  const allGaps = [
    ...d.triangle.specToCode.gaps,
    ...d.triangle.codeToTest.gaps,
    ...d.triangle.specToTest.gaps,
  ];
  if (allGaps.length > 0) {
    lines.push(`\n  Gaps (${allGaps.length}):`);
    allGaps.forEach((g) => lines.push(`    [${g.type}] ${g.path}: ${g.description}`));
  }
  if (d.decisions.length > 0) {
    lines.push(`\n  Decisions (${d.decisions.length}):`);
    d.decisions.forEach((dd) => lines.push(`    [${dd.status}] ${dd.summary} (${dd.source})`));
  }
  lines.push(`\n  Health Score: ${d.healthScore.overall.toFixed(1)} (${d.healthScore.grade})`);
  return lines.join('\n');
}
