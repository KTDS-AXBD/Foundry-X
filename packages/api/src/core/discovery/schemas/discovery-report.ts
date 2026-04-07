/**
 * Sprint 156: F346 — 발굴 완료 리포트 Zod 스키마
 */
import { z } from "zod";

export const DiscoveryReportParamsSchema = z.object({
  itemId: z.string().min(1),
});
