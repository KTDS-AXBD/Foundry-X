/**
 * Sprint 154: F342 발굴 완료 리포트 스키마
 */
import { z } from "zod";

export const UpsertDiscoveryReportSchema = z.object({
  reportJson: z.record(z.unknown()).default({}),
  overallVerdict: z.enum(["Go", "Conditional", "NoGo"]).nullable().default(null),
  teamDecision: z.enum(["Go", "Hold", "Drop"]).nullable().default(null),
});

export type UpsertDiscoveryReportInput = z.infer<typeof UpsertDiscoveryReportSchema>;
