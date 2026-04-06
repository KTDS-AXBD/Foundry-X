import { z } from "@hono/zod-openapi";

export const CreateEvaluationSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ideaId: z.string().optional(),
  bmcId: z.string().optional(),
}).openapi("CreateEvaluation");

export const UpdateEvalStatusSchema = z.object({
  status: z.enum(["draft", "active", "go", "kill", "hold"]),
  reason: z.string().max(500).optional(),
}).openapi("UpdateEvalStatus");

export const CreateKpiSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(["market", "tech", "revenue", "risk", "custom"]),
  target: z.number().min(0),
  unit: z.string().max(20).optional(),
}).openapi("CreateKpi");

export const UpdateKpiSchema = z.object({
  actual: z.number().nullable().optional(),
  target: z.number().min(0).optional(),
}).openapi("UpdateKpi");
