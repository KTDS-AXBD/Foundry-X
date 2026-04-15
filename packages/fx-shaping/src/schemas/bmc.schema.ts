import { z } from "@hono/zod-openapi";

export const BmcBlockTypeSchema = z.enum([
  "customer_segments",
  "value_propositions",
  "channels",
  "customer_relationships",
  "revenue_streams",
  "key_resources",
  "key_activities",
  "key_partnerships",
  "cost_structure",
]).openapi("BmcBlockType");

export const CreateBmcSchema = z.object({
  title: z.string().min(1).max(100),
  ideaId: z.string().optional(),
}).openapi("CreateBmc");

export const UpdateBmcBlocksSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  blocks: z.array(
    z.object({
      blockType: BmcBlockTypeSchema,
      content: z.string().max(2000),
    })
  ).optional(),
}).openapi("UpdateBmcBlocks");

export const BmcSchema = z.object({
  id: z.string(),
  ideaId: z.string().nullable(),
  title: z.string(),
  gitRef: z.string(),
  authorId: z.string(),
  orgId: z.string(),
  syncStatus: z.enum(["synced", "pending", "failed"]),
  blocks: z.array(
    z.object({
      blockType: BmcBlockTypeSchema,
      content: z.string().nullable(),
      updatedAt: z.number(),
    })
  ),
  createdAt: z.number(),
  updatedAt: z.number(),
}).openapi("Bmc");
