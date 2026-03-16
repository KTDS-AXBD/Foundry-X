import type { RepoProfile } from '@foundry-x/shared';

export function buildAgents(profile: RepoProfile): string {
  const sections: string[] = [];

  sections.push('# AGENTS.md');
  sections.push('');
  sections.push(
    'This file provides guidance to AI coding agents (Codex, etc.) working in this repository.',
  );
  sections.push('');

  sections.push(buildProjectOverview(profile));
  sections.push(buildWorkflow(profile));
  sections.push(EVOLUTION_RULES);

  return sections.join('\n');
}

function buildProjectOverview(profile: RepoProfile): string {
  const lines: string[] = ['## Project Overview'];

  lines.push(`- Language: ${profile.languages.join(', ') || 'unknown'}`);
  lines.push(`- Framework: ${profile.frameworks.join(', ') || '(none)'}`);
  lines.push(`- Architecture: ${profile.architecturePattern}`);

  if (profile.modules.length > 0) {
    lines.push(`- Modules: ${profile.modules.map((m) => m.name).join(', ')}`);
  }

  lines.push('');
  return lines.join('\n');
}

function buildWorkflow(profile: RepoProfile): string {
  // Collect step descriptions, then number them
  const items: string[] = [];

  items.push('Read specs/ for requirements');
  items.push('Check CONSTITUTION.md for boundaries');
  items.push('Implement changes');

  // Test step
  if (profile.testFrameworks.length > 0) {
    const pm = profile.packageManager ?? 'npm';
    if (profile.scripts?.test) {
      items.push(`Run tests (\`${pm} run test\`)`);
    } else {
      items.push(`Run tests (\`${profile.testFrameworks[0]}\`)`);
    }
  } else {
    items.push('Run tests');
  }

  // Lint step
  if (profile.scripts?.lint) {
    const pm = profile.packageManager ?? 'npm';
    items.push(`Run lint (\`${pm} run lint\`)`);
  } else if (profile.languages.includes('go')) {
    items.push('Run lint (`go vet ./...`)');
  }

  // Typecheck step
  if (profile.scripts?.typecheck) {
    const pm = profile.packageManager ?? 'npm';
    items.push(`Run typecheck (\`${pm} run typecheck\`)`);
  } else if (profile.languages.includes('typescript')) {
    items.push('Run typecheck (`tsc --noEmit`)');
  }

  items.push('Update progress.md');

  const numbered = items.map((item, i) => `${i + 1}. ${item}`);
  return ['## Workflow', '', ...numbered, ''].join('\n');
}

const EVOLUTION_RULES = [
  '## 하네스 갱신 규칙 (에이전트 필독)',
  '',
  '이 파일은 프로젝트와 함께 살아있어야 한다.',
  '다음 조건에서 이 파일을 업데이트하라:',
  '- 새 CLI 커맨드 추가 시',
  '- 새로운 Always/Ask/Never 경계 결정 시',
  '갱신 후: `foundry-x status`로 하네스 무결성 확인',
  '',
].join('\n');
