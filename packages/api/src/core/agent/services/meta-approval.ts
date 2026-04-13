// ─── F530: MetaApprovalService — Human Approval CRUD (Sprint 283) ───
// TDD Red stub — Green Phase에서 구현 채움

import type { D1Database } from "@cloudflare/workers-types";
import type { ImprovementProposal, ProposalStatus } from "@foundry-x/shared";

export interface ApprovalFilter {
  status?: ProposalStatus;
  sessionId?: string;
  agentId?: string;
}

/** Human Approval Service — agent_improvement_proposals 테이블 CRUD */
export class MetaApprovalService {
  constructor(private readonly db: D1Database) {}

  async list(_filter?: ApprovalFilter): Promise<ImprovementProposal[]> {
    throw new Error("Not implemented");
  }

  async approve(_id: string): Promise<ImprovementProposal> {
    throw new Error("Not implemented");
  }

  async reject(_id: string, _reason: string): Promise<ImprovementProposal> {
    throw new Error("Not implemented");
  }

  async save(_proposal: Omit<ImprovementProposal, "createdAt" | "updatedAt">): Promise<ImprovementProposal> {
    throw new Error("Not implemented");
  }

  async findById(_id: string): Promise<ImprovementProposal | null> {
    throw new Error("Not implemented");
  }
}
