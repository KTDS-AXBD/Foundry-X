// ─── F528: F-L3-6 ConversationManager ───
import type { AnthropicMessage, ConversationManagerOptions } from "@foundry-x/shared";
import { MODEL_HAIKU } from "@foundry-x/shared";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MAX_MESSAGES = 20;

/**
 * ConversationManager — 컨텍스트 윈도우 관리.
 * sliding-window: 최신 N개 메시지만 유지
 * summarizing: 오래된 메시지를 LLM으로 요약 압축
 */
export class ConversationManager {
  constructor(private opts: ConversationManagerOptions) {}

  /** SlidingWindow: maxMessages 초과 메시지를 최신 N개로 자름 */
  trimMessages(messages: AnthropicMessage[]): AnthropicMessage[] {
    const max = this.opts.maxMessages ?? DEFAULT_MAX_MESSAGES;
    if (messages.length <= max) return messages;
    return messages.slice(messages.length - max);
  }

  /** Summarizing: 오래된 메시지를 요약 1개로 압축 */
  async summarize(messages: AnthropicMessage[], apiKey: string): Promise<AnthropicMessage[]> {
    const max = this.opts.maxMessages ?? DEFAULT_MAX_MESSAGES;
    if (messages.length <= max) return messages;

    const toSummarize = messages.slice(0, messages.length - max);
    const recent = messages.slice(messages.length - max);

    const summaryText = await this.callSummaryLLM(toSummarize, apiKey);

    const summaryMessage: AnthropicMessage = {
      role: "user",
      content: `[Previous conversation summary: ${summaryText}]`,
    };

    return [summaryMessage, ...recent];
  }

  async apply(messages: AnthropicMessage[], apiKey?: string): Promise<AnthropicMessage[]> {
    if (this.opts.strategy === "sliding-window") {
      return this.trimMessages(messages);
    }
    return this.summarize(messages, apiKey!);
  }

  private async callSummaryLLM(messages: AnthropicMessage[], apiKey: string): Promise<string> {
    const model = this.opts.summaryModel ?? MODEL_HAIKU;
    const summaryPrompt = "Please summarize the key points of this conversation in 2-3 sentences.";

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        messages: [
          ...messages,
          { role: "user", content: summaryPrompt },
        ],
      }),
    });

    if (!response.ok) {
      return "Summary unavailable";
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const textBlock = data.content.find((c) => c.type === "text");
    return textBlock?.text ?? "Summary unavailable";
  }
}
