// ─── F530: MetaApprovalService — Human Approval CRUD (Sprint 283) ───

import type { D1Database } from "@cloudflare/workers-types";
import type { ImprovementProposal, ProposalStatus } from "@foundry-x/shared";

export interface ApprovalFilter {
  status?: ProposalStatus;
  sessionId?: string;
  agentId?: string;
}

interface ProposalRow {
  id: string;
  session_id: string;
  agent_id: string;
  type: string;
  title: string;
  reasoning: string;
  yaml_diff: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

function toProposal(row: ProposalRow): ImprovementProposal {
  return {
    id: row.id,
    sessionId: row.session_id,
    agentId: row.agent_id,
    type: row.type as ImprovementProposal["type"],
    title: row.title,
    reasoning: row.reasoning,
    yamlDiff: row.yaml_diff,
    status: row.status as ProposalStatus,
    rejectionReason: row.rejection_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Human Approval Service — agent_improvement_proposals 테이블 CRUD */
export class MetaApprovalService {
  constructor(private readonly db: D1Database) {}

  async list(filter?: ApprovalFilter): Promise<ImprovementProposal[]> {
    let sql = "SELECT * FROM agent_improvement_proposals WHERE 1=1";
    const bindings: unknown[] = [];

    if (filter?.status) {
      sql += " AND status = ?";
      bindings.push(filter.status);
    }
    if (filter?.sessionId) {
      sql += " AND session_id = ?";
      bindings.push(filter.sessionId);
    }
    if (filter?.agentId) {
      sql += " AND agent_id = ?";
      bindings.push(filter.agentId);
    }

    sql += " ORDER BY created_at DESC";

    const stmt = this.db.prepare(sql);
    const result = await (bindings.length > 0 ? stmt.bind(...bindings) : stmt).all<ProposalRow>();
    return (result.results ?? []).map(toProposal);
  }

  async approve(id: string): Promise<ImprovementProposal> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError(id);

    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE agent_improvement_proposals
         SET status = 'approved', updated_at = ?
         WHERE id = ?`,
      )
      .bind(now, id)
      .run();

    return { ...existing, status: "approved", updatedAt: now };
  }

  async reject(id: string, reason: string): Promise<ImprovementProposal> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError(id);

    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE agent_improvement_proposals
         SET status = 'rejected', rejection_reason = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(reason, now, id)
      .run();

    return { ...existing, status: "rejected", rejectionReason: reason, updatedAt: now };
  }

  async save(
    proposal: Omit<ImprovementProposal, "createdAt" | "updatedAt">,
  ): Promise<ImprovementProposal> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO agent_improvement_proposals
         (id, session_id, agent_id, type, title, reasoning, yaml_diff, status, rejection_reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        proposal.id,
        proposal.sessionId,
        proposal.agentId,
        proposal.type,
        proposal.title,
        proposal.reasoning,
        proposal.yamlDiff,
        proposal.status,
        proposal.rejectionReason ?? null,
        now,
        now,
      )
      .run();

    return { ...proposal, createdAt: now, updatedAt: now };
  }

  async findById(id: string): Promise<ImprovementProposal | null> {
    const row = await this.db
      .prepare("SELECT * FROM agent_improvement_proposals WHERE id = ?")
      .bind(id)
      .first<ProposalRow>();

    return row ? toProposal(row) : null;
  }
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`Proposal not found: ${id}`);
    this.name = "NotFoundError";
  }
}
