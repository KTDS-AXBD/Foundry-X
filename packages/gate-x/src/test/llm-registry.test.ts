import { describe, it, expect, vi, afterEach } from 'vitest';
import { callLLM } from '../services/llm/index.js';
import type { LLMEnv } from '../services/llm/types.js';

describe('callLLM registry', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should return response from the first provider on success', async () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'Anthropic answer' }],
      model: 'claude-sonnet-4-6',
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const env: LLMEnv = {
      ANTHROPIC_API_KEY: 'anthropic-key',
      OPENAI_API_KEY: 'openai-key',
      GOOGLE_AI_API_KEY: 'google-key',
    };

    const result = await callLLM({ prompt: 'Hello' }, env);

    expect(result.provider).toBe('anthropic');
    expect(result.text).toBe('Anthropic answer');

    // fetch는 1번만 호출되어야 함 (첫 번째 provider 성공)
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should fall back to second provider if first fails', async () => {
    const openaiResponse = {
      choices: [{ message: { content: 'OpenAI fallback answer' } }],
      model: 'gpt-4o-mini',
      usage: { prompt_tokens: 8, completion_tokens: 10 },
    };

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Anthropic 실패
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response);
      }
      // OpenAI 성공
      return Promise.resolve({
        ok: true,
        json: async () => openaiResponse,
      } as Response);
    });

    const env: LLMEnv = {
      ANTHROPIC_API_KEY: 'anthropic-key',
      OPENAI_API_KEY: 'openai-key',
      GOOGLE_AI_API_KEY: 'google-key',
    };

    const result = await callLLM({ prompt: 'Hello' }, env);

    expect(result.provider).toBe('openai');
    expect(result.text).toBe('OpenAI fallback answer');
    expect(callCount).toBe(2);
  });

  it('should throw error if all providers fail', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    } as Response);

    const env: LLMEnv = {
      ANTHROPIC_API_KEY: 'key',
      OPENAI_API_KEY: 'key',
      GOOGLE_AI_API_KEY: 'key',
    };

    await expect(callLLM({ prompt: 'Hello' }, env)).rejects.toThrow();

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    // 3개 provider 모두 시도
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should respect custom provider order from env', async () => {
    const googleResponse = {
      candidates: [{ content: { parts: [{ text: 'Google first answer' }] } }],
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 7 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => googleResponse,
    } as Response);

    const env: LLMEnv = {
      GOOGLE_AI_API_KEY: 'google-key',
      LLM_PROVIDER_ORDER: 'google,anthropic,openai',
    };

    const result = await callLLM({ prompt: 'Hello' }, env);

    expect(result.provider).toBe('google');
    expect(result.text).toBe('Google first answer');
  });

  it('should throw if provider key is missing', async () => {
    const env: LLMEnv = {
      // 키 없음
    };

    // API key 없으면 각 provider가 Error throw
    await expect(callLLM({ prompt: 'Hello' }, env)).rejects.toThrow();
  });

  it('should use config providerOrder when provided', async () => {
    const openaiResponse = {
      choices: [{ message: { content: 'OpenAI first' } }],
      model: 'gpt-4o-mini',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => openaiResponse,
    } as Response);

    const env: LLMEnv = {
      OPENAI_API_KEY: 'openai-key',
      ANTHROPIC_API_KEY: 'anthropic-key',
    };

    const result = await callLLM({ prompt: 'Hello' }, env, {
      providerOrder: ['openai', 'anthropic'],
    });

    expect(result.provider).toBe('openai');

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('openai.com');
  });
});
