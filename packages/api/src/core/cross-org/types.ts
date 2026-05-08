// F603: Cross-Org 4그룹 분류 + default-deny 타입

export const CROSS_ORG_GROUPS = [
  "common_standard",
  "org_specific",
  "tacit_knowledge",
  "core_differentiator",
] as const;
export type CrossOrgGroup = (typeof CROSS_ORG_GROUPS)[number];

export const ASSET_KINDS = ["policy", "ontology", "skill", "system_knowledge"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const EXPORT_BLOCK_REASONS = [
  "export_blocked",
  "license_blocked",
  "marketplace_blocked",
  "learning_opt_in_required",
] as const;
export type ExportBlockReason = (typeof EXPORT_BLOCK_REASONS)[number];

export interface GroupAssignment {
  id: string;
  assetId: string;
  assetKind: AssetKind;
  orgId: string;
  groupType: CrossOrgGroup;
  commonality: number | null;
  variance: number | null;
  documentationRate: number | null;
  businessImpact: "low" | "medium" | "high" | null;
  assignedBy: "auto" | "sme" | "manual";
  assignedAt: number;
}

export interface ExportCheckResult {
  allowed: boolean;
  groupType: CrossOrgGroup | null;
  reason: ExportBlockReason | null;
  blockId: string | null;
}

export interface GroupStats {
  orgId: string;
  counts: Record<CrossOrgGroup, number>;
  total: number;
}

export { CrossOrgEnforcer } from "./services/cross-org-enforcer.service.js";
// NOTE: schemas/cross-org.js 의 z.enum(CROSS_ORG_GROUPS/ASSET_KINDS/EXPORT_BLOCK_REASONS) 가
// 이 파일을 import 하므로 여기서 re-export 하면 순환 import → const=undefined 위험
// (S336 entity 선례). schemas 심볼은 호출자가 "./schemas/cross-org.js" 에서 직접 import.
