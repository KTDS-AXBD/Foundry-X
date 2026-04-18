import { MODEL_SONNET } from '@foundry-x/shared';
import type { LLMProvider, LLMRequest, LLMResponse } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;

  async call(req: LLMRequest, apiKey: string): Promise<LLMResponse> {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }

    const model = MODEL_SONNET;
    const body: Record<string, unknown> = {
      model,
      max_tokens: req.maxTokens ?? 1024,
      messages: [{ role: 'user', content: req.prompt }],
    };

    if (req.system) {
      body.system = req.system;
    }

    if (req.temperature !== undefined) {
      body.temperature = req.temperature;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as {
      content: { type: string; text: string }[];
      model: string;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    return {
      text,
      provider: 'anthropic',
      model: data.model ?? model,
      usage: data.usage
        ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
        : undefined,
    };
  }
}
