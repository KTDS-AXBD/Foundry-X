import { z } from "@hono/zod-openapi";

export const RegisterEntitySchema = z
  .object({
    serviceId: z
      .enum(["foundry-x", "discovery-x", "ai-foundry"])
      .openapi({ description: "Source service ID" }),
    entityType: z.string().min(1).openapi({ description: "Entity type (experiment, skill, agent_task, discovery, document)" }),
    externalId: z.string().min(1).openapi({ description: "Primary key in the source service" }),
    title: z.string().min(1).openapi({ description: "Entity title" }),
    status: z.string().optional().openapi({ description: "Entity status" }),
    metadata: z.record(z.unknown()).optional().openapi({ description: "Additional metadata (JSON)" }),
    orgId: z.string().min(1).openapi({ description: "Organization ID" }),
  })
  .openapi("RegisterEntity");

export const SearchEntitiesSchema = z
  .object({
    orgId: z.string().min(1),
    serviceId: z.enum(["foundry-x", "discovery-x", "ai-foundry"]).optional(),
    entityType: z.string().optional(),
    query: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .openapi("SearchEntities");

export const LinkEntitiesSchema = z
  .object({
    sourceId: z.string().min(1).openapi({ description: "Source entity ID" }),
    targetId: z.string().min(1).openapi({ description: "Target entity ID" }),
    linkType: z
      .enum(["derived_from", "triggers", "produces", "references"])
      .openapi({ description: "Relationship type" }),
    metadata: z.record(z.unknown()).optional(),
  })
  .openapi("LinkEntities");

export const EntityResponseSchema = z
  .object({
    id: z.string(),
    serviceId: z.string(),
    entityType: z.string(),
    externalId: z.string(),
    title: z.string(),
    status: z.string().nullable(),
    metadata: z.any().nullable(),
    orgId: z.string(),
    syncedAt: z.string(),
  })
  .openapi("EntityResponse");

export const EntityLinkResponseSchema = z
  .object({
    id: z.string(),
    sourceId: z.string(),
    targetId: z.string(),
    linkType: z.string(),
    metadata: z.any().nullable(),
    createdAt: z.string(),
  })
  .openapi("EntityLinkResponse");

export const GraphResponseSchema = z
  .object({
    nodes: z.array(EntityResponseSchema),
    edges: z.array(EntityLinkResponseSchema),
  })
  .openapi("GraphResponse");
