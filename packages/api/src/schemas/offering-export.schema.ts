/**
 * F372: Offering Export Zod Schemas (Sprint 168)
 */
import { z } from "zod";

export const ExportFormatSchema = z.enum(["html"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportQuerySchema = z.object({
  format: ExportFormatSchema.default("html"),
});
export type ExportQuery = z.infer<typeof ExportQuerySchema>;
