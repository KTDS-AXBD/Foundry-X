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
