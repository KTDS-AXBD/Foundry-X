/**
 * Sprint 56 F188: Six Hats 토론 시뮬레이션 — 20턴 순차 실행 + D1 저장
 */
import { createAgentRunner, type AgentRunner } from "../agent/services/agent-runner.js";
import {
  TURN_SEQUENCE, HAT_CONFIGS, CONTEXT_WINDOW_TURNS,
  summarizePrd, buildTurnPrompt,
  type HatColor,
} from "./sixhats-prompts.js";

export class SixHatsDebateError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SixHatsDebateError";
  }
}

export interface DebateResult {
  id: string;
  prdId: string;
  bizItemId: string;
  status: "completed" | "failed";
  totalTurns: number;
  completedTurns: number;
  turns: TurnResult[];
  keyIssues: string[];
  summary: string;
  model: string;
  totalTokens: number;
  durationSeconds: number;
}

export interface TurnResult {
  turnNumber: number;
  hat: HatColor;
  hatLabel: string;
  content: string;
  tokens: number;
  durationSeconds: number;
}

export class SixHatsDebateService {
  private runner: AgentRunner;

  constructor(private db: D1Database, env: {
    OPENROUTER_API_KEY?: string;
    OPENROUTER_DEFAULT_MODEL?: string;
    ANTHROPIC_API_KEY?: string;
  }) {
    this.runner = createAgentRunner(env);
  }

