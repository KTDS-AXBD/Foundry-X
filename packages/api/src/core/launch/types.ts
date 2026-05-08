// F616: Launch-X Solo — Type 1 (정적 zip) + Type 2 (Runtime 인스턴스)

export type LaunchType = 1 | 2;

export interface LaunchManifest {
  releaseId: string;
  orgId: string;
  launchType: LaunchType;
  artifactRef: string;
  sha256: string;
  metadata: Record<string, unknown>;
  generatedAt: number;
}

export interface LaunchArtifactType1 {
  releaseId: string;
  orgId: string;
  downloadUrl: string;
  manifestPath: string;
  zipSize: number | null;
  sha256: string;
  expiresAt: number | null;
  createdAt: number;
}

export interface LaunchRuntimeType2 {
  releaseId: string;
  orgId: string;
  invokeEndpoint: string;
  runtimeVersion: string;
  status: "pending" | "active" | "retired";
  createdAt: number;
}

export interface LaunchDecisionRecord {
  id: string;
  releaseId: string;
  orgId: string;
  launchType: LaunchType;
  manifest: LaunchManifest;
  auditEventId: number | null;
  decidedAt: number;
}

// F618: Additional types for SkillRegistry + ObjectStore + Rollback
export interface SkillEntry {
  skillId: string;
  skillVersion: string;
  skillMeta: Record<string, unknown>;
  active: boolean;
  registeredAt: number;
}

export interface ObjectUploadResult {
  releaseId: string;
  downloadUrl: string;
  expiresAt: number;
  size: number;
}

export interface RollbackRecord {
  rollbackId: string;
  releaseId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  requester: string;
  executedAt: number;
}

export { LaunchEngine } from "./services/launch-engine.service.js";
export { SkillRegistryService } from "./services/skill-registry.service.js";
export { ObjectStoreService } from "./services/object-store.service.js";
export { RollbackService } from "./services/rollback.service.js";
// NOTE: schemas barrel re-export 금지 (S336 — foundry-x-api/no-types-schema-barrel).
// schemas 심볼은 호출자가 "./schemas/launch.js" 에서 직접 import.
