import { z } from "@hono/zod-openapi";

export const LinkBmcSchema = z.object({
  bmcId: z.string().min(1),
}).openapi("LinkBmc");

export const CreateBmcFromIdeaSchema = z.object({
  title: z.string().max(200).optional(),
}).openapi("CreateBmcFromIdea");
