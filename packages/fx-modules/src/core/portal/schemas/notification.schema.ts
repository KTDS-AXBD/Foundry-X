import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "stage_change", "review_request", "decision_made", "share_created", "comment_added",
  "pipeline_checkpoint_pending", "pipeline_step_failed", "pipeline_completed", "pipeline_aborted",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NotificationFilterSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
