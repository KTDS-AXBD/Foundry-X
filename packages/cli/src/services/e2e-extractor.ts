// F524: E2E 시나리오 자동 추출 — stub (TDD Red Phase)
// Green Phase에서 구현 예정

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

export function parseDesignDocument(_content: string): ParseResult {
  throw new Error('Not implemented');
}

export function generateE2ESpec(_scenarios: Scenario[], _sprintNum: number): GenerateResult {
  throw new Error('Not implemented');
}
