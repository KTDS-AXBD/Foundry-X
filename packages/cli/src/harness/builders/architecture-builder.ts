import type { RepoProfile } from '@foundry-x/shared';

export function buildArchitecture(profile: RepoProfile): string {
  const sections: string[] = [];

  sections.push('# ARCHITECTURE.md');
  sections.push('');
  sections.push(
    '에이전트에게 **무엇이 어디 있는지**를 알려준다. 왜 존재하는지는 ADR에 있다.',
  );
  sections.push('');

  sections.push(buildLayerDiagram(profile));
  sections.push(buildModuleMap(profile));
  sections.push(buildEntryPoints(profile));
  sections.push(buildDependencyRules(profile));
  sections.push(buildForbiddenPatterns());
  sections.push(EVOLUTION_RULES);

  return sections.join('\n');
}

function buildLayerDiagram(profile: RepoProfile): string {
  const lines: string[] = ['## 레이어 구조', ''];

  if (profile.architecturePattern === 'monorepo') {
    lines.push('```');
    lines.push('┌─────────────────────────────────────────┐');
    lines.push('│  packages/                              │');
    for (const mod of profile.modules) {
      lines.push(`│  ├── ${mod.name.padEnd(12)} (${mod.role})${' '.repeat(Math.max(0, 14 - mod.role.length))}│`);
    }
    lines.push('└─────────────────────────────────────────┘');
    lines.push('```');
  } else {
    lines.push('```');
    lines.push('┌─────────────────────────────────────────┐');
    lines.push('│  src/                                   │');
    if (profile.entryPoints.length > 0 && profile.entryPoints[0] !== undefined) {
      lines.push(`│  └── ${profile.entryPoints[0].padEnd(33)}│`);
    }
    lines.push('└─────────────────────────────────────────┘');
    lines.push('```');
  }

  lines.push('');
  return lines.join('\n');
}

function buildModuleMap(profile: RepoProfile): string {
  const lines: string[] = [
    '## 모듈 맵',
    '',
    '| 모듈 | 경로 | 역할 | 진입점 |',
    '|------|------|------|--------|',
  ];

  if (profile.modules.length === 0) {
    lines.push('| (단일 패키지) | src/ | — | — |');
  } else {
    for (const mod of profile.modules) {
      const entry =
        profile.entryPoints.find((e) => e.startsWith(mod.path)) ?? '—';
      lines.push(`| ${mod.name} | ${mod.path} | ${mod.role} | ${entry} |`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function buildEntryPoints(profile: RepoProfile): string {
  if (profile.entryPoints.length === 0) return '';

  const lines: string[] = ['## 진입점', ''];
  for (const ep of profile.entryPoints) {
    lines.push(`- \`${ep}\``);
  }
  lines.push('');
  return lines.join('\n');
}

function buildDependencyRules(profile: RepoProfile): string {
  const lines: string[] = ['## 의존성 규칙', ''];

  if (profile.architecturePattern === 'monorepo' && profile.modules.length >= 2) {
    lines.push('- 패키지 간 의존은 `package.json`에 명시된 방향만 허용');
    for (let i = 0; i < profile.modules.length; i++) {
      for (let j = i + 1; j < profile.modules.length; j++) {
        const modA = profile.modules[i];
        const modB = profile.modules[j];
        if (modA && modB) {
          lines.push(`- ${modA.name} ↔ ${modB.name}: package.json 확인 후 판단`);
        }
      }
    }
  }

  lines.push('- 외부 패키지 추가 시 → ADR 작성 필수');
  lines.push('');
  return lines.join('\n');
}

function buildForbiddenPatterns(): string {
  return [
    '## 금지 패턴',
    '',
    '- 순환 의존 (A → B → A)',
    '- 상위 레이어에서 하위 레이어로의 역방향 import',
    '- 테스트 코드에서 프로덕션 외부 서비스 직접 호출',
    '',
  ].join('\n');
}

const EVOLUTION_RULES = [
  '## 하네스 갱신 규칙 (에이전트 필독)',
  '',
  '이 파일은 프로젝트와 함께 살아있어야 한다.',
  '다음 조건에서 이 파일을 업데이트하라:',
  '- 새 패키지/모듈 추가 시',
  '- 패키지 간 의존 방향 변경 시',
  '- 새 진입점 추가 시',
  '갱신 후: `foundry-x status`로 하네스 무결성 확인',
  '',
].join('\n');
