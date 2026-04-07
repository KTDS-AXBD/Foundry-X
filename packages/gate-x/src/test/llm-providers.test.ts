import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from '../services/llm/providers/anthropic.js';
import { OpenAIProvider } from '../services/llm/providers/openai.js';
import { GoogleProvider } from '../services/llm/providers/google.js';

describe('LLM Providers', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('AnthropicProvider', () => {
    it('should call Anthropic API and parse response', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Anthropic response text' }],
        model: 'claude-sonnet-4-5',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const provider = new AnthropicProvider();
      const result = await provider.call(
        { prompt: 'Hello', system: 'You are helpful.' },
        'test-api-key',
      );

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-sonnet-4-5');
      expect(result.text).toBe('Anthropic response text');
      expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 20 });

      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-api-key');
      expect((init.headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01');
    });

    it('should throw if API key is not set', async () => {
      const provider = new AnthropicProvider();
      await expect(provider.call({ prompt: 'Hello' }, '')).rejects.toThrow(
        'ANTHROPIC_API_KEY not set',
      );
    });

    it('should throw on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      const provider = new AnthropicProvider();
      await expect(provider.call({ prompt: 'Hello' }, 'bad-key')).rejects.toThrow(
        'Anthropic API error 401',
      );
    });
  });

  describe('OpenAIProvider', () => {
    it('should call OpenAI API and parse response', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'OpenAI response text' } }],
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 8, completion_tokens: 15 },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const provider = new OpenAIProvider();
      const result = await provider.call(
        { prompt: 'Hello', system: 'You are helpful.' },
        'test-openai-key',
      );

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.text).toBe('OpenAI response text');
      expect(result.usage).toEqual({ inputTokens: 8, outputTokens: 15 });

      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect((init.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer test-openai-key',
      );

      const body = JSON.parse(init.body as string);
      expect(body.messages[0]).toEqual({ role: 'system', content: 'You are helpful.' });
      expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('should throw if API key is not set', async () => {
      const provider = new OpenAIProvider();
      await expect(provider.call({ prompt: 'Hello' }, '')).rejects.toThrow(
        'OPENAI_API_KEY not set',
      );
    });

    it('should throw on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      } as Response);

      const provider = new OpenAIProvider();
      await expect(provider.call({ prompt: 'Hello' }, 'key')).rejects.toThrow(
        'OpenAI API error 429',
      );
    });
  });

  describe('GoogleProvider', () => {
    it('should call Google AI API and parse response', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Google response text' }],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 12 },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const provider = new GoogleProvider();
      const result = await provider.call({ prompt: 'Hello' }, 'test-google-key');

      expect(result.provider).toBe('google');
      expect(result.model).toBe('gemini-1.5-flash');
      expect(result.text).toBe('Google response text');
      expect(result.usage).toEqual({ inputTokens: 5, outputTokens: 12 });

      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('gemini-1.5-flash:generateContent');
      expect(url).toContain('key=test-google-key');

      const body = JSON.parse(init.body as string);
      expect(body.contents[0].parts[0].text).toBe('Hello');
    });

    it('should throw if API key is not set', async () => {
      const provider = new GoogleProvider();
      await expect(provider.call({ prompt: 'Hello' }, '')).rejects.toThrow(
        'GOOGLE_AI_API_KEY not set',
      );
    });

    it('should throw on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as Response);

      const provider = new GoogleProvider();
      await expect(provider.call({ prompt: 'Hello' }, 'key')).rejects.toThrow(
        'Google AI API error 403',
      );
    });
  });
});
