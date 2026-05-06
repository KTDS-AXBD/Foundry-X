// F616: Launch-X Zod schemas
import { z } from "zod";

export const LaunchTypeSchema = z.union([z.literal(1), z.literal(2)]);

export const PackageRequestSchema = z.object({
  orgId: z.string().min(1),
  artifactRef: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const DeployRequestSchema = z.object({
  releaseId: z.string().min(1),
  launchType: LaunchTypeSchema,
});

export const LaunchResponseSchema = z.object({
  releaseId: z.string(),
  launchType: LaunchTypeSchema,
  manifest: z.any(),
  status: z.string(),
});

// F618: SkillRegistry + Rollback schemas
export const RegisterSkillSchema = z.object({
  skillId: z.string().min(1),
  skillVersion: z.string().min(1),
  meta: z.record(z.unknown()).optional(),
});

export const RollbackRequestSchema = z.object({
  releaseId: z.string().min(1),
  fromVersion: z.string().min(1),
  toVersion: z.string().min(1),
  reason: z.string().min(1),
  requester: z.string().min(1),
});

export const RollbackResponseSchema = z.object({
  rollbackId: z.string(),
  releaseId: z.string(),
  fromVersion: z.string(),
  toVersion: z.string(),
  reason: z.string(),
  requester: z.string(),
  executedAt: z.number(),
});
