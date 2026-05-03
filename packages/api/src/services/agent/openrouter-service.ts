export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

import { OR_MODEL_SONNET } from "@foundry-x/shared";

export class OpenRouterService {
  constructor(
    private apiKey: string,
    private model: string = OR_MODEL_SONNET,
  ) {}

  async streamChat(
    messages: ChatMessage[],
    systemPrompt: string,
  ): Promise<Response> {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fx.minu.best",
          "X-Title": "Foundry-X Help Agent",
        },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      throw new Error(
        `OpenRouter API error ${response.status}: ${errorText}`,
      );
    }

    return response;
  }
}
