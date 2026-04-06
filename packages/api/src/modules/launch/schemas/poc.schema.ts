import { z } from "zod";

export const POC_STATUSES = ["planning", "in_progress", "completed", "cancelled"] as const;
export type PocStatus = (typeof POC_STATUSES)[number];

export const CreatePocSchema = z.object({
  bizItemId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  framework: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const UpdatePocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(POC_STATUSES).optional(),
  framework: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const PocFilterSchema = z.object({
  status: z.enum(POC_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const CreatePocKpiSchema = z.object({
  metricName: z.string().min(1).max(200),
  targetValue: z.number().optional(),
  actualValue: z.number().optional(),
  unit: z.string().max(50).default("count"),
});
