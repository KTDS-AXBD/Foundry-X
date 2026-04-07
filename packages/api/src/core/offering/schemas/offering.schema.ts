/**
 * F370: Offerings CRUD Zod Schemas (Sprint 167)
 */
import { z } from "zod";

// ── Purpose & Format enums ──────────────────────

export const OfferingPurpose = z.enum(["report", "proposal", "review"]);
export type OfferingPurpose = z.infer<typeof OfferingPurpose>;

export const OfferingFormat = z.enum(["html", "pptx"]);
export type OfferingFormat = z.infer<typeof OfferingFormat>;

export const OfferingStatus = z.enum(["draft", "generating", "review", "approved", "shared"]);
export type OfferingStatus = z.infer<typeof OfferingStatus>;

// ── Request Schemas ─────────────────────────────

export const CreateOfferingSchema = z.object({
  bizItemId: z.string().min(1),
  title: z.string().min(1).max(200),
  purpose: OfferingPurpose,
  format: OfferingFormat,
});
export type CreateOfferingInput = z.infer<typeof CreateOfferingSchema>;

export const UpdateOfferingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  purpose: OfferingPurpose.optional(),
  status: OfferingStatus.optional(),
});
export type UpdateOfferingInput = z.infer<typeof UpdateOfferingSchema>;

export const OfferingFilterSchema = z.object({
  status: OfferingStatus.optional(),
  bizItemId: z.string().optional(),
  purpose: OfferingPurpose.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type OfferingFilter = z.infer<typeof OfferingFilterSchema>;

export const CreateVersionSchema = z.object({
  changeSummary: z.string().max(500).optional(),
});
export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;

// ── Response Types ──────────────────────────────

export interface Offering {
  id: string;
  orgId: string;
  bizItemId: string;
  title: string;
  purpose: OfferingPurpose;
  format: OfferingFormat;
  status: OfferingStatus;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferingVersion {
  id: string;
  offeringId: string;
  version: number;
  snapshot: string | null;
  changeSummary: string | null;
  createdBy: string;
  createdAt: string;
}
