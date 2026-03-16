import type { RepoProfile } from '@foundry-x/shared';

export function buildConstitution(profile: RepoProfile): string {
  const always = [...BASE_ALWAYS, ...getStackAlways(profile)];
  const ask = [...BASE_ASK, ...getStackAsk(profile)];
  const never = [...BASE_NEVER, ...getStackNever(profile)];

  return [
    '# CONSTITUTION.md — 에이전트 행동 경계',
    '',
    '## Always (항상 해도 됨)',
    ...always.map((r) => `- ${r}`),
    '',
    '## Ask (반드시 확인 후 실행)',
    ...ask.map((r) => `- ${r}`),
    '',
    '## Never (절대 금지)',
    ...never.map((r) => `- ${r}`),
    '',
  ].join('\n');
}

// ── Base rules (all projects) ──

const BASE_ALWAYS = [
  'specs/ 파일 읽기',
  '테스트 실행 (read-only)',
  'lint 실행',
  'feature branch 생성',
  'progress.md 업데이트',
  'ADR 초안 작성 (commit 전 human 확인 필요)',
];

const BASE_ASK = [
  '외부 API 호출 (부작용 있는 것)',
  '스키마 변경',
  'PR merge 또는 main 브랜치 직접 수정',
  '새 환경 변수 추가',
  '기존 테스트 삭제 또는 skip 처리',
];

const BASE_NEVER = [
  'main 브랜치 직접 push',
  '--no-verify 플래그 사용',
  '인증 정보(API key, 비밀번호) Git commit',
  'DB 직접 수정 (마이그레이션 스크립트 외)',
  '다른 에이전트의 작업 브랜치에 직접 push',
];

// ── Stack-specific rules ──

function getStackAlways(profile: RepoProfile): string[] {
  const rules: string[] = [];

  if (hasNode(profile)) {
    if (profile.testFrameworks.includes('vitest')) {
      rules.push('`npx vitest run` 실행');
    } else if (profile.testFrameworks.includes('jest')) {
      rules.push('`npx jest` 실행');
    }
  }

  if (profile.languages.includes('go')) {
    rules.push('`go test ./...` 실행');
    rules.push('`go vet ./...` 실행');
  }

  if (profile.languages.includes('python')) {
    rules.push('`pytest` 실행');
    rules.push('`pip freeze` 확인');
  }

  return rules;
}

function getStackAsk(profile: RepoProfile): string[] {
  const rules: string[] = [];

  if (hasNode(profile)) {
    const pm = profile.packageManager ?? 'npm';
    rules.push(`의존성 추가 (\`${pm} install\` / package.json 수정)`);
  }

  if (profile.languages.includes('go')) {
    rules.push('의존성 추가 (`go get`)');
  }

  if (profile.languages.includes('python')) {
    rules.push('의존성 추가 (`pip install` / Pipfile 수정)');
  }

  if (profile.languages.includes('java')) {
    rules.push('의존성 추가 (`pom.xml` 수정)');
  }

  // Fallback if no specific stack detected
  if (rules.length === 0) {
    rules.push('의존성 추가 (패키지 매니저 설정 파일 수정)');
  }

  return rules;
}

function getStackNever(profile: RepoProfile): string[] {
  const rules: string[] = [];

  if (hasNode(profile)) {
    const pm = profile.packageManager ?? 'npm';
    rules.push(`\`${pm} install --force\` 또는 \`--legacy-peer-deps\` 사용`);
  }

  if (profile.languages.includes('python')) {
    rules.push('virtualenv 외부에 직접 패키지 설치');
  }

  if (profile.languages.includes('go')) {
    rules.push('`go mod tidy` 사전 확인 없이 실행');
  }

  return rules;
}

function hasNode(profile: RepoProfile): boolean {
  return (
    profile.languages.includes('javascript') ||
    profile.languages.includes('typescript')
  );
}
