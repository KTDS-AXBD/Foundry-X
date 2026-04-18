/**
 * F446: 사업기획서 PDF/PPTX 내보내기 스키마 (Sprint 216)
 */
import { z } from "zod";

export const BpExportQuerySchema = z.object({
  format: z.enum(["html", "pptx"]).default("html"),
});
export type BpExportQuery = z.infer<typeof BpExportQuerySchema>;
