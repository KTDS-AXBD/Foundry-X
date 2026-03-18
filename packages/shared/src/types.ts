// ─── Harness Pipeline Types (v4) ───

/** 리포지토리 유형 */
export type RepoMode = 'brownfield' | 'greenfield';

/** 프로젝트 마커 감지 결과 */
export interface MarkerFile {
  path: string;
  type: 'node' | 'python' | 'go' | 'java' | 'unknown';
}

export interface ModuleInfo {
  name: string;
  path: string;
  role: string;
}

/** 리포지토리 프로필 (detect → discover → analyze 순으로 채워짐) */
export interface RepoProfile {
  mode: RepoMode;
  // Phase 0: discover
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testFrameworks: string[];
  ci: string | null;
  packageManager: string | null;
  markers: MarkerFile[];
  // Phase 1: analyze
  entryPoints: string[];
  modules: ModuleInfo[];
  architecturePattern: string;
  /** package.json scripts 중 주요 커맨드 (build, test, lint 등) */
  scripts?: Record<string, string>;
}

/** 산출물 생성 결과 */
export interface GenerateResult {
  created: string[];
  merged: string[];
  skipped: string[];
}

/** 하네스 무결성 검증 결과 */
export interface HarnessIntegrity {
  passed: boolean;
  score: number;
  checks: IntegrityCheck[];
}

export type IntegrityLevel = 'PASS' | 'WARN' | 'FAIL';

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  level: IntegrityLevel;
  message: string;
}

// ─── SDD Triangle Types (v3) ───

export interface SyncResult {
  success: boolean;
  timestamp: string;
  duration: number;
  triangle: {
    specToCode: SyncStatus;
    codeToTest: SyncStatus;
    specToTest: SyncStatus;
  };
  decisions: Decision[];
  errors: PlumbError[];
}

export interface SyncStatus {
  matched: number;
  total: number;
  gaps: GapItem[];
}

export interface GapItem {
  type: 'spec_only' | 'code_only' | 'test_missing' | 'drift';
  path: string;
  description: string;
}

export interface Decision {
  id: string;
  source: 'agent' | 'human';
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
  commit: string;
}

// ─── PlumbBridge Types (v3) ───

export interface PlumbResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  data?: unknown;
}

export interface PlumbError {
  code: string;
  message: string;
}

// ─── Config & Logging (v3 + v4) ───

export interface CommandLog {
  command: 'init' | 'sync' | 'status';
  timestamp: string;
  duration: number;
  success: boolean;
  args: Record<string, unknown>;
  plumbCalled: boolean;
  harnessIntegrity?: number;
  error?: string;
}

export interface HealthScore {
  overall: number;
  specToCode: number;
  codeToTest: number;
  specToTest: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface FoundryXConfig {
  version: string;
  initialized: string;
  template: string;
  mode: RepoMode;
  repoProfile: RepoProfile;
  plumb: {
    timeout: number;
    pythonPath: string;
  };
  git: {
    provider: 'github' | 'gitlab';
    remote?: string;
  };
}

// ─── Sprint 12: Ambiguity Score (F59) ───

export interface AmbiguityDimension {
  name: 'goal' | 'constraint' | 'success' | 'context';
  clarity: number;
  weight: number;
}

export interface AmbiguityScore {
  dimensions: AmbiguityDimension[];
  totalClarity: number;
  ambiguity: number;
  ready: boolean;
  projectType: 'greenfield' | 'brownfield';
}

export function calculateAmbiguity(dimensions: AmbiguityDimension[]): number {
  const totalClarity = dimensions.reduce((sum, d) => sum + d.clarity * d.weight, 0);
  return parseFloat((1 - totalClarity).toFixed(4));
}

export const GREENFIELD_WEIGHTS: Record<string, number> = {
  goal: 0.4, constraint: 0.3, success: 0.3,
};

export const BROWNFIELD_WEIGHTS: Record<string, number> = {
  goal: 0.35, constraint: 0.25, success: 0.25, context: 0.15,
};
