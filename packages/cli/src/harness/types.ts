/**
 * Harness module local types.
 * TODO: Replace with imports from @foundry-x/shared once Worker 1 publishes types.
 */

export type RepoMode = 'brownfield' | 'greenfield';

export interface MarkerFile {
  name: string;
  path: string;
  exists: boolean;
}

export interface ModuleInfo {
  name: string;
  path: string;
}

export interface RepoProfile {
  mode: RepoMode;
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testFrameworks: string[];
  ci?: string;
  markers: MarkerFile[];
  entryPoints?: string[];
  modules?: ModuleInfo[];
  architecturePattern?: 'monorepo' | 'single-package';
}

export interface GenerateResult {
  created: string[];
  merged: string[];
  skipped: string[];
}

export type IntegrityLevel = 'PASS' | 'WARN' | 'FAIL';

export interface IntegrityCheck {
  name: string;
  level: IntegrityLevel;
  message: string;
}

export interface HarnessIntegrity {
  score: number;
  passed: boolean;
  checks: IntegrityCheck[];
}
