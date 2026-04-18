import { z } from "zod";

export const artifactListQuerySchema = z.object({
  bizItemId: z.string().optional(),
  stageId: z.string().optional(),
  skillId: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed", "approved", "rejected"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ArtifactListQuery = z.infer<typeof artifactListQuerySchema>;
