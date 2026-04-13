// F524: E2E 시나리오 자동 추출 — TDD Red Phase
import { describe, it, expect } from 'vitest';
import { parseDesignDocument, generateE2ESpec } from './e2e-extractor.js';

const SAMPLE_DESIGN = `
## 4. 기능 명세

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| E1 | E2E 시나리오 자동 추출 | Design 문서에서 Playwright spec 생성 | P0 |
| E2 | Gap-E2E 통합 점수 | 종합 Match Rate 산출 | P0 |

## 5. 파일 매핑

### 신규 파일

| 파일 | 목적 | F-item |
|------|------|--------|
| \`packages/cli/src/services/e2e-extractor.ts\` | Design 문서 파싱 + E2E spec 생성 | F524 |
| \`packages/cli/src/services/gap-scorer.ts\` | Composite Score 계산 | F525 |
| \`packages/web/e2e/generated/sprint-278.spec.ts\` | 자동 생성된 E2E spec | F524 |
| \`packages/web/src/routes/analysis.tsx\` | Analysis 라우트 신규 | F525 |
`;

describe('F524: parseDesignDocument()', () => {
  it('§5 파일 매핑에서 web route 파일을 시나리오로 추출한다', () => {
    const result = parseDesignDocument(SAMPLE_DESIGN);
    const routeScenarios = result.scenarios.filter((s) => s.source === 'section5');
    expect(routeScenarios.length).toBeGreaterThan(0);
    // routes/*.tsx → route 추출
    const analysisScenario = routeScenarios.find((s) => s.route === '/analysis');
    expect(analysisScenario).toBeDefined();
  });

  it('service/test 파일은 section5 시나리오에서 제외한다', () => {
    const result = parseDesignDocument(SAMPLE_DESIGN);
    const routeScenarios = result.scenarios.filter((s) => s.source === 'section5');
    // e2e-extractor.ts (service), gap-scorer.ts (service), sprint-278.spec.ts (e2e) 제외
    const serviceScenario = routeScenarios.find(
      (s) => s.name.includes('extractor') || s.name.includes('scorer') || s.name.includes('spec'),
    );
    expect(serviceScenario).toBeUndefined();
  });

  it('§4 기능 명세 테이블에서 시나리오명을 추출한다', () => {
    const result = parseDesignDocument(SAMPLE_DESIGN);
    const section4Scenarios = result.scenarios.filter((s) => s.source === 'section4');
    expect(section4Scenarios.length).toBeGreaterThan(0);
    const names = section4Scenarios.map((s) => s.name);
    expect(names).toContain('E2E 시나리오 자동 추출');
  });

  it('파싱 결과에 confidenceRate가 포함된다', () => {
    const result = parseDesignDocument(SAMPLE_DESIGN);
    expect(result.confidenceRate).toBeGreaterThanOrEqual(0);
    expect(result.confidenceRate).toBeLessThanOrEqual(1);
    expect(result.totalSectionCount).toBeGreaterThan(0);
  });

  it('빈 문서이면 scenarios가 비고 confidenceRate는 0이다', () => {
    const result = parseDesignDocument('# 빈 문서\n\n내용 없음');
    expect(result.scenarios).toHaveLength(0);
    expect(result.confidenceRate).toBe(0);
  });
});

describe('F524: generateE2ESpec()', () => {
  it('ScenarioList에서 Playwright spec 문자열을 생성한다', () => {
    const scenarios = [
      { name: 'Analysis 페이지 확인', route: '/analysis', source: 'section5' as const },
    ];
    const result = generateE2ESpec(scenarios, 278);
    expect(result.content).toContain("import { test, expect } from '@playwright/test'");
    expect(result.content).toContain('test.describe');
    expect(result.content).toContain('/analysis');
  });

  it('빈 시나리오 목록이면 smoke 테스트 1개만 포함한다', () => {
    const result = generateE2ESpec([], 278);
    expect(result.scenarioCount).toBe(1);
    expect(result.content).toContain('smoke');
  });

  it('생성된 spec 파일 경로가 generated/sprint-278.spec.ts이다', () => {
    const result = generateE2ESpec([], 278);
    expect(result.filePath).toContain('generated/sprint-278.spec.ts');
  });

  it('생성된 spec에 자동 생성 주석이 포함된다', () => {
    const result = generateE2ESpec([], 278);
    expect(result.content).toContain('Auto-generated');
    expect(result.content).toContain('F524');
  });
});
