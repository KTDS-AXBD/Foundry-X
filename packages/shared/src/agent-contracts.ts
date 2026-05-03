/**
 * F580: Agent Service Contracts — cross-package DI 인터페이스
 *
 * packages/api와 packages/fx-agent가 공통으로 의존하는 service interface 계약.
 * 구현체는 각 패키지 내부에 유지하되, 타입만 이 파일에서 공유한다.
 */

// ── Discovery Domain Contracts ───────────────────────────────────────────────

export interface IDiscoveryPipelineRun {
  id: string;
  bizItemId: string;
  orgId: string;
  currentStep: string | null;
  status: string;
}

export interface IDiscoveryPipelineService {
  getRun(id: string, orgId: string): Promise<IDiscoveryPipelineRun | null>;
  createRun(orgId: string, userId: string, opts: { bizItemId: string; triggerMode: string }): Promise<IDiscoveryPipelineRun>;
  reportStepComplete(runId: string, stepId: string, data: unknown, userId: string): Promise<{ shouldTriggerShaping: boolean }>;
  reportStepFailed(runId: string, stepId: string, code: string, msg: string, userId: string): Promise<void>;
}

export interface IPipelineCheckpointService {
  isCheckpointStep(stepId: string): boolean;
  createCheckpoint(runId: string, stepId: string): Promise<{ id: string }>;
}

export interface IDiscoveryStageService {
  updateStage(bizItemId: string, orgId: string, stepId: string, status: string): Promise<void>;
}

export interface IBdSkillExecutor {
  execute(orgId: string, userId: string, skillId: string, ctx: { bizItemId: string; stageId: string; inputText: string }): Promise<void>;
}

// ── Harness Domain Contracts ─────────────────────────────────────────────────

export interface IAutoFixService {
  applyFix(params: { taskId: string; fixDescription: string; tenantId: string }): Promise<{ success: boolean; error?: string }>;
}

export interface IAuditEvent {
  tenantId: string;
  eventType: string;
  agentId?: string;
  modelId?: string;
  inputClassification?: string;
  outputType?: string;
  metadata?: Record<string, unknown>;
}

export interface IAuditLogService {
  log(event: IAuditEvent): Promise<void>;
}

export interface ITransitionGuard {
  check(context: { taskId: string; tenantId: string; fromState: string; toState: string; source: string }): Promise<{ allowed: boolean; reason?: string }>;
}
