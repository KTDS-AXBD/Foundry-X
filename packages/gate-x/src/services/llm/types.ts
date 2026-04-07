export interface LLMRequest {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  name: 'anthropic' | 'openai' | 'google';
  call(req: LLMRequest, apiKey: string): Promise<LLMResponse>;
}

export interface LLMConfig {
  providerOrder: ('anthropic' | 'openai' | 'google')[];
  defaultMaxTokens: number;
}

export interface LLMEnv {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  LLM_PROVIDER_ORDER?: string;
}
