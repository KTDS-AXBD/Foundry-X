// ─── F358: RuleGeneratorService — LLM 기반 Rule 초안 생성 (Sprint 161) ───

import type {
  FailurePattern,
  GuardRailProposal,
  GenerateRulesResult,
} from "@foundry-x/shared";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

export class RuleGeneratorService {
  private model = "claude-haiku-4-5-20251001";

  constructor(
    private db: D1Database,
    private anthropicApiKey: string,
  ) {}

  /** failure_patterns에서 미제안 패턴 → LLM Rule 초안 생성 */
  async generate(
    tenantId: string,
    patternIds?: string[],
  ): Promise<GenerateRulesResult> {
    // 1. 대상 패턴 조회
    const patterns = await this.getTargetPatterns(tenantId, patternIds);
    if (patterns.length === 0) {
      return { proposalsCreated: 0, proposals: [] };
    }

    const proposals: GuardRailProposal[] = [];

    // 2. 각 패턴마다 LLM Rule 초안 생성
    for (const pattern of patterns) {
      const ruleContent = await this.callLlm(pattern);
      if (!ruleContent) continue;

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const filename = await this.nextFilename(tenantId);

      const rationale = this.buildRationale(pattern);

      // guard_rail_proposals에 저장
      await this.db
        .prepare(
          `INSERT INTO guard_rail_proposals (id, tenant_id, pattern_id, rule_content, rule_filename, rationale, llm_model, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        )
        .bind(id, tenantId, pattern.id, ruleContent, filename, rationale, this.model, now)
        .run();

      // failure_patterns.status → 'proposed'
      await this.db
        .prepare("UPDATE failure_patterns SET status = 'proposed', updated_at = ? WHERE id = ?")
        .bind(now, pattern.id)
        .run();

      proposals.push({
        id,
        tenantId,
        patternId: pattern.id,
        ruleContent,
        ruleFilename: filename,
        rationale,
        llmModel: this.model,
        status: "pending",
        reviewedAt: null,
        reviewedBy: null,
        createdAt: now,
      });
    }

    return { proposalsCreated: proposals.length, proposals };
  }

  private async getTargetPatterns(
    tenantId: string,
    patternIds?: string[],
  ): Promise<FailurePattern[]> {
    if (patternIds && patternIds.length > 0) {
      const placeholders = patternIds.map(() => "?").join(",");
      const { results } = await this.db
        .prepare(
          `SELECT * FROM failure_patterns WHERE tenant_id = ? AND id IN (${placeholders})`,
        )
        .bind(tenantId, ...patternIds)
        .all();
      return (results ?? []).map((r) => this.toPattern(r));
    }

    const { results } = await this.db
      .prepare(
        "SELECT * FROM failure_patterns WHERE tenant_id = ? AND status = 'detected'",
      )
      .bind(tenantId)
      .all();
    return (results ?? []).map((r) => this.toPattern(r));
  }

  private async callLlm(pattern: FailurePattern): Promise<string | null> {
    const systemPrompt = `You are a Claude Code rules author. Generate a .claude/rules/ file that prevents the recurring failure pattern described below.

Output format:
- Start with a markdown heading (# Rule Title)
- Include clear, actionable guidelines
- Reference the failure pattern as context
- Keep it concise (under 30 lines)
- Write in the same language style as existing .claude/rules/ files`;

    const userPrompt = `Recurring failure pattern detected:
- Pattern: ${pattern.patternKey} (${pattern.occurrenceCount} occurrences)
- Period: ${pattern.firstSeen} ~ ${pattern.lastSeen}
- Sample payloads: ${JSON.stringify(pattern.samplePayloads.slice(0, 3), null, 2)}

Generate a guard rail rule to prevent this pattern from recurring.`;

    const messages: AnthropicMessage[] = [{ role: "user", content: userPrompt }];

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      });

      if (!resp.ok) return null;

      const data = (await resp.json()) as AnthropicResponse;
      const text = data.content?.[0]?.text;
      return text || null;
    } catch {
      return null;
    }
  }

  private buildRationale(pattern: FailurePattern): string {
    const [source, severity] = pattern.patternKey.split(":");
    return `Pattern "${source}:${severity}" detected ${pattern.occurrenceCount} times between ${pattern.firstSeen} and ${pattern.lastSeen}. Sample events: ${pattern.sampleEventIds.length} analyzed.`;
  }

  private async nextFilename(tenantId: string): Promise<string> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM guard_rail_proposals WHERE tenant_id = ?",
      )
      .bind(tenantId)
      .first<{ cnt: number }>();

    const num = (row?.cnt ?? 0) + 1;
    return `auto-guard-${String(num).padStart(3, "0")}.md`;
  }

  private toPattern(row: Record<string, unknown>): FailurePattern {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      patternKey: row.pattern_key as string,
      occurrenceCount: row.occurrence_count as number,
      firstSeen: row.first_seen as string,
      lastSeen: row.last_seen as string,
      sampleEventIds: JSON.parse((row.sample_event_ids as string) || "[]"),
      samplePayloads: JSON.parse((row.sample_payloads as string) || "[]"),
      status: row.status as FailurePattern["status"],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
