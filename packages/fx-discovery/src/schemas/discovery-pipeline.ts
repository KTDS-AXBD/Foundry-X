/**
 * F539c: discovery-pipeline 쿼리 스키마 (read-only)
 */
import { z } from "zod";

export const listPipelineRunsSchema = z.object({
  status: z.string().optional(),
  bizItemId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListPipelineRunsQuery = z.infer<typeof listPipelineRunsSchema>;
