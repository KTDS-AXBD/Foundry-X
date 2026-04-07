/**
 * F255: KG Ontology Zod schemas
 */

import { z } from "zod";

const kgNodeTypes = [
  "PRODUCT", "INDUSTRY", "COUNTRY", "COMPANY",
  "TECHNOLOGY", "RESEARCH", "EVENT", "ALERT",
] as const;

const kgRelationTypes = [
  "SUPPLIES", "BELONGS_TO", "PRODUCED_IN", "PRODUCED_BY",
  "USES_TECH", "RESEARCHED_BY", "AFFECTED_BY", "WARNED_BY",
  "SUBSTITUTES", "COMPETES_WITH",
] as const;

export const createNodeSchema = z.object({
  type: z.enum(kgNodeTypes),
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updateNodeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameEn: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const nodeQuerySchema = z.object({
  type: z.enum(kgNodeTypes).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createEdgeSchema = z.object({
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  relationType: z.enum(kgRelationTypes),
  weight: z.number().min(0).max(1).default(1.0),
  label: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const pathQuerySchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  maxDepth: z.coerce.number().int().min(1).max(10).default(5),
});

export const impactBodySchema = z.object({
  sourceNodeId: z.string().min(1),
  decayFactor: z.number().min(0.1).max(1.0).default(0.7),
  threshold: z.number().min(0).max(1).default(0.1),
  maxDepth: z.number().int().min(1).max(10).default(5),
  relationTypes: z.array(z.enum(kgRelationTypes)).optional(),
});

export const neighborQuerySchema = z.object({
  direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
});

export const subgraphQuerySchema = z.object({
  depth: z.coerce.number().int().min(1).max(5).default(2),
});

// F256: Scenario simulation
export const scenarioSimulateSchema = z.object({
  eventNodeIds: z.array(z.string().min(1)).min(1).max(5),
  decayFactor: z.number().min(0.1).max(1.0).default(0.7),
  threshold: z.number().min(0).max(1).default(0.1),
  maxDepth: z.number().int().min(1).max(10).default(5),
});
