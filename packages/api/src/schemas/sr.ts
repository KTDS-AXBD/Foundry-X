/**
 * SR (Service Request) Schemas — F116 KT DS SR 시나리오 구체화
 */
import { z } from "zod";

export const srTypeEnum = z.enum(["code_change", "bug_fix", "env_config", "doc_update", "security_patch"]);
export type SrType = z.infer<typeof srTypeEnum>;

export const srPriorityEnum = z.enum(["high", "medium", "low"]);
export type SrPriority = z.infer<typeof srPriorityEnum>;

export const srStatusEnum = z.enum(["open", "classified", "in_progress", "review", "done", "rejected"]);
export type SrStatus = z.infer<typeof srStatusEnum>;

export const createSrRequest = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: srPriorityEnum.optional().default("medium"),
  requester_id: z.string().optional(),
});
export type CreateSrRequest = z.infer<typeof createSrRequest>;

export const updateSrRequest = z.object({
  status: srStatusEnum.optional(),
  priority: srPriorityEnum.optional(),
  sr_type: srTypeEnum.optional(),
});
export type UpdateSrRequest = z.infer<typeof updateSrRequest>;

export const listSrQuery = z.object({
  status: srStatusEnum.optional(),
  sr_type: srTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type ListSrQuery = z.infer<typeof listSrQuery>;

export const executeSrRequest = z.object({
  context: z.record(z.unknown()).optional().default({}),
});
export type ExecuteSrRequest = z.infer<typeof executeSrRequest>;

export interface SrResponse {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  sr_type: SrType;
  priority: SrPriority;
  status: SrStatus;
  confidence: number;
  matched_keywords: string[];
  workflow_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface SrDetailResponse extends SrResponse {
  workflow_run?: {
    id: string;
    workflow_template: string;
    status: string;
    steps_completed: number;
    steps_total: number;
    result_summary: string | null;
    started_at: string | null;
    completed_at: string | null;
  } | null;
}
