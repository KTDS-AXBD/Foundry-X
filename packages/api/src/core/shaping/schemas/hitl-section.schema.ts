import { z } from "zod";

export const sectionReviewSchema = z.object({
  action: z.enum(["approved", "revision_requested", "rejected"]),
  sectionId: z.string().min(1).max(200),
  comment: z.string().max(5000).optional(),
});

export type SectionReviewInput = z.infer<typeof sectionReviewSchema>;

export const sectionReviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
