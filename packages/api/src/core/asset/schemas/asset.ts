import { z } from "@hono/zod-openapi";
import { ASSET_TYPES, SYSTEM_KNOWLEDGE_CONTENT_TYPES } from "../types.js";

export const AssetTypeSchema = z.enum(
  ASSET_TYPES as unknown as ["policy", "ontology", "skill", "log", "system_knowledge"],
);

export const SystemKnowledgeContentTypeSchema = z.enum(
  SYSTEM_KNOWLEDGE_CONTENT_TYPES as unknown as [
    "sop",
    "transcript",
    "knowledge_graph_input",
    "domain_rule",
    "tacit_knowledge",
  ],
);

export const RegisterSystemKnowledgeSchema = z
  .object({
    orgId: z.string().min(1),
    title: z.string().min(1),
    contentRef: z.string().min(1).openapi({ description: "Git path 또는 external URL" }),
    contentType: SystemKnowledgeContentTypeSchema,
    metadata: z.record(z.unknown()).optional(),
    createdBy: z.string().optional(),
  })
  .openapi("RegisterSystemKnowledge");

export const SystemKnowledgeResponseSchema = z
  .object({
    id: z.string(),
    orgId: z.string(),
    assetType: z.literal("system_knowledge"),
    title: z.string(),
    contentRef: z.string(),
    contentType: SystemKnowledgeContentTypeSchema,
    metadata: z.record(z.unknown()).nullable(),
    createdBy: z.string().nullable(),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .openapi("SystemKnowledgeResponse");
