import { z } from "@hono/zod-openapi";

export const RequirementSchema = z
  .object({
    id: z.string(),
    reqCode: z.string(),
    title: z.string(),
    version: z.string(),
    status: z.enum(["planned", "in_progress", "done"]),
    note: z.string(),
  })
  .openapi("RequirementItem");

export const ReqUpdateSchema = z
  .object({
    status: z.enum(["planned", "in_progress", "done"], {
      errorMap: () => ({
        message: "status must be one of: planned, in_progress, done",
      }),
    }),
  })
  .openapi("ReqUpdate");

export const ReqIdParamSchema = z.object({
  id: z.string(),
});
