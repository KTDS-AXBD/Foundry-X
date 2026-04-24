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
  reportData: DiscoveryReportData | null;
  trafficLight: "green" | "yellow" | "red";
  trafficLightHistory: Array<{ date: string; value: string }>;
  recommendation: string | null;
  generatedBy: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── v2 DiscoveryReportData ───────────────────────────────────────────────────

const TagSchema = z.object({
  label: z.string(),
  color: z.enum(["mint", "blue", "amber", "red", "purple"]),
});

const MetricSchema = z.object({
  value: z.string(),
  label: z.string(),
  color: z.enum(["default", "mint", "blue", "amber", "red", "purple"]).optional(),
});

const TableRowSchema = z.object({
  cells: z.array(z.string()),
  highlight: z.boolean().optional(),
});

const TableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(TableRowSchema),
  caption: z.string().optional(),
});

const CardSchema = z.object({
  icon: z.string().optional(),
  iconColor: z.enum(["mint", "blue", "amber", "red", "purple"]).optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  metrics: z.array(MetricSchema).optional(),
  table: TableSchema.optional(),
});

const InsightBoxSchema = z.object({
  title: z.string(),
  items: z.array(z.string()),
});

const NextStepSchema = z.object({
  text: z.string(),
});

const ChartDataSchema = z.object({
  type: z.enum(["bar", "doughnut", "line"]),
  labels: z.array(z.string()),
  datasets: z.array(
    z.object({
      label: z.string(),
      data: z.array(z.number()),
      backgroundColor: z.array(z.string()).optional(),
    }),
  ),
});

const TabSchema = z.object({
  stepNumber: z.string(),
  title: z.string(),
  engTitle: z.string().optional(),
  subtitle: z.string().optional(),
  hitlVerified: z.boolean().default(false),
  tags: z.array(TagSchema).optional(),
  cards: z.array(CardSchema),
  chart: ChartDataSchema.optional(),
  insight: InsightBoxSchema.optional(),
  nextStep: NextStepSchema.optional(),
});

export const DiscoveryReportDataSchema = z.object({
  version: z.literal("v2"),
  bizItemId: z.string(),
  bizItemTitle: z.string(),
  typeCode: z.enum(["I", "M", "P", "T", "S"]).optional(),
  subtitle: z.string().optional(),
  tabs: z.object({
    "2-1": TabSchema,
    "2-2": TabSchema,
    "2-3": TabSchema,
    "2-4": TabSchema,
    "2-5": TabSchema,
    "2-6": TabSchema,
    "2-7": TabSchema,
    "2-8": TabSchema,
    "2-9": TabSchema,
  }),
  summary: z.object({
    executiveSummary: z.string(),
    trafficLight: z.enum(["green", "yellow", "red"]),
    goHoldDrop: z.enum(["Go", "Hold", "Drop"]),
    recommendation: z.string(),
  }),
});

export type DiscoveryReportData = z.infer<typeof DiscoveryReportDataSchema>;
export type DiscoveryReportTab = z.infer<typeof TabSchema>;
export type DiscoveryReportCard = z.infer<typeof CardSchema>;
export type DiscoveryReportChartData = z.infer<typeof ChartDataSchema>;
