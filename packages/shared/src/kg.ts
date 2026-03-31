/**
 * Knowledge Graph (KG) Ontology types for GIVC PoC.
 * Sprint 92 — F255
 */

export type KgNodeType =
  | "PRODUCT"
  | "INDUSTRY"
  | "COUNTRY"
  | "COMPANY"
  | "TECHNOLOGY"
  | "RESEARCH"
  | "EVENT"
  | "ALERT";

export type KgRelationType =
  | "SUPPLIES"
  | "BELONGS_TO"
  | "PRODUCED_IN"
  | "PRODUCED_BY"
  | "USES_TECH"
  | "RESEARCHED_BY"
  | "AFFECTED_BY"
  | "WARNED_BY"
  | "SUBSTITUTES"
  | "COMPETES_WITH";

export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

export interface KgNodeSummary {
  id: string;
  type: KgNodeType;
  name: string;
  nameEn?: string;
}

export interface KgEdgeSummary {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KgRelationType;
  weight: number;
  label?: string;
}

export const KG_NODE_TYPE_LABELS: Record<KgNodeType, string> = {
  PRODUCT: "품목",
  INDUSTRY: "산업",
  COUNTRY: "국가",
  COMPANY: "기업",
  TECHNOLOGY: "기술",
  RESEARCH: "R&D 과제",
  EVENT: "이벤트",
  ALERT: "경보",
};

export const KG_RELATION_TYPE_LABELS: Record<KgRelationType, string> = {
  SUPPLIES: "공급",
  BELONGS_TO: "소속",
  PRODUCED_IN: "생산국",
  PRODUCED_BY: "생산기업",
  USES_TECH: "사용기술",
  RESEARCHED_BY: "연구",
  AFFECTED_BY: "영향",
  WARNED_BY: "경보",
  SUBSTITUTES: "대체",
  COMPETES_WITH: "경쟁",
};

export const KG_NODE_TYPES: readonly KgNodeType[] = [
  "PRODUCT", "INDUSTRY", "COUNTRY", "COMPANY",
  "TECHNOLOGY", "RESEARCH", "EVENT", "ALERT",
] as const;

export const KG_RELATION_TYPES: readonly KgRelationType[] = [
  "SUPPLIES", "BELONGS_TO", "PRODUCED_IN", "PRODUCED_BY",
  "USES_TECH", "RESEARCHED_BY", "AFFECTED_BY", "WARNED_BY",
  "SUBSTITUTES", "COMPETES_WITH",
] as const;
