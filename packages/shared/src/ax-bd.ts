// AX BD 모듈 공유 타입

export type BmcBlockType =
  | "customer_segments"
  | "value_propositions"
  | "channels"
  | "customer_relationships"
  | "revenue_streams"
  | "key_resources"
  | "key_activities"
  | "key_partnerships"
  | "cost_structure";

export interface BmcBlock {
  blockType: BmcBlockType;
  content: string | null;
  updatedAt: number;
}

export interface Bmc {
  id: string;
  ideaId: string | null;
  title: string;
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  blocks: BmcBlock[];
  createdAt: number;
  updatedAt: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  createdAt: number;
  updatedAt: number;
}

// Sprint 64: F203 아이디어-BMC 연결
export interface IdeaBmcLink {
  id: string;
  ideaId: string;
  bmcId: string;
  createdAt: number;
}

// Sprint 64: F204 BMC 댓글
export interface BmcComment {
  id: string;
  bmcId: string;
  blockType?: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: number;
}

export interface CommentCounts {
  [blockType: string]: number;
  _total: number;
}
