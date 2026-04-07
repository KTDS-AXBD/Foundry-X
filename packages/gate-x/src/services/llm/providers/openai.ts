import type { LLMProvider, LLMRequest, LLMResponse } from '../types.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;

  async call(req: LLMRequest, apiKey: string): Promise<LLMResponse> {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set');
    }

    const model = 'gpt-4o-mini';
    const messages: { role: string; content: string }[] = [];

    if (req.system) {
      messages.push({ role: 'system', content: req.system });
    }
    messages.push({ role: 'user', content: req.prompt });

    const body: Record<string, unknown> = {
      model,
      max_tokens: req.maxTokens ?? 1024,
      messages,
    };

    if (req.temperature !== undefined) {
      body.temperature = req.temperature;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    const text = data.choices[0]?.message?.content ?? '';

    return {
      text,
      provider: 'openai',
      model: data.model ?? model,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}
