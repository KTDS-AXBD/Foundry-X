/**
 * F371: Offering Sections Zod Schemas (Sprint 167)
 */
import { z } from "zod";

// ── Request Schemas ─────────────────────────────

export const UpdateSectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});
export type UpdateSectionInput = z.infer<typeof UpdateSectionSchema>;

export const InitSectionsSchema = z.object({
  includeOptional: z.boolean().default(true),
});
export type InitSectionsInput = z.infer<typeof InitSectionsSchema>;

export const ReorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().min(1)).min(1),
});
export type ReorderSectionsInput = z.infer<typeof ReorderSectionsSchema>;

// ── Response Types ──────────────────────────────

export interface OfferingSection {
  id: string;
  offeringId: string;
  sectionKey: string;
  title: string;
  content: string | null;
  sortOrder: number;
  isRequired: boolean;
  isIncluded: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Standard Sections Constant ──────────────────

export const STANDARD_SECTIONS: {
  key: string;
  title: string;
  sortOrder: number;
  isRequired: boolean;
}[] = [
  { key: "hero", title: "Hero", sortOrder: 0, isRequired: true },
  { key: "exec_summary", title: "Executive Summary", sortOrder: 1, isRequired: true },
  { key: "s01", title: "추진 배경 및 목적", sortOrder: 2, isRequired: true },
  { key: "s02", title: "사업기회 점검", sortOrder: 3, isRequired: true },
  { key: "s02_1", title: "왜 이 문제/영역인가", sortOrder: 4, isRequired: true },
  { key: "s02_2", title: "왜 이 기술/접근법인가", sortOrder: 5, isRequired: true },
  { key: "s02_3", title: "왜 이 고객/도메인인가", sortOrder: 6, isRequired: true },
  { key: "s02_4", title: "기존 사업/관계 현황", sortOrder: 7, isRequired: false },
  { key: "s02_5", title: "현황 Gap 분석", sortOrder: 8, isRequired: false },
  { key: "s02_6", title: "글로벌·국내 동향", sortOrder: 9, isRequired: true },
  { key: "s03", title: "제안 방향", sortOrder: 10, isRequired: true },
  { key: "s03_1", title: "솔루션 개요", sortOrder: 11, isRequired: true },
  { key: "s03_2", title: "시나리오 / Use Case", sortOrder: 12, isRequired: true },
  { key: "s03_3", title: "사업화 로드맵", sortOrder: 13, isRequired: true },
  { key: "s04", title: "추진 계획", sortOrder: 14, isRequired: true },
  { key: "s04_1", title: "데이터 확보 방식", sortOrder: 15, isRequired: true },
  { key: "s04_2", title: "시장 분석 및 경쟁 환경", sortOrder: 16, isRequired: true },
  { key: "s04_3", title: "사업화 방향 및 매출 계획", sortOrder: 17, isRequired: true },
  { key: "s04_4", title: "추진 체계 및 투자 계획", sortOrder: 18, isRequired: true },
  { key: "s04_5", title: "사업성 교차검증", sortOrder: 19, isRequired: true },
  { key: "s04_6", title: "기대효과", sortOrder: 20, isRequired: true },
  { key: "s05", title: "KT 연계 GTM 전략(안)", sortOrder: 21, isRequired: true },
];
