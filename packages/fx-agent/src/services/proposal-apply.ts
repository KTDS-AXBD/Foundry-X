// ─── F533: ProposalApplyService — 승인된 개선 제안을 에이전트 정의에 반영 (Sprint 286) ───

import type { D1Database } from "@cloudflare/workers-types";
import type { ImprovementProposal } from "@foundry-x/shared";

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
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

function toProposal(row: ProposalRow): ImprovementProposal & { appliedAt?: string } {
  return {
    id: row.id,
    sessionId: row.session_id,
    agentId: row.agent_id,
    type: row.type as ImprovementProposal["type"],
    title: row.title,
    reasoning: row.reasoning,
    yamlDiff: row.yaml_diff,
    status: row.status as ImprovementProposal["status"],
    rejectionReason: row.rejection_reason ?? undefined,
    appliedAt: row.applied_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AlreadyAppliedError extends Error {
  constructor(public readonly appliedAt: string) {
    super(`Proposal already applied at ${appliedAt}`);
    this.name = "AlreadyAppliedError";
  }
}

export class NotApprovedError extends Error {
  constructor(public readonly status: string) {
    super(`Proposal must be approved before applying. Current status: ${status}`);
    this.name = "NotApprovedError";
  }
}

export class ProposalNotFoundError extends Error {
  constructor(id: string) {
    super(`Proposal not found: ${id}`);
    this.name = "ProposalNotFoundError";
  }
}

/**
 * ProposalApplyService — 승인된 ImprovementProposal을 에이전트 정의에 반영한다.
 *
 * 반영 전략 (타입별):
 * - prompt: agent_marketplace_items.system_prompt 업데이트 (yamlDiff의 + 라인 추출)
 * - model:  agent_marketplace_items.preferred_model 업데이트
 * - tool:   agent_marketplace_items.allowed_tools에 도구 추가
 * - graph:  기록만 (agent_marketplace_items 변경 없음)
 */
export class ProposalApplyService {
  constructor(private readonly db: D1Database) {}

  async apply(id: string): Promise<ImprovementProposal & { appliedAt: string }> {
    const row = await this.db
      .prepare("SELECT * FROM agent_improvement_proposals WHERE id = ?")
      .bind(id)
      .first<ProposalRow>();

    if (!row) throw new ProposalNotFoundError(id);
    if (row.status !== "approved") throw new NotApprovedError(row.status);
    if (row.applied_at) throw new AlreadyAppliedError(row.applied_at);

    const now = new Date().toISOString();

    await this.applyToAgentDefinition(row);

    await this.db
      .prepare(
        `UPDATE agent_improvement_proposals
         SET applied_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(now, now, id)
      .run();

    return { ...toProposal({ ...row, applied_at: now, updated_at: now }), appliedAt: now };
  }

  private async applyToAgentDefinition(row: ProposalRow): Promise<void> {
    const agentId = row.agent_id;
    const type = row.type as ImprovementProposal["type"];

    switch (type) {
      case "prompt":
        await this.applyPromptChange(agentId, row.yaml_diff);
        break;
      case "model":
        await this.applyModelChange(agentId, row.yaml_diff);
        break;
      case "tool":
        await this.applyToolChange(agentId, row.yaml_diff);
        break;
      case "graph":
        // graph 타입: 구조적 변경은 사람이 직접 반영 — 기록만 남김
        break;
    }
  }

  /** yamlDiff의 + 라인에서 system_prompt 값을 추출하여 업데이트 */
  private async applyPromptChange(agentId: string, yamlDiff: string): Promise<void> {
    const addedLines = yamlDiff
      .split("\n")
      .filter((line) => line.startsWith("+"))
      .map((line) => line.slice(1).trim());

    const promptLine = addedLines.find((line) => line.startsWith("systemPrompt:"));
    if (!promptLine) return;

    const newPrompt = promptLine.replace(/^systemPrompt:\s*"?/, "").replace(/"$/, "");

    await this.db
      .prepare(
        `UPDATE agent_marketplace_items
         SET system_prompt = ?, updated_at = ?
         WHERE role_id = ?`,
      )
      .bind(newPrompt, new Date().toISOString(), agentId)
      .run();
  }

  /** yamlDiff에서 preferredModel 값을 추출하여 업데이트 */
  private async applyModelChange(agentId: string, yamlDiff: string): Promise<void> {
    const addedLines = yamlDiff
      .split("\n")
      .filter((line) => line.startsWith("+"))
      .map((line) => line.slice(1).trim());

    const modelLine = addedLines.find((line) => line.startsWith("preferredModel:"));
    if (!modelLine) return;

    const newModel = modelLine.replace(/^preferredModel:\s*"?/, "").replace(/"$/, "");

    await this.db
      .prepare(
        `UPDATE agent_marketplace_items
         SET preferred_model = ?, updated_at = ?
         WHERE role_id = ?`,
      )
      .bind(newModel, new Date().toISOString(), agentId)
      .run();
  }

  /** yamlDiff에서 추가할 도구명을 추출하여 allowed_tools JSON 배열에 추가 */
  private async applyToolChange(agentId: string, yamlDiff: string): Promise<void> {
    const addedTools = yamlDiff
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1).trim())
      .filter((line) => line.startsWith("- ") || !line.includes(":"))
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter(Boolean);

    if (addedTools.length === 0) return;

    const existing = await this.db
      .prepare("SELECT allowed_tools FROM agent_marketplace_items WHERE role_id = ?")
      .bind(agentId)
      .first<{ allowed_tools: string }>();

    if (!existing) return;

    let currentTools: string[] = [];
    try {
      currentTools = JSON.parse(existing.allowed_tools) as string[];
    } catch {
      // keep empty array (already initialized)
    }

    const merged = [...new Set([...currentTools, ...addedTools])];

    await this.db
      .prepare(
        `UPDATE agent_marketplace_items
         SET allowed_tools = ?, updated_at = ?
         WHERE role_id = ?`,
      )
      .bind(JSON.stringify(merged), new Date().toISOString(), agentId)
      .run();
  }
}
