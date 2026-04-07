import type { LLMConfig, LLMEnv, LLMRequest, LLMResponse } from './types.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OpenAIProvider } from './providers/openai.js';
import { GoogleProvider } from './providers/google.js';

const VALID_PROVIDERS = ['anthropic', 'openai', 'google'] as const;
type ProviderName = (typeof VALID_PROVIDERS)[number];

function parseProviderOrder(raw?: string): ProviderName[] {
  if (!raw) return ['anthropic', 'openai', 'google'];
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderName =>
      VALID_PROVIDERS.includes(s as ProviderName),
    );
  return parsed.length > 0 ? parsed : ['anthropic', 'openai', 'google'];
}

export async function callLLM(
  req: LLMRequest,
  env: LLMEnv,
  config?: Partial<LLMConfig>,
): Promise<LLMResponse> {
  const providerOrder =
    config?.providerOrder ?? parseProviderOrder(env.LLM_PROVIDER_ORDER);

  const providers = {
    anthropic: new AnthropicProvider(),
    openai: new OpenAIProvider(),
    google: new GoogleProvider(),
  };

  const apiKeys: Record<ProviderName, string | undefined> = {
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    google: env.GOOGLE_AI_API_KEY,
  };

  const defaultMaxTokens = config?.defaultMaxTokens ?? 1024;
  const finalReq: LLMRequest = {
    ...req,
    maxTokens: req.maxTokens ?? defaultMaxTokens,
  };

  let lastError: Error | undefined;

  for (const providerName of providerOrder) {
    const provider = providers[providerName];
    const apiKey = apiKeys[providerName] ?? '';

    try {
      const response = await provider.call(finalReq, apiKey);
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('No LLM providers available');
}
