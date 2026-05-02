// ─── F530: MetaAgent — 진단 → 개선 제안 생성 (Sprint 283) ───
// ─── F542: systemPrompt 강화 + Sonnet 4.6 기본값 + META_AGENT_MODEL 지원 (Sprint 290) ───

import { randomUUID } from "node:crypto";
import type { DiagnosticReport, ImprovementProposal, ProposalType } from "@foundry-x/shared";
import { MODEL_SONNET } from "@foundry-x/shared";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// F542: 기본값을 Sonnet 4.6으로 변경 (Haiku 역량 한계 해소)
const DEFAULT_MODEL = MODEL_SONNET;
const THRESHOLD_SCORE = 70;

// F542 M1: 강화된 systemPrompt — few-shot 2건 + rawValue=0 처리 지침
const SYSTEM_PROMPT = `You are a MetaAgent for the Foundry-X HyperFX Agent Stack.
Your role is to analyze agent performance diagnostics (6-axis scores) and generate
actionable improvement proposals as a JSON array.

## Axes (0-100 each)
- ToolEffectiveness: ratio of successful end_turn completions
- Memory: input tokens per round efficiency
- Planning: round count vs ideal complexity ratio
- Verification: self-reflection quality score
- Cost: total tokens per round efficiency
- Convergence: end_turn completion rate

## CRITICAL: rawValue=0 Handling
When rawValue=0 for an axis, it means the data collection pipeline may not be recording
metrics for that execution path. In this case, you MUST still generate a proposal:
- Generate a "data pipeline" proposal that suggests adding metric recording
- Type should be "graph" or "prompt" depending on the axis
- The yamlDiff should reference the diagnostic collection hook

## Output Rules
- Generate proposals ONLY for axes with score < ${THRESHOLD_SCORE}
- If all scores >= ${THRESHOLD_SCORE}, output an empty array: []
- Output ONLY a valid JSON array — no markdown, no text outside the JSON

## Each proposal MUST have:
{
  "type": "prompt" | "tool" | "model" | "graph",
  "title": "Brief, actionable title (under 80 chars)",
  "reasoning": "Explain WHY this score is low and HOW this proposal addresses it (2-3 sentences including the word 'because' or 'therefore')",
  "yamlDiff": "YAML diff showing the proposed change (must start with - and + lines)"
}

## Few-shot Examples

### Example 1: rawValue=0 case (data pipeline issue)
Input: ToolEffectiveness score=50, rawValue=0, unit=ratio
Output:
[{
  "type": "graph",
  "title": "Add DiagnosticCollector hook to agent execution path",
  "reasoning": "ToolEffectiveness rawValue=0 because the agent execution path is not recording metrics to agent_run_metrics table. Therefore, adding a DiagnosticCollector.record() call after each agent execution will capture real performance data.",
  "yamlDiff": "# In StageRunnerService or OrchestrationLoop:\\n- // no metric recording\\n+ await diagnosticCollector.record(sessionId, agentId, result, durationMs);"
}]

### Example 2: low score with real data
Input: Memory score=35, rawValue=900, unit=tokens/round
Output:
[{
  "type": "prompt",
  "title": "Add context compression instructions to reduce memory usage",
  "reasoning": "Memory score is 35 because the agent is using 900 tokens/round which exceeds the efficient baseline of 500. Therefore, adding explicit context compression instructions to the systemPrompt will guide the agent to be more concise.",
  "yamlDiff": "- systemPrompt: \\"You are an agent...\\"\\n+ systemPrompt: \\"You are an agent...\\\\nContext Rule: Summarize previous steps in 1-2 sentences before proceeding. Avoid repeating context.\\""
}]`;

interface RawProposal {
  type: ProposalType;
  title: string;
  reasoning: string;
  yamlDiff: string;
}

export interface MetaAgentConfig {
  apiKey: string;
  model?: string;
  promptVersion?: string;
}

/** MetaAgent — DiagnosticReport를 받아 ImprovementProposal[]을 생성한다. */
export class MetaAgent {
  private readonly model: string;
  readonly promptVersion: string;

  constructor(private readonly config: MetaAgentConfig) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.promptVersion = config.promptVersion ?? "2.0";
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

  /** 원시 제안 배열 반환 (A/B 비교 저장용) */
  async diagnoseRaw(report: DiagnosticReport): Promise<RawProposal[]> {
    const lowAxes = report.scores.filter((s) => s.score < THRESHOLD_SCORE);
    if (lowAxes.length === 0) return [];
    return this.callMetaLLM(report, lowAxes.map((a) => a.axis));
  }

  private async callMetaLLM(report: DiagnosticReport, lowAxes: string[]): Promise<RawProposal[]> {
    const userMessage = `Diagnostic Report:
Session: ${report.sessionId}
Agent: ${report.agentId}
Overall Score: ${report.overallScore}/100
Low-scoring axes (need improvement): ${lowAxes.join(", ")}

Scores:
${report.scores.map((s) => `  ${s.axis}: ${s.score}/100 (rawValue=${s.rawValue} ${s.unit})`).join("\n")}

Generate improvement proposals for all low-scoring axes (score < ${THRESHOLD_SCORE}).
Pay special attention to axes with rawValue=0 — these indicate data collection issues.`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
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
      // JSON 배열 추출 (마크다운 코드블록 내부도 처리)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[0] : text.trim();
      const parsed = JSON.parse(jsonText) as unknown;
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
