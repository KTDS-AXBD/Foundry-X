import { z } from "@hono/zod-openapi";

export const collectionSourceTypeEnum = z.enum([
  "market_trend", "competitor", "pain_point", "technology", "regulation",
]).openapi("CollectionSourceType");

export const collectionSourceSchema = z.object({
  id: z.string().min(1),
  type: collectionSourceTypeEnum,
  name: z.string().min(1).max(200),
  url: z.string().url().optional(),
}).openapi("CollectionSource");

export const discoveryDataItemSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  type: collectionSourceTypeEnum,
  title: z.string().min(1).max(500),
  summary: z.string().min(1).max(2000),
  content: z.string().max(50000).optional(),
  tags: z.array(z.string().max(50)).max(20),
  confidence: z.number().min(0).max(1),
  collectedAt: z.number().int().positive(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("DiscoveryDataItem");

export const discoveryIngestPayloadSchema = z.object({
  version: z.literal("v1"),
  source: collectionSourceSchema,
  timestamp: z.number().int().positive(),
  data: z.array(discoveryDataItemSchema).min(1).max(100),
}).openapi("DiscoveryIngestPayload");

export const discoverySyncSchema = z.object({
  since: z.number().int().positive().optional(),
  types: z.array(collectionSourceTypeEnum).optional(),
}).openapi("DiscoverySync");
