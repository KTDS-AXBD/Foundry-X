import type { RepoProfile } from '@foundry-x/shared';

export function buildClaude(profile: RepoProfile): string {
  const sections: string[] = [];

  sections.push('# CLAUDE.md');
  sections.push('');
  sections.push(
    'This file provides guidance to Claude Code when working in this repository.',
  );
  sections.push('');

  sections.push(buildProjectOverview(profile));
  sections.push(buildCommands(profile));
  sections.push(EVOLUTION_RULES);

  return sections.join('\n');
}

function buildProjectOverview(profile: RepoProfile): string {
  const lines: string[] = ['## Project Overview'];

  lines.push(`- Language: ${profile.languages.join(', ') || 'unknown'}`);
  lines.push(`- Framework: ${profile.frameworks.join(', ') || '(none)'}`);
  lines.push(`- Build: ${profile.buildTools.join(', ') || 'unknown'}`);
  lines.push(`- Architecture: ${profile.architecturePattern}`);

  if (profile.testFrameworks.length > 0) {
    lines.push(`- Test: ${profile.testFrameworks.join(', ')}`);
  }

  lines.push('');
  return lines.join('\n');
}

function buildCommands(profile: RepoProfile): string {
  const lines: string[] = ['## Commands'];
  const pm = profile.packageManager ?? 'npm';

  if (profile.scripts) {
    if (profile.scripts.build) lines.push(`- Build: \`${pm} run build\``);
    if (profile.scripts.test) lines.push(`- Test: \`${pm} run test\``);
    if (profile.scripts.lint) lines.push(`- Lint: \`${pm} run lint\``);
    if (profile.scripts.typecheck) lines.push(`- Typecheck: \`${pm} run typecheck\``);
    if (profile.scripts.dev) lines.push(`- Dev: \`${pm} run dev\``);
    if (profile.scripts.format) lines.push(`- Format: \`${pm} run format\``);
    if (profile.scripts.start) lines.push(`- Start: \`${pm} run start\``);
  }

  // Fallback: infer from stack if no scripts detected
  if (!profile.scripts || Object.keys(profile.scripts).length === 0) {
    lines.push(`- Build: \`${inferBuild(profile)}\``);
    lines.push(`- Test: \`${inferTest(profile)}\``);
    lines.push('- Lint: [TODO: add lint command]');
  }

  lines.push('');
  return lines.join('\n');
}

function inferBuild(profile: RepoProfile): string {
  if (profile.languages.includes('typescript')) return 'tsc --noEmit';
  if (profile.languages.includes('go')) return 'go build ./...';
  if (profile.languages.includes('python')) return 'python -m build';
  if (profile.languages.includes('java')) return 'mvn compile';
  return '[TODO: add build command]';
}

function inferTest(profile: RepoProfile): string {
  if (profile.testFrameworks.includes('vitest')) return 'npx vitest run';
  if (profile.testFrameworks.includes('jest')) return 'npx jest';
  if (profile.testFrameworks.includes('mocha')) return 'npx mocha';
  if (profile.languages.includes('go')) return 'go test ./...';
  if (profile.languages.includes('python')) return 'pytest';
  return '[TODO: add test command]';
}

const EVOLUTION_RULES = [
  '## 하네스 갱신 규칙 (에이전트 필독)',
  '',
  '이 파일은 프로젝트와 함께 살아있어야 한다.',
  '다음 조건에서 이 파일을 업데이트하라:',
  '- 새 CLI 커맨드 추가 시',
  '- 빌드/테스트/lint 커맨드 변경 시',
  '- 디렉터리 구조 주요 변경 시',
  '갱신 후: `foundry-x status`로 하네스 무결성 확인',
  '',
].join('\n');
