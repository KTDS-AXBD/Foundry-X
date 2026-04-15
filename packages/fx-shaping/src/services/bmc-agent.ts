/**
 * F199: BMCAgent — 아이디어 텍스트를 받아 BMC 9개 블록 초안을 LLM으로 생성
 */
import { PromptGatewayService } from "../agent/services/prompt-gateway.js";
import { ModelRouter } from "../agent/services/model-router.js";
import { BMC_BLOCK_TYPES } from "./bmc-service.js";

export interface BmcDraftResult {
  draft: Record<string, string>;
  processingTimeMs: number;
  model: string;
  masked: boolean;
}

const SYSTEM_PROMPT = `You are a Business Model Canvas (BMC) expert. Given a business idea, generate content for all 9 BMC blocks.

Return ONLY a valid JSON object with these exact keys:
- customer_segments
- value_propositions
- channels
- customer_relationships
- revenue_streams
- key_resources
- key_activities
- key_partnerships
- cost_structure

Each value must be a string of max 200 characters describing the block for the given idea.
Write in the same language as the input. Return ONLY the JSON object, no markdown or explanation.`;

export class BmcAgentService {
  private db: D1Database;
  private anthropicApiKey: string;

  constructor(db: D1Database, anthropicApiKey: string) {
    this.db = db;
    this.anthropicApiKey = anthropicApiKey;
  }

  async generateDraft(
    idea: string,
    context?: string,
    tenantId?: string,
  ): Promise<BmcDraftResult> {
    const startTime = Date.now();

    // 1. Sanitize prompt via PromptGateway
    const gateway = new PromptGatewayService(this.db);
    const userPrompt = context
      ? `Idea: ${idea}\nContext: ${context}`
      : `Idea: ${idea}`;
    const sanitizeResult = await gateway.sanitizePrompt(userPrompt, tenantId);

    if (!sanitizeResult.sanitizedContent) {
      throw new Error("GATEWAY_NOT_PROCESSED");
    }

    // 2. Determine model via ModelRouter
    const router = new ModelRouter(this.db);
    const routingRule = await router.getModelForTask("bmc-generation");
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
    const body = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };

    const textBlock = body.content?.find((c) => c.type === "text");
    if (!textBlock?.text) {
      throw new Error("LLM_PARSE_ERROR");
    }

    const draft = parseBlocks(textBlock.text);

    return {
      draft,
      processingTimeMs: Date.now() - startTime,
      model: routingRule.modelId,
      masked: sanitizeResult.appliedRules.length > 0,
    };
  }
}

/** Parse LLM JSON output into 9 BMC blocks, trimming each to 200 chars */
export function parseBlocks(text: string): Record<string, string> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("LLM_PARSE_ERROR");
  }

  const result: Record<string, string> = {};
  for (const key of BMC_BLOCK_TYPES) {
    const value = parsed[key];
    const str = typeof value === "string" ? value : "";
    result[key] = str.slice(0, 200);
  }
  return result;
}
