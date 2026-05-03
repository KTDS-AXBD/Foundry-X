/**
 * F201: BMC Block Insights — BMC 블록별 개선 인사이트를 LLM으로 생성
 */
import { PromptGatewayService } from "../../../services/prompt-gateway.js";
import { ModelRouter } from "../../agent/services/model-router.js";
import type { AgentTaskType } from "../../../core/agent/services/execution-types.js";

export interface BlockInsight {
  title: string;
  description: string;
  suggestedContent: string;
}

export interface InsightResult {
  insights: BlockInsight[];
  processingTimeMs: number;
  model: string;
  masked: boolean;
}

const SYSTEM_PROMPT = `You are a Business Model Canvas (BMC) expert. Given a specific BMC block type and its current content, suggest 3 improvements.

Return ONLY a valid JSON array with exactly 3 objects, each having:
- "title": short improvement title (max 50 chars)
- "description": why this improvement matters (max 200 chars)
- "suggestedContent": improved content for the block (max 300 chars)

Write in the same language as the input. Return ONLY the JSON array, no markdown or explanation.`;

export class BmcInsightService {
  private db: D1Database;
  private anthropicApiKey: string;

  constructor(db: D1Database, anthropicApiKey: string) {
    this.db = db;
    this.anthropicApiKey = anthropicApiKey;
  }

  async generateInsights(
    blockType: string,
    currentContent: string,
    bmcContext?: Record<string, string>,
    tenantId?: string,
  ): Promise<InsightResult> {
    const startTime = Date.now();

    // 1. Sanitize prompt via PromptGateway
    const gateway = new PromptGatewayService(this.db);
    let userPrompt = `Block type: ${blockType}\nCurrent content: ${currentContent}`;
    if (bmcContext) {
      userPrompt += `\nBMC Context: ${JSON.stringify(bmcContext)}`;
    }
    const sanitizeResult = await gateway.sanitizePrompt(userPrompt, tenantId);

    if (!sanitizeResult.sanitizedContent) {
      throw new Error("GATEWAY_NOT_PROCESSED");
    }

    // 2. Determine model via ModelRouter
    const router = new ModelRouter(this.db);
    const taskType = "bmc-insight" as AgentTaskType;
    let routingRule;
    try {
      routingRule = await router.getModelForTask(taskType);
    } catch {
      routingRule = await router.getModelForTask("bmc-generation");
    }
    const modelId = routingRule.modelId.replace("anthropic/", "");

    // 3. Call Anthropic Messages API with 15s timeout
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

    // 4. Parse response
    const body = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const textBlock = body.content?.find((c) => c.type === "text");
    if (!textBlock?.text) {
      throw new Error("LLM_PARSE_ERROR");
    }

    const insights = parseInsights(textBlock.text);

    return {
      insights,
      processingTimeMs: Date.now() - startTime,
      model: routingRule.modelId,
      masked: sanitizeResult.appliedRules.length > 0,
    };
  }
}

/** Parse LLM JSON output into BlockInsight array */
export function parseInsights(text: string): BlockInsight[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("LLM_PARSE_ERROR");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("LLM_PARSE_ERROR");
  }

  return parsed.map((item: Record<string, unknown>) => ({
    title: typeof item.title === "string" ? item.title.slice(0, 50) : "",
    description: typeof item.description === "string" ? item.description.slice(0, 200) : "",
    suggestedContent: typeof item.suggestedContent === "string" ? item.suggestedContent.slice(0, 300) : "",
  }));
}