  async startDebate(
    prdId: string,
    bizItemId: string,
    prdContent: string,
    orgId: string,
  ): Promise<DebateResult> {
    const debateId = generateId();
    const prdSummary = summarizePrd(prdContent);
    const model = this.runner.type;

    // Insert debate record (status = 'running')
    await this.db.prepare(`
      INSERT INTO sixhats_debates (id, prd_id, biz_item_id, status, total_turns, completed_turns, model, org_id)
      VALUES (?, ?, ?, 'running', 20, 0, ?, ?)
    `).bind(debateId, prdId, bizItemId, model, orgId).run();

    const turns: TurnResult[] = [];
    const startTime = Date.now();
    let totalTokens = 0;

    try {
      for (let i = 0; i < TURN_SEQUENCE.length; i++) {
        const turnNumber = i + 1;
        const hatColor = TURN_SEQUENCE[i]!;
        const hat = HAT_CONFIGS[hatColor];

        // 이전 N턴 컨텍스트
        const recentTurns = turns.slice(-CONTEXT_WINDOW_TURNS).map((t) => ({
          hat: HAT_CONFIGS[t.hat].label,
          content: t.content,
        }));

        const { system, user } = buildTurnPrompt({
          turnNumber,
          hat,
          prdSummary,
          previousTurns: recentTurns,
          roundInfo: "",
        });

        const turnStart = Date.now();
        const result = await this.runner.execute({
          taskId: `sixhats-${debateId}-turn-${turnNumber}`,
          agentId: "sixhats-debate",
          taskType: "spec-analysis",
          context: {
            repoUrl: "",
            branch: "",
            instructions: user,
            systemPromptOverride: system,
          },
          constraints: [],
        });

        const content = result.output?.analysis ?? "";
        const turnTokens = result.tokensUsed ?? 0;
        const turnDuration = (Date.now() - turnStart) / 1000;

        const turnResult: TurnResult = {
          turnNumber,
          hat: hatColor,
          hatLabel: `${hat.emoji} ${hat.label}`,
          content,
          tokens: turnTokens,
          durationSeconds: turnDuration,
        };
        turns.push(turnResult);
        totalTokens += turnTokens;

        // Save turn to D1
        await this.db.prepare(`
          INSERT INTO sixhats_turns (id, debate_id, turn_number, hat, hat_label, content, tokens, duration_seconds)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          generateId(), debateId, turnNumber, hatColor,
          turnResult.hatLabel, content, turnTokens, turnDuration,
        ).run();

        // Update progress
        await this.db.prepare(
          `UPDATE sixhats_debates SET completed_turns = ? WHERE id = ?`
        ).bind(turnNumber, debateId).run();
      }

      // Extract key issues from last Blue Hat turn
      const lastBlue = turns.filter((t) => t.hat === "blue").pop();
      const keyIssues = this.extractKeyIssues(lastBlue?.content ?? "");
      const summary = lastBlue?.content ?? "";
      const duration = (Date.now() - startTime) / 1000;

      // Update debate as completed
      await this.db.prepare(`
        UPDATE sixhats_debates
        SET status = 'completed', completed_turns = 20, key_issues = ?,
            summary = ?, total_tokens = ?, duration_seconds = ?,
            completed_at = datetime('now')
        WHERE id = ?
      `).bind(JSON.stringify(keyIssues), summary, totalTokens, duration, debateId).run();

      return {
        id: debateId,
        prdId, bizItemId,
        status: "completed",
        totalTurns: 20,
        completedTurns: turns.length,
        turns, keyIssues, summary,
        model, totalTokens, durationSeconds: duration,
      };
    } catch (err) {
      const duration = (Date.now() - startTime) / 1000;
      await this.db.prepare(`
        UPDATE sixhats_debates SET status = 'failed', duration_seconds = ?, completed_at = datetime('now')
        WHERE id = ?
      `).bind(duration, debateId).run();

      throw new SixHatsDebateError(
        `Debate failed at turn ${turns.length + 1}: ${err instanceof Error ? err.message : String(err)}`,
        "DEBATE_FAILED",
      );
    }
  }

  async getDebate(debateId: string): Promise<DebateResult | null> {
    const debate = await this.db.prepare(
      "SELECT * FROM sixhats_debates WHERE id = ?"
    ).bind(debateId).first<SixHatsDebateRow>();
    if (!debate) return null;

    const { results: turnRows } = await this.db.prepare(
      "SELECT * FROM sixhats_turns WHERE debate_id = ? ORDER BY turn_number"
    ).bind(debateId).all<SixHatsTurnRow>();

    return toDebateResult(debate, turnRows);
  }

  async listDebates(prdId: string): Promise<DebateResult[]> {
    const { results: debates } = await this.db.prepare(
      "SELECT * FROM sixhats_debates WHERE prd_id = ? ORDER BY created_at DESC"
    ).bind(prdId).all<SixHatsDebateRow>();

    const results: DebateResult[] = [];
    for (const debate of debates) {
      const { results: turnRows } = await this.db.prepare(
        "SELECT * FROM sixhats_turns WHERE debate_id = ? ORDER BY turn_number"
      ).bind(debate.id).all<SixHatsTurnRow>();
      results.push(toDebateResult(debate, turnRows));
    }
    return results;
  }

  private extractKeyIssues(blueHatContent: string): string[] {
    const lines = blueHatContent.split("\n");
    const issues: string[] = [];
    for (const line of lines) {
      const trimmed = line.replace(/^[\s\-*\d.]+/, "").trim();
      if (trimmed.length > 10 && trimmed.length < 500) {
        issues.push(trimmed);
      }
    }
    return issues.slice(0, 10);
  }
}

// ─── D1 Row Types ───

interface SixHatsDebateRow {
  id: string;
  prd_id: string;
  biz_item_id: string;
  status: string;
  total_turns: number;
  completed_turns: number;
  key_issues: string | null;
  summary: string | null;
  model: string;
  total_tokens: number;
  duration_seconds: number;
  created_at: string;
  completed_at: string | null;
  org_id: string;
}

interface SixHatsTurnRow {
  id: string;
  debate_id: string;
  turn_number: number;
  hat: string;
  hat_label: string;
  content: string;
  tokens: number;
  duration_seconds: number;
  created_at: string;
}

function toDebateResult(row: SixHatsDebateRow, turns: SixHatsTurnRow[]): DebateResult {
  return {
    id: row.id,
    prdId: row.prd_id,
    bizItemId: row.biz_item_id,
    status: row.status as "completed" | "failed",
    totalTurns: row.total_turns,
    completedTurns: row.completed_turns,
    turns: turns.map((t) => ({
      turnNumber: t.turn_number,
      hat: t.hat as HatColor,
      hatLabel: t.hat_label,
      content: t.content,
      tokens: t.tokens,
      durationSeconds: t.duration_seconds,
    })),
    keyIssues: row.key_issues ? JSON.parse(row.key_issues) : [],
    summary: row.summary ?? "",
    model: row.model,
    totalTokens: row.total_tokens,
    durationSeconds: row.duration_seconds,
  };
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
