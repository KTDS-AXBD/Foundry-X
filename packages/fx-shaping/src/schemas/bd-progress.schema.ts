/**
 * F262: BD 프로세스 진행 추적 스키마
 */
import { z } from "zod";

export const progressQuerySchema = z.object({
  signal: z.enum(["green", "yellow", "red"]).optional(),
  pipelineStage: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProgressQuery = z.infer<typeof progressQuerySchema>;
