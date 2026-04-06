import { z } from "zod";

export const COMPANY_SIZES = ["startup", "smb", "mid", "enterprise"] as const;

export const CreateGtmCustomerSchema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactRole: z.string().max(100).optional(),
  companySize: z.enum(COMPANY_SIZES).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.string().max(500).optional(),
});

export const UpdateGtmCustomerSchema = CreateGtmCustomerSchema.partial();

export const GtmCustomerFilterSchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.enum(COMPANY_SIZES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
