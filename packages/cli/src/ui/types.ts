import type { HealthScore, HarnessIntegrity, GapItem, Decision } from '@foundry-x/shared';
import type { HarnessFreshness } from '../services/harness-freshness.js';

export interface StatusData {
  config: { mode: string; template: string; initialized: string };
  healthScore: HealthScore | null;
  integrity: HarnessIntegrity;
  plumbAvailable: boolean;
  harnessFreshness?: HarnessFreshness;
}

export type InitStep = 'git-check' | 'detect-mode' | 'discover-stack' | 'analyze-arch' | 'resolve-template' | 'generate-harness' | 'verify-integrity' | 'save-config';

export interface InitStepResult {
  step: InitStep;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

export interface InitData {
  steps: InitStepResult[];
  result: { created: string[]; merged: string[]; skipped: string[] };
  integrity: { score: number };
}

export interface SyncData {
  triangle: {
    specToCode: { matched: number; total: number; gaps: GapItem[] };
    codeToTest: { matched: number; total: number; gaps: GapItem[] };
    specToTest: { matched: number; total: number; gaps: GapItem[] };
  };
  decisions: Decision[];
  healthScore: HealthScore;
}

export interface RenderOptions {
  json: boolean;
  short?: boolean;
  verbose?: boolean;
}
