import { z } from "zod";

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  group: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
});

export const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  weight: z.number().optional(),
});

export const GraphVisualizationSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export const AnalysisSummarySchema = z.object({
  documentId: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  score: z.number().optional(),
  summary: z.string().optional(),
  processCount: z.number().optional(),
  entityCount: z.number().optional(),
});

export const HarnessMetricsSchema = z.object({
  ktConnectivity: z.number().min(0).max(100),
  businessViability: z.number().min(0).max(100),
  riskLevel: z.number().min(0).max(100),
  aiReadiness: z.number().min(0).max(100),
  concreteness: z.number().min(0).max(100),
});

export type GraphVisualization = z.infer<typeof GraphVisualizationSchema>;
export type AnalysisSummary = z.infer<typeof AnalysisSummarySchema>;
export type HarnessMetrics = z.infer<typeof HarnessMetricsSchema>;
