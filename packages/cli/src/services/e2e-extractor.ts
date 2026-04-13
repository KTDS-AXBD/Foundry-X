// F524: E2E 시나리오 자동 추출
// Design 문서 §4+§5에서 Playwright spec을 자동 생성한다.

export interface Scenario {
  name: string;
  route: string;
  selector?: string;
  actions?: string[];
  source: 'section4' | 'section5';
}

export interface ParseResult {
  scenarios: Scenario[];
  parsedSectionCount: number;
  totalSectionCount: number;
  confidenceRate: number;
}

export interface GenerateResult {
  filePath: string;
  scenarioCount: number;
  content: string;
}

// 라우트 파일로 인정하는 패턴 (service, test, spec, type, migration은 제외)
const ROUTE_FILE_PATTERN = /src\/routes\/(.+)\.tsx?$/;
const SKIP_PATTERNS = [
  /\.test\.ts/,
  /\.spec\.ts/,
  /\/services\//,
  /\/types\//,
  /\/schemas\//,
  /migrations\//,
  /e2e\//,
];

function isRouteFile(filePath: string): boolean {
  if (!ROUTE_FILE_PATTERN.test(filePath)) return false;
  return !SKIP_PATTERNS.some((p) => p.test(filePath));
}

function routeFromFilePath(filePath: string): string | null {
  const match = filePath.match(ROUTE_FILE_PATTERN);
  if (!match) return null;
  // src/routes/dashboard.tsx → /dashboard
  // src/routes/discovery/items.tsx → /discovery/items
  const routePath = (match[1] ?? '')
    .replace(/\bindex$/, '')           // index → 빈 경로
    .replace(/\$[\w]+/g, ':param');    // $id → :param
  return '/' + routePath.replace(/\/$/, '');  // 후행 슬래시 제거 (루트는 유지)
}

function parseTableRows(markdown: string): string[][] {
  const rows: string[][] = [];
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    // 구분선 행 제외 (|---|---|)
    if (cells.every((c) => /^[-: ]+$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

function extractSection5Scenarios(markdown: string): Scenario[] {
  const scenarios: Scenario[] = [];
  // §5 파일 매핑 섹션 추출
  const section5Match = markdown.match(/##\s+5[^#][\s\S]*?(?=##\s+\d|$)/);
  if (!section5Match) return scenarios;

  const section5 = section5Match[0];
  const rows = parseTableRows(section5);

  for (const row of rows) {
    if (row.length < 1) continue;
    // 첫 번째 셀이 파일 경로 (backtick으로 감싸일 수 있음)
    const rawPath = (row[0] ?? '').replace(/`/g, '').trim();
    if (!isRouteFile(rawPath)) continue;

    const route = routeFromFilePath(rawPath);
    if (!route) continue;

    // 두 번째 셀이 있으면 목적/설명을 이름으로 사용
    const name = row[1]?.trim() || rawPath.split('/').pop()?.replace('.tsx', '') || route || '';

    scenarios.push({ name, route, source: 'section5' });
  }

  return scenarios;
}

function extractSection4Scenarios(markdown: string): Scenario[] {
  const scenarios: Scenario[] = [];
  // §4 기능 명세 섹션 추출
  const section4Match = markdown.match(/##\s+4[^#][\s\S]*?(?=##\s+5|##\s+\d|$)/);
  if (!section4Match) return scenarios;

  const section4 = section4Match[0];
  const rows = parseTableRows(section4);

  // 헤더 행 제외 (보통 첫 번째 행이 | # | 기능 | 설명 | 우선순위 | 형식)
  const headerKeywords = ['#', '기능', '설명', '우선순위', 'feature', 'description', 'priority'];
  const dataRows = rows.filter((row) => {
    if (row.length < 2) return false;
    const firstCell = (row[0] ?? '').toLowerCase();
    const secondCell = (row[1] ?? '').toLowerCase();
    return !headerKeywords.some((k) => firstCell === k || secondCell === k);
  });

  for (const row of dataRows) {
    // | # | 기능명 | 설명 | ... | 형식에서 기능명 추출
    // 첫 번째 셀이 숫자(번호)이면 두 번째 셀이 기능명
    const isNumbered = /^[\w\d]+$/.test(row[0] ?? '');
    const nameCell = isNumbered && row.length >= 2 ? row[1] : row[0];
    const name = (nameCell ?? '').trim();

    if (!name || name.length < 2) continue;

    // 설명에서 URL 패턴 추출 시도
    const descCell = row[2] || row[1] || '';
    const urlMatch = descCell.match(/\/([\w-/]+)/);
    const route = urlMatch ? '/' + urlMatch[1] : '/';

    scenarios.push({ name, route, source: 'section4' });
  }

  return scenarios;
}

export function parseDesignDocument(content: string): ParseResult {
  const hasSection4 = /##\s+4[^#]/.test(content);
  const hasSection5 = /##\s+5[^#]/.test(content);
  const totalSectionCount = (hasSection4 ? 1 : 0) + (hasSection5 ? 1 : 0);

  if (totalSectionCount === 0) {
    return { scenarios: [], parsedSectionCount: 0, totalSectionCount: 0, confidenceRate: 0 };
  }

  const section5Scenarios = extractSection5Scenarios(content);
  const section4Scenarios = extractSection4Scenarios(content);
  const scenarios = [...section5Scenarios, ...section4Scenarios];

  const parsedSectionCount =
    (section5Scenarios.length > 0 ? 1 : 0) + (section4Scenarios.length > 0 ? 1 : 0);

  return {
    scenarios,
    parsedSectionCount,
    totalSectionCount,
    confidenceRate: totalSectionCount > 0 ? parsedSectionCount / totalSectionCount : 0,
  };
}

export function generateE2ESpec(scenarios: Scenario[], sprintNum: number): GenerateResult {
  const filePath = `packages/web/e2e/generated/sprint-${sprintNum}.spec.ts`;

  // 자동 생성 주석 헤더
  const header = [
    `import { test, expect } from '@playwright/test';`,
    ``,
    `// Auto-generated by F524 E2E Extractor`,
    `// Sprint: ${sprintNum}, Source: sprint-${sprintNum}.design.md`,
    `// DO NOT EDIT manually — regenerate with: pnpm e2e:generate ${sprintNum}`,
    ``,
  ].join('\n');

  // smoke 테스트는 항상 포함
  const smokeTest = [
    `test.describe('Sprint ${sprintNum}: Auto-generated E2E', () => {`,
    `  test('smoke: 앱 기본 로드 확인', async ({ page }) => {`,
    `    await page.goto('/');`,
    `    await expect(page).toHaveTitle(/.+/);`,
    `  });`,
  ];

  // 시나리오별 테스트 생성
  for (const scenario of scenarios) {
    const testName = scenario.name.replace(/'/g, "\\'");
    const route = scenario.route || '/';
    smokeTest.push(``);
    smokeTest.push(`  test('${testName}', async ({ page }) => {`);
    smokeTest.push(`    await page.goto('${route}');`);
    smokeTest.push(`    await expect(page.locator('body')).toBeVisible();`);
    if (scenario.selector) {
      smokeTest.push(`    await expect(page.locator('${scenario.selector}')).toBeVisible();`);
    }
    smokeTest.push(`  });`);
  }

  smokeTest.push(`});`);

  const content = header + smokeTest.join('\n') + '\n';
  const scenarioCount = scenarios.length + 1; // +1 for smoke

  return { filePath, scenarioCount, content };
}
