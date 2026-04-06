import { z } from "zod";

export const AccessLevelEnum = z.enum(["view", "comment", "edit"]);

export const CreateShareLinkSchema = z.object({
  bizItemId: z.string().min(1),
  accessLevel: AccessLevelEnum.default("view"),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const ReviewRequestSchema = z.object({
  recipientIds: z.array(z.string().min(1)).min(1).max(10),
  message: z.string().max(500).optional(),
});
