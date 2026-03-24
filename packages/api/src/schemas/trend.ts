/**
 * Sprint 57 F190: 트렌드 분석 Zod 스키마
 */
import { z } from "@hono/zod-openapi";

export const TrendReportRequestSchema = z.object({
  forceRefresh: z.boolean().default(false),
}).openapi("TrendReportRequest");

export const TrendReportSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  marketSummary: z.string(),
  marketSizeEstimate: z.object({
    tam: z.string(),
    sam: z.string(),
    som: z.string(),
    currency: z.string(),
    year: z.number(),
    confidence: z.enum(["high", "medium", "low"]),
  }).nullable(),
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().optional(),
    relevance: z.enum(["high", "medium", "low"]),
  })),
  trends: z.array(z.object({
    title: z.string(),
    description: z.string(),
    impact: z.enum(["high", "medium", "low"]),
    timeframe: z.string(),
  })),
  keywordsUsed: z.array(z.string()),
  modelUsed: z.string(),
  tokensUsed: z.number(),
  analyzedAt: z.string(),
  expiresAt: z.string(),
}).openapi("TrendReport");

export const CompetitorScanResultSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().optional(),
    relevance: z.enum(["high", "medium", "low"]),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  })),
  marketPosition: z.string(),
  tokensUsed: z.number(),
  model: z.string(),
}).openapi("CompetitorScanResult");
