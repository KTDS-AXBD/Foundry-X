import { z } from "@hono/zod-openapi";

export const BmcVersionSchema = z.object({
  id: z.string(),
  bmcId: z.string(),
  commitSha: z.string(),
  authorId: z.string(),
  message: z.string(),
  createdAt: z.string(),
}).openapi("BmcVersion");

export const BmcSnapshotSchema = z.object({
  version: BmcVersionSchema,
  blocks: z.record(z.string(), z.string().nullable()),
}).openapi("BmcSnapshot");

export type BmcVersion = z.infer<typeof BmcVersionSchema>;
export type BmcSnapshot = z.infer<typeof BmcSnapshotSchema>;
