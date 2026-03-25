import { z } from "@hono/zod-openapi";
import { BmcBlockTypeSchema } from "./bmc.schema.js";

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  blockType: BmcBlockTypeSchema.optional(),
}).openapi("CreateBmcComment");
