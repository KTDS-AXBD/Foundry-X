/**
 * F202: InsightAgent — Market keyword summary agent with job queue
 */
import { PromptGatewayService } from "../../../services/agent/prompt-gateway.js";
import { ModelRouter } from "../../../services/agent/model-router.js";
import type { AgentTaskType } from "../../../services/agent/execution-types.js";

export interface InsightJob {
  id: string;
  orgId: string;
  userId: string;
  keywords: string[];
  status: "pending" | "processing" | "completed" | "failed";
  result: MarketSummaryResult | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
}

export interface MarketSummaryResult {
  summary: string;
  trends: string[];
  opportunities: string[];
  risks: string[];
}

interface InsightJobRow {
  id: string;
  org_id: string;
  user_id: string;
  keywords: string;
  status: string;
  result: string | null;
  error: string | null;
  created_at: number;
  completed_at: number | null;
}

const SYSTEM_PROMPT = `You are a market analyst. Given a set of keywords, provide a comprehensive market analysis.

Return ONLY a valid JSON object with these keys:
- "summary": a concise market overview (max 500 chars)
- "trends": an array of 3-5 current market trends (each max 100 chars)
- "opportunities": an array of 3-5 market opportunities (each max 100 chars)
- "risks": an array of 3-5 market risks (each max 100 chars)

Write in the same language as the input. Return ONLY the JSON object, no markdown or explanation.`;

function generateId(): string {
  return `ij_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function rowToJob(row: InsightJobRow): InsightJob {
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    keywords: JSON.parse(row.keywords) as string[],
    status: row.status as InsightJob["status"],
    result: row.result ? (JSON.parse(row.result) as MarketSummaryResult) : null,
    error: row.error,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export class InsightAgentService {
  private db: D1Database;
  private anthropicApiKey: string;

  constructor(db: D1Database, anthropicApiKey: string) {
    this.db = db;
    this.anthropicApiKey = anthropicApiKey;
  }

  async createJob(orgId: string, userId: string, keywords: string[]): Promise<InsightJob> {
    const id = generateId();
    const now = Date.now();

    await this.db
      .prepare(
        "INSERT INTO ax_insight_jobs (id, org_id, user_id, keywords, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
      )
      .bind(id, orgId, userId, JSON.stringify(keywords), now)
      .run();

    return {
      id,
      orgId,
      userId,
      keywords,
      status: "pending",
      result: null,
      error: null,
      createdAt: now,
      completedAt: null,
    };
  }

  async getJob(jobId: string, orgId: string): Promise<InsightJob | null> {
    const row = await this.db
      .prepare("SELECT * FROM ax_insight_jobs WHERE id = ? AND org_id = ?")
      .bind(jobId, orgId)
      .first<InsightJobRow>();

    if (!row) return null;
    return rowToJob(row);
  }

  async executeJob(jobId: string): Promise<void> {
    // 1. Mark as processing
    await this.db
      .prepare("UPDATE ax_insight_jobs SET status = 'processing' WHERE id = ?")
      .bind(jobId)
      .run();

    // 2. Fetch job data
    const row = await this.db
      .prepare("SELECT * FROM ax_insight_jobs WHERE id = ?")
      .bind(jobId)
      .first<InsightJobRow>();

    if (!row) return;

    try {
      const keywords = JSON.parse(row.keywords) as string[];

      // 3. Sanitize prompt via PromptGateway
      const gateway = new PromptGatewayService(this.db);
      const userPrompt = `Keywords: ${keywords.join(", ")}`;
      const sanitizeResult = await gateway.sanitizePrompt(userPrompt);

      if (!sanitizeResult.sanitizedContent) {
        throw new Error("GATEWAY_NOT_PROCESSED");
      }

      // 4. Determine model via ModelRouter
      const router = new ModelRouter(this.db);
      const taskType = "market-summary" as AgentTaskType;
      let routingRule;
      try {
        routingRule = await router.getModelForTask(taskType);
      } catch {
        routingRule = await router.getModelForTask("bmc-generation");
      }
      const modelId = routingRule.modelId.replace("anthropic/", "");

      // 5. Call Anthropic Messages API with 15s timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      let response: Response;
      try {
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: sanitizeResult.sanitizedContent }],
          }),
          signal: controller.signal,
        });
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("LLM_TIMEOUT");
        }
        throw err;
      }
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error("LLM_PARSE_ERROR");
      }

      // 6. Parse response
      const body = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };

      const textBlock = body.content?.find((c) => c.type === "text");
      if (!textBlock?.text) {
        throw new Error("LLM_PARSE_ERROR");
      }

      const result = parseMarketSummary(textBlock.text);

      // 7. Update job as completed
      await this.db
        .prepare(
          "UPDATE ax_insight_jobs SET status = 'completed', result = ?, completed_at = ? WHERE id = ?",
        )
        .bind(JSON.stringify(result), Date.now(), jobId)
        .run();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await this.db
        .prepare(
          "UPDATE ax_insight_jobs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?",
        )
        .bind(errorMessage, Date.now(), jobId)
        .run();
    }
  }
}

/** Parse LLM JSON output into MarketSummaryResult */
export function parseMarketSummary(text: string): MarketSummaryResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("LLM_PARSE_ERROR");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM_PARSE_ERROR");
  }

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : "",
    trends: Array.isArray(parsed.trends)
      ? parsed.trends.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 100))
      : [],
    opportunities: Array.isArray(parsed.opportunities)
      ? parsed.opportunities.filter((o): o is string => typeof o === "string").map((o) => o.slice(0, 100))
      : [],
    risks: Array.isArray(parsed.risks)
      ? parsed.risks.filter((r): r is string => typeof r === "string").map((r) => r.slice(0, 100))
      : [],
  };
}
