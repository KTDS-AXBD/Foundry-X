/**
 * Sprint 57 F190: TrendDataService — 시장/트렌드 데이터 자동 연동
 * AgentRunner를 통해 LLM 호출 → JSON 파싱 → D1 저장, 24시간 캐시 TTL.
 */
import type { AgentRunner } from "../../agent/services/agent-runner.js";
import type { AgentExecutionResult } from "../../agent/services/execution-types.js";
import { TREND_ANALYSIS_SYSTEM_PROMPT, buildTrendPrompt } from "./trend-data-prompts.js";

export interface TrendReport {
  id: string;
  bizItemId: string;
  marketSummary: string;
  marketSizeEstimate: {
    tam: string;
    sam: string;
    som: string;
    currency: string;
    year: number;
    confidence: "high" | "medium" | "low";
  } | null;
  competitors: Array<{
    name: string;
    description: string;
    url?: string;
    relevance: "high" | "medium" | "low";
  }>;
  trends: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    timeframe: string;
  }>;
  keywordsUsed: string[];
  modelUsed: string;
  tokensUsed: number;
  analyzedAt: string;
  expiresAt: string;
}

interface TrendReportRow {
  id: string;
  biz_item_id: string;
  market_summary: string | null;
  market_size_estimate: string | null;
  competitors: string | null;
  trends: string | null;
  keywords_used: string | null;
  model_used: string | null;
  tokens_used: number;
  analyzed_at: string;
  expires_at: string | null;
}

const CACHE_TTL_HOURS = 24;

export class TrendDataService {
  constructor(
    private runner: AgentRunner,
    private db: D1Database,
  ) {}

  async analyze(
    item: { id: string; title: string; description: string | null },
    options?: { forceRefresh?: boolean },
  ): Promise<TrendReport> {
    if (!options?.forceRefresh) {
      const cached = await this.getReport(item.id);
      if (cached && !this.isReportExpired(cached)) {
        return cached;
      }
    }

    const prompt = buildTrendPrompt(item);

    const result: AgentExecutionResult = await this.runner.execute({
      taskId: `trend-${item.id}`,
      agentId: "trend-analyzer",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: TREND_ANALYSIS_SYSTEM_PROMPT,
      },
      constraints: [],
    });

    if (result.status === "failed") {
      throw new TrendAnalysisError("LLM execution failed", "LLM_EXECUTION_FAILED");
    }

    const rawText = result.output.analysis ?? "";
    const parsed = this.parseResponse(rawText);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);

    const report: TrendReport = {
      id: "",
      bizItemId: item.id,
      marketSummary: parsed.marketSummary,
      marketSizeEstimate: parsed.marketSizeEstimate ?? null,
      competitors: parsed.competitors ?? [],
      trends: parsed.trends ?? [],
      keywordsUsed: [item.title],
      modelUsed: result.model,
      tokensUsed: result.tokensUsed,
      analyzedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const id = await this.saveReport(item.id, report);
    report.id = id;

    return report;
  }

  async getReport(bizItemId: string): Promise<TrendReport | null> {
    const row = await this.db
      .prepare(
        "SELECT * FROM biz_item_trend_reports WHERE biz_item_id = ? ORDER BY analyzed_at DESC LIMIT 1",
      )
      .bind(bizItemId)
      .first<TrendReportRow>();

    if (!row) return null;

    return this.rowToReport(row);
  }

  async isExpired(bizItemId: string): Promise<boolean> {
    const report = await this.getReport(bizItemId);
    if (!report) return true;
    return this.isReportExpired(report);
  }

  private isReportExpired(report: TrendReport): boolean {
    if (!report.expiresAt) return true;
    return new Date(report.expiresAt) < new Date();
  }

  private async saveReport(bizItemId: string, report: TrendReport): Promise<string> {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await this.db
      .prepare(
        `INSERT INTO biz_item_trend_reports
           (id, biz_item_id, market_summary, market_size_estimate, competitors, trends, keywords_used, model_used, tokens_used, analyzed_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        bizItemId,
        report.marketSummary,
        JSON.stringify(report.marketSizeEstimate),
        JSON.stringify(report.competitors),
        JSON.stringify(report.trends),
        JSON.stringify(report.keywordsUsed),
        report.modelUsed,
        report.tokensUsed,
        report.analyzedAt,
        report.expiresAt,
      )
      .run();

    return id;
  }

  private rowToReport(row: TrendReportRow): TrendReport {
    return {
      id: row.id,
      bizItemId: row.biz_item_id,
      marketSummary: row.market_summary ?? "",
      marketSizeEstimate: row.market_size_estimate ? JSON.parse(row.market_size_estimate) : null,
      competitors: row.competitors ? JSON.parse(row.competitors) : [],
      trends: row.trends ? JSON.parse(row.trends) : [],
      keywordsUsed: row.keywords_used ? JSON.parse(row.keywords_used) : [],
      modelUsed: row.model_used ?? "",
      tokensUsed: row.tokens_used,
      analyzedAt: row.analyzed_at,
      expiresAt: row.expires_at ?? "",
    };
  }

  private parseResponse(rawText: string): {
    marketSummary: string;
    marketSizeEstimate: TrendReport["marketSizeEstimate"];
    competitors: TrendReport["competitors"];
    trends: TrendReport["trends"];
  } {
    let jsonStr = rawText.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!.trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new TrendAnalysisError(
        `Failed to parse LLM response as JSON: ${rawText.slice(0, 200)}`,
        "LLM_PARSE_ERROR",
      );
    }

    return {
      marketSummary: String(parsed.marketSummary ?? ""),
      marketSizeEstimate: parsed.marketSizeEstimate as TrendReport["marketSizeEstimate"] ?? null,
      competitors: (parsed.competitors as TrendReport["competitors"]) ?? [],
      trends: (parsed.trends as TrendReport["trends"]) ?? [],
    };
  }
}

export class TrendAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: "LLM_EXECUTION_FAILED" | "LLM_PARSE_ERROR",
  ) {
    super(message);
    this.name = "TrendAnalysisError";
  }
}
