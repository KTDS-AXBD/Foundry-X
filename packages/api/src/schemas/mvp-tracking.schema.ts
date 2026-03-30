import { z } from "zod";

export const MVP_STATUSES = ["in_dev", "testing", "released"] as const;
export type MvpStatus = (typeof MVP_STATUSES)[number];

export const CreateMvpSchema = z.object({
  bizItemId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  repoUrl: z.string().url().optional(),
  deployUrl: z.string().url().optional(),
  techStack: z.string().max(500).optional(),
  assignedTo: z.string().optional(),
});

export const UpdateMvpStatusSchema = z.object({
  status: z.enum(MVP_STATUSES),
  reason: z.string().max(1000).optional(),
});

export const MvpFilterSchema = z.object({
  status: z.enum(MVP_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
