// F629: 5-Asset Model (BeSir §A3 — 4-Asset → 5-Asset 확장)
// Policy / Ontology / Skill / Log / System Knowledge

export const ASSET_TYPES = [
  "policy",
  "ontology",
  "skill",
  "log",
  "system_knowledge",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const SYSTEM_KNOWLEDGE_CONTENT_TYPES = [
  "sop",
  "transcript",
  "knowledge_graph_input",
  "domain_rule",
  "tacit_knowledge",
] as const;

export type SystemKnowledgeContentType = (typeof SYSTEM_KNOWLEDGE_CONTENT_TYPES)[number];

export interface SystemKnowledgeAsset {
  id: string;
  orgId: string;
  assetType: "system_knowledge";
  title: string;
  contentRef: string;
  contentType: SystemKnowledgeContentType;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

// Discriminated union — 나머지 4개 자산은 후속 sprint에서 union 확장
export type Asset = SystemKnowledgeAsset;

export { SystemKnowledgeService } from "./services/system-knowledge.service.js";
export { DomainInitService } from "./services/domain-init.service.js";
export type { DomainInitInput, DomainInitResult, DomainScaffold } from "./services/domain-init.service.js";
export * from "./schemas/asset.js";
