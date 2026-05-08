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
// NOTE: schemas/asset.js 의 z.enum(ASSET_TYPES/SYSTEM_KNOWLEDGE_CONTENT_TYPES) 가 이 파일을
// import 하므로 여기서 re-export 하면 순환 import → const=undefined 위험 (S336 entity 선례).
// schemas 심볼은 호출자가 "./schemas/asset.js" 에서 직접 import.
