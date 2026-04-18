/**
 * F383: Offering Metrics Zod Schemas (Sprint 174)
 */
import { z } from "zod";

export const OfferingEventType = z.enum([
  "created",
  "edited",
  "exported",
  "validated",
  "prototype_generated",
]);
export type OfferingEventType = z.infer<typeof OfferingEventType>;

export const OfferingMetricsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  bizItemId: z.string().optional(),
});
export type OfferingMetricsQuery = z.infer<typeof OfferingMetricsQuerySchema>;

export const RecordOfferingEventSchema = z.object({
  offeringId: z.string().min(1),
  bizItemId: z.string().optional(),
  eventType: OfferingEventType,
  durationMs: z.coerce.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
});
export type RecordOfferingEventInput = z.infer<typeof RecordOfferingEventSchema>;

export const OfferingEventHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type OfferingEventHistoryQuery = z.infer<typeof OfferingEventHistoryQuerySchema>;

export interface OfferingMetricsSummary {
  totalCreated: number;
  totalExported: number;
  totalValidated: number;
  totalPrototypes: number;
  avgCreationTimeMs: number;
  avgExportTimeMs: number;
  validationPassRate: number;
  period: { days: number };
}
