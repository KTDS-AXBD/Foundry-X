import { z } from "@hono/zod-openapi";

// ─── F223: Document Sharding Schemas ───

export const ShardDocumentRequestSchema = z
  .object({
    documentId: z.string().min(1).max(200),
    title: z.string().max(500).optional(),
    content: z.string().min(1).max(500_000).describe("Markdown 문서 내용"),
    orgId: z.string().max(200).optional(),
  })
  .openapi("ShardDocumentRequest");

export const DocumentShardSchema = z
  .object({
    id: z.string(),
    documentId: z.string(),
    documentTitle: z.string(),
    sectionIndex: z.number(),
    heading: z.string(),
    content: z.string(),
    keywords: z.array(z.string()),
    agentRoles: z.array(z.string()),
    tokenCount: z.number(),
    orgId: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("DocumentShard");

export const ShardQuerySchema = z.object({
  documentId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
