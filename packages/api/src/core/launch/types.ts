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

export { LaunchEngine } from "./services/launch-engine.service.js";
export * from "./schemas/launch.js";
