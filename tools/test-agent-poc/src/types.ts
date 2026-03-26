// F218: Agent SDK Test Agent PoC — 공통 타입

export interface PocConfig {
  /** 테스트 대상 소스 파일 (모노리포 루트 기준 상대 경로) */
  targetFile: string;
  /** 모노리포 루트 절대 경로 */
  projectRoot: string;
  /** 결과 저장 디렉토리 */
  outputDir: string;
  /** F139 TestAgent API URL (비교용) */
  apiUrl?: string;
}

export interface TestResult {
  approach: "f139" | "agent-sdk";
  testCount: number;
  edgeCaseCount: number;
  passRate: number;
  duration: number;
  cost: number;
  generatedFiles: string[];
  reviewScore?: number;
  rawOutput?: string;
}

export interface ComparisonReport {
  timestamp: string;
  target: string;
  results: TestResult[];
  winner: "f139" | "agent-sdk" | "tie";
  recommendation: string;
  metrics: MetricComparison[];
}

export interface MetricComparison {
  name: string;
  weight: number;
  f139Value: number;
  sdkValue: number;
  winner: "f139" | "agent-sdk" | "tie";
}

export const EVALUATION_WEIGHTS = {
  testCount: 0.2,
  edgeCaseCount: 0.25,
  passRate: 0.25,
  duration: 0.15,
  cost: 0.15,
} as const;
