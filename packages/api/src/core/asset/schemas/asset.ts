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

// F623: /ax:domain-init β — 5-Asset 스캐폴드
export const DomainInitSchema = z
  .object({
    domainName: z.string().min(1).max(64),
    orgId: z.string().min(1),
    ownerId: z.string().min(1),
    description: z.string().max(1000).optional(),
  })
  .openapi("DomainInit");

export const DomainInitResponseSchema = z
  .object({
    domainName: z.string(),
    orgId: z.string(),
    scaffoldedAssets: z.object({
      policy: z.object({ policyId: z.string() }),
      ontology: z.object({ entityId: z.string() }),
      skill: z.object({ skillRef: z.string() }),
      log: z.object({ auditEventId: z.string() }),
      systemKnowledge: z.object({ knowledgeId: z.string() }),
    }),
    initializedAt: z.number(),
  })
  .openapi("DomainInitResponse");
