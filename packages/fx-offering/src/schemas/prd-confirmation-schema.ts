import { z } from "zod";

export const prdConfirmResponseSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number(),
  status: z.enum(["draft", "reviewing", "confirmed"]),
  content: z.string(),
  generatedAt: z.string(),
});

export const prdEditSchema = z.object({
  content: z.string().min(100),
});

export const prdDiffQuerySchema = z.object({
  v1: z.string().min(1),
  v2: z.string().min(1),
});

export type PrdConfirmResponse = z.infer<typeof prdConfirmResponseSchema>;
export type PrdEditInput = z.infer<typeof prdEditSchema>;
