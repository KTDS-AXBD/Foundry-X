import type { LLMProvider, LLMRequest, LLMResponse } from '../types.js';

export class GoogleProvider implements LLMProvider {
  readonly name = 'google' as const;

  async call(req: LLMRequest, apiKey: string): Promise<LLMResponse> {
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not set');
    }

    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: req.maxTokens ?? 1024,
    };

    if (req.temperature !== undefined) {
      generationConfig.temperature = req.temperature;
    }

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: req.prompt }] }],
      generationConfig,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google AI API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as {
      candidates: {
        content: { parts: { text: string }[] };
      }[];
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
    };

    const text =
      data.candidates[0]?.content?.parts?.map((p) => p.text).join('') ?? '';

    return {
      text,
      provider: 'google',
      model,
      usage: data.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount,
            outputTokens: data.usageMetadata.candidatesTokenCount,
          }
        : undefined,
    };
  }
}
