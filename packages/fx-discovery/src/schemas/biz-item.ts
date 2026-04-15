/**
 * F539c: biz-item 생성 스키마 (packages/api 이전)
 */
import { z } from "zod";

export const CreateBizItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  source: z.string().optional(),
});

export type CreateBizItemInput = z.infer<typeof CreateBizItemSchema>;
