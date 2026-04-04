/**
 * F315: Pipeline Monitoring + Permissions Schemas
 */
import { z } from "zod";

// ── Dashboard Query ──
export const dashboardQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

// ── Permission Setting ──
export const setPermissionSchema = z.object({
  userId: z.string().optional(),
  minRole: z.enum(["viewer", "member", "admin", "owner"]).default("member"),
  canApprove: z.boolean().default(true),
  canAbort: z.boolean().default(false),
});
export type SetPermissionInput = z.infer<typeof setPermissionSchema>;

// ── Pipeline Notification Types (extends existing) ──
export const PIPELINE_NOTIFICATION_TYPES = [
  "pipeline_checkpoint_pending",
  "pipeline_step_failed",
  "pipeline_completed",
  "pipeline_aborted",
] as const;
export type PipelineNotificationType = (typeof PIPELINE_NOTIFICATION_TYPES)[number];
