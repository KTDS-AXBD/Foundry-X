// F351: Prototype Auto-Gen shared types (Sprint 158, Phase 16)

export type PrototypeStatus =
  | 'queued'
  | 'building'
  | 'deploying'
  | 'live'
  | 'failed'
  | 'deploy_failed'
  | 'dead_letter'
  | 'feedback_pending';

export interface Prototype {
  id: string;
  projectId: string;
  prdId: string | null;
  name: string;
  status: PrototypeStatus;
  prdContent: string;
  deployUrl: string | null;
  previewScreenshot: string | null;
  buildLog: string | null;
  errorMessage: string | null;
  qualityScore: number | null;
  ogdRounds: number;
  modelUsed: string;
  apiCost: number;
  feedbackContent: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface PrototypeCreateRequest {
  projectId: string;
  prdId?: string | null;
  prdContent: string;
  name: string;
}

export interface PrototypeUpdateRequest {
  status?: PrototypeStatus;
  deployUrl?: string;
  buildLog?: string;
  errorMessage?: string;
  qualityScore?: number;
  ogdRounds?: number;
  modelUsed?: string;
  apiCost?: number;
}

export interface PrototypeFeedbackRequest {
  content: string;
}

export const PROTOTYPE_TRANSITIONS: Record<PrototypeStatus, readonly PrototypeStatus[]> = {
  queued:           ['building'],
  building:         ['deploying', 'failed'],
  deploying:        ['live', 'deploy_failed'],
  live:             ['feedback_pending'],
  failed:           ['queued', 'dead_letter'],
  deploy_failed:    ['deploying', 'dead_letter'],
  dead_letter:      [],
  feedback_pending: ['building'],
} as const;

export const PROTOTYPE_TIMEOUTS: Record<string, number> = {
  building: 15 * 60 * 1000,
  deploying: 5 * 60 * 1000,
};

export function isValidPrototypeTransition(
  from: PrototypeStatus,
  to: PrototypeStatus,
): boolean {
  return PROTOTYPE_TRANSITIONS[from].includes(to);
}

export function getAvailablePrototypeTransitions(
  status: PrototypeStatus,
): readonly PrototypeStatus[] {
  return PROTOTYPE_TRANSITIONS[status];
}
