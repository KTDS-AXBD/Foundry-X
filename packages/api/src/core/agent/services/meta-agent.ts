// ─── F530: MetaAgent — 진단 → 개선 제안 생성 (Sprint 283) ───

import { randomUUID } from "node:crypto";
import type { DiagnosticReport, ImprovementProposal, ProposalType } from "@foundry-x/shared";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const THRESHOLD_SCORE = 70;

interface RawProposal {
  type: ProposalType;
  title: string;
  reasoning: string;
  yamlDiff: string;
}

export interface MetaAgentConfig {
  apiKey: string;
  model?: string;
}

/** MetaAgent — DiagnosticReport를 받아 ImprovementProposal[]을 생성한다. */
export class MetaAgent {
  private readonly model: string;

  constructor(private readonly config: MetaAgentConfig) {
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async diagnose(report: DiagnosticReport): Promise<ImprovementProposal[]> {
    const lowAxes = report.scores.filter((s) => s.score < THRESHOLD_SCORE);
    if (lowAxes.length === 0) {
      return [];
    }

    const rawProposals = await this.callMetaLLM(report, lowAxes.map((a) => a.axis));
    const now = new Date().toISOString();

    return rawProposals.map((raw): ImprovementProposal => ({
      id: randomUUID(),
      sessionId: report.sessionId,
      agentId: report.agentId,
      type: raw.type,
      title: raw.title,
      reasoning: raw.reasoning,
      yamlDiff: raw.yamlDiff,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }));
  }

  private async callMetaLLM(report: DiagnosticReport, lowAxes: string[]): Promise<RawProposal[]> {
    const systemPrompt = `You are a Meta-Agent that analyzes agent performance diagnostics and generates improvement proposals.
You will receive a diagnostic report with 6-axis scores (0-100 each).
Generate improvement proposals ONLY for axes with score < ${THRESHOLD_SCORE}.

For each proposal, output JSON with this structure:
{
  "type": "prompt" | "tool" | "model" | "graph",
  "title": "Brief title of the improvement",
  "reasoning": "Why this improvement addresses the low score",
  "yamlDiff": "YAML diff showing the proposed change"
}

Output ONLY a JSON array of proposals. No markdown, no explanation outside the JSON.`;

    const userMessage = `Diagnostic Report:
Session: ${report.sessionId}
Agent: ${report.agentId}
Overall Score: ${report.overallScore}/100
Low-scoring axes (need improvement): ${lowAxes.join(", ")}

Scores:
${report.scores.map((s) => `  ${s.axis}: ${s.score}/100 (${s.rawValue} ${s.unit})`).join("\n")}

Generate improvement proposals for the low-scoring axes.`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      throw new Error(`MetaAgent API error: ${response.status}`);
    }

    const data = await response.json() as {
      content: { type: string; text?: string }[];
    };

    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    return this.parseProposals(text);
  }

  private parseProposals(text: string): RawProposal[] {
    try {
      const parsed = JSON.parse(text.trim()) as unknown;
      if (!Array.isArray(parsed)) return [];

      const validTypes: ProposalType[] = ["prompt", "tool", "model", "graph"];
      return parsed
        .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
        .filter((p) => validTypes.includes(p["type"] as ProposalType))
        .map((p) => ({
          type: p["type"] as ProposalType,
          title: String(p["title"] ?? ""),
          reasoning: String(p["reasoning"] ?? ""),
          yamlDiff: String(p["yamlDiff"] ?? ""),
        }))
        .filter((p) => p.title && p.reasoning && p.yamlDiff);
    } catch {
      return [];
    }
  }
}
