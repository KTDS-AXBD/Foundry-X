import { z } from "zod";

export const OFFERING_PACK_STATUSES = ["draft", "review", "approved", "shared"] as const;
export type OfferingPackStatus = (typeof OFFERING_PACK_STATUSES)[number];

export const PACK_ITEM_TYPES = [
  "proposal", "demo_link", "tech_review", "pricing", "prototype", "bmc", "custom"
] as const;
export type PackItemType = (typeof PACK_ITEM_TYPES)[number];

export const CreateOfferingPackSchema = z.object({
  bizItemId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const CreatePackItemSchema = z.object({
  itemType: z.enum(PACK_ITEM_TYPES),
  title: z.string().min(1).max(200),
  content: z.string().max(10000).optional(),
  url: z.string().url().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdatePackStatusSchema = z.object({
  status: z.enum(OFFERING_PACK_STATUSES),
});

export const CreatePackShareSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const OfferingPackFilterSchema = z.object({
  status: z.enum(OFFERING_PACK_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
