import { z } from "zod";

export const GenerateReportSchema = z.object({
  bizItemId: z.string().min(1),
  title: z.string().min(1).optional(),
});

export const ReportListQuerySchema = z.object({
  bizItemId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;
export type ReportListQuery = z.infer<typeof ReportListQuerySchema>;

export interface EvaluationReport {
  id: string;
  orgId: string;
  bizItemId: string;
  title: string;
  summary: string | null;
  skillScores: Record<string, { score: number; label: string; summary: string }>;
  trafficLight: "green" | "yellow" | "red";
  trafficLightHistory: Array<{ date: string; value: string }>;
  recommendation: string | null;
  generatedBy: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
