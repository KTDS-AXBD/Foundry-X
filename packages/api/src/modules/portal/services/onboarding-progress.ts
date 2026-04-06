/**
 * OnboardingProgressService — 온보딩 진행률 추적 (F122)
 */

export const ONBOARDING_STEPS = [
  { id: "view_dashboard", label: "Dashboard 확인" },
  { id: "create_project", label: "프로젝트 연결" },
  { id: "run_agent", label: "에이전트 실행" },
  { id: "check_spec", label: "Spec 동기화" },
  { id: "submit_feedback", label: "피드백 제출" },
] as const;

export interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
}

export interface OnboardingProgress {
  userId: string;
  completedSteps: string[];
  totalSteps: number;
  progressPercent: number;
  steps: OnboardingStep[];
}

export class OnboardingProgressService {
  constructor(private db: D1Database) {}

  async getProgress(tenantId: string, userId: string): Promise<OnboardingProgress> {
    const rows = await this.db
      .prepare(
        "SELECT step_id, completed, completed_at FROM onboarding_progress WHERE tenant_id = ? AND user_id = ? AND completed = 1",
      )
      .bind(tenantId, userId)
      .all<{ step_id: string; completed: number; completed_at: string | null }>();

    const completedMap = new Map<string, string | null>();
    for (const row of rows.results ?? []) {
      completedMap.set(row.step_id, row.completed_at);
    }

    const completedSteps = ONBOARDING_STEPS.filter((s) => completedMap.has(s.id)).map((s) => s.id);
    const totalSteps = ONBOARDING_STEPS.length;
    const progressPercent = Math.round((completedSteps.length / totalSteps) * 100);

    const steps: OnboardingStep[] = ONBOARDING_STEPS.map((s) => ({
      id: s.id,
      label: s.label,
      completed: completedMap.has(s.id),
      completedAt: completedMap.get(s.id) ?? null,
    }));

    return { userId, completedSteps, totalSteps, progressPercent, steps };
  }

  async completeStep(
    tenantId: string,
    userId: string,
    stepId: string,
  ): Promise<{ success: boolean; stepId: string; progressPercent: number; allComplete: boolean }> {
    const validStep = ONBOARDING_STEPS.find((s) => s.id === stepId);
    if (!validStep) {
      throw new Error(`Invalid stepId: ${stepId}`);
    }

    const id = `op-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        "INSERT OR REPLACE INTO onboarding_progress (id, tenant_id, user_id, step_id, completed, completed_at) VALUES (?, ?, ?, ?, 1, ?)",
      )
      .bind(id, tenantId, userId, stepId, now)
      .run();

    const progress = await this.getProgress(tenantId, userId);

    return {
      success: true,
      stepId,
      progressPercent: progress.progressPercent,
      allComplete: progress.completedSteps.length === ONBOARDING_STEPS.length,
    };
  }
}
