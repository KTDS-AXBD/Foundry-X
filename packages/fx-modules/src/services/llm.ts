interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

export class LLMService {
  constructor(
    private ai?: unknown,
    private anthropicKey?: string,
  ) {}

  async generate(_systemPrompt: string, _userPrompt: string): Promise<LLMResponse> {
    return { content: "", model: "stub", tokensUsed: 0 };
  }
}
