/**
 * MCP Sampling Handler — Sprint 13 F64
 * MCP 서버가 호스트(Foundry-X)에게 LLM 추론을 요청할 때 처리
 * 보안: 모델 허용 목록, 토큰 한도, 분당 요청 제한, 이미지 차단
 */
import type { LLMService } from "../../../services/llm.js";
import type { McpSamplingMessage } from "@foundry-x/shared";

export interface SamplingSecurityConfig {
  allowedModels: string[];
  maxTokensPerRequest: number;
  maxRequestsPerMinute: number;
}

export interface McpSamplingRequest {
  messages: McpSamplingMessage[];
  modelPreferences?: {
    hints?: Array<{ name?: string }>;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
  systemPrompt?: string;
  maxTokens: number;
}

export interface McpSamplingResponse {
  role: "assistant";
  content: { type: "text"; text: string };
  model: string;
  stopReason?: string;
}

const DEFAULT_CONFIG: SamplingSecurityConfig = {
  allowedModels: ["claude-haiku-4-5-20251001"],
  maxTokensPerRequest: 4096,
  maxRequestsPerMinute: 10,
};

export class McpSamplingHandler {
  private readonly config: SamplingSecurityConfig;
  private readonly rateLimitMap = new Map<string, number[]>();

  constructor(
    private readonly llmService: LLMService,
    private readonly db: D1Database,
    config?: Partial<SamplingSecurityConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async handleSamplingRequest(
    serverId: string,
    request: McpSamplingRequest,
  ): Promise<McpSamplingResponse> {
    this.validateRequest(request);
    this.checkRateLimit(serverId);

    const logId = crypto.randomUUID().replace(/-/g, "");
    const startTime = Date.now();

    const systemPrompt = request.systemPrompt ?? "You are a helpful assistant.";
    const userPrompt = this.messagesToPrompt(request.messages);

    try {
      const llmResult = await this.llmService.generate(systemPrompt, userPrompt);
      const durationMs = Date.now() - startTime;

      await this.logSamplingRequest(logId, serverId, {
        model: llmResult.model,
        maxTokens: request.maxTokens,
        tokensUsed: llmResult.tokensUsed,
        durationMs,
        status: "success",
      });

      return {
        role: "assistant",
        content: { type: "text", text: llmResult.content },
        model: llmResult.model,
        stopReason: "endTurn",
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;

      await this.logSamplingRequest(logId, serverId, {
        model: "unknown",
        maxTokens: request.maxTokens,
        tokensUsed: null,
        durationMs,
        status: "error",
      });

      throw err;
    }
  }

  validateRequest(request: McpSamplingRequest): void {
    if (request.maxTokens > this.config.maxTokensPerRequest) {
      throw new Error(
        `maxTokens ${request.maxTokens} exceeds limit ${this.config.maxTokensPerRequest}`,
      );
    }
    if (request.maxTokens < 1) {
      throw new Error("maxTokens must be at least 1");
    }

    for (const msg of request.messages) {
      if (msg.content.type === "image") {
        throw new Error("Image content is not supported in sampling requests");
      }
    }
  }

  checkRateLimit(serverId: string): void {
    const now = Date.now();
    const windowMs = 60_000;

    let timestamps = this.rateLimitMap.get(serverId) ?? [];
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= this.config.maxRequestsPerMinute) {
      throw new Error(
        `Rate limit exceeded: ${this.config.maxRequestsPerMinute} requests per minute`,
      );
    }

    timestamps.push(now);
    this.rateLimitMap.set(serverId, timestamps);
  }

  messagesToPrompt(messages: McpSamplingMessage[]): string {
    return messages
      .map((msg) => {
        const prefix = msg.role === "user" ? "User" : "Assistant";
        if (msg.content.type === "text") {
          return `${prefix}: ${msg.content.text}`;
        }
        return `${prefix}: [unsupported content type: ${msg.content.type}]`;
      })
      .join("\n\n");
  }

  private async logSamplingRequest(
    id: string,
    serverId: string,
    data: {
      model: string;
      maxTokens: number;
      tokensUsed: number | null;
      durationMs: number;
      status: string;
    },
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO mcp_sampling_log (id, server_id, model, max_tokens, tokens_used, duration_ms, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        serverId,
        data.model,
        data.maxTokens,
        data.tokensUsed,
        data.durationMs,
        data.status,
      )
      .run();
  }
}
