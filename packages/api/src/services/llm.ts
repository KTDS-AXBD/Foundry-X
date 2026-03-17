interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

export class LLMService {
  constructor(
    private ai?: any,
    private anthropicKey?: string,
  ) {}

  async generate(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    if (this.ai) {
      try {
        return await this.generateWithWorkersAI(systemPrompt, userPrompt);
      } catch {
        if (this.anthropicKey) {
          return this.generateWithClaude(systemPrompt, userPrompt);
        }
        throw new Error("LLM service unavailable");
      }
    }

    if (this.anthropicKey) {
      return this.generateWithClaude(systemPrompt, userPrompt);
    }

    throw new Error("No LLM provider configured");
  }

  private async generateWithWorkersAI(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<LLMResponse> {
    const result = await this.ai!.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1024,
    });

    return {
      content: (result as { response: string }).response,
      model: "llama-3.1-8b-instruct",
      tokensUsed: 0,
    };
  }

  private async generateWithClaude(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<LLMResponse> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.anthropicKey!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = (await res.json()) as {
      content: Array<{ text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0]?.text ?? "",
      model: "claude-haiku-4-5",
      tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
    };
  }
}

export const NL_TO_SPEC_SYSTEM_PROMPT = `You are a specification writer for software projects.
Convert natural language requirements into structured specifications.

OUTPUT FORMAT (JSON only, no markdown wrapping):
{
  "title": "Feature title (5-100 chars)",
  "description": "Clear description of what to build (20-500 chars)",
  "acceptanceCriteria": ["AC-1: ...", "AC-2: ..."],
  "priority": "P0|P1|P2|P3",
  "estimatedEffort": "XS|S|M|L|XL",
  "category": "feature|bugfix|improvement|infrastructure",
  "dependencies": ["dependency description if any"],
  "risks": ["potential risk if any"]
}

RULES:
- P0 = critical/blocking, P1 = important, P2 = nice-to-have, P3 = future
- XS = <1h, S = 1-4h, M = 4-8h, L = 1-3 days, XL = 3+ days
- Acceptance criteria must be testable/verifiable
- Output ONLY valid JSON, no explanation`;

export function buildUserPrompt(text: string, context?: string): string {
  let prompt = `Convert the following requirement to a structured specification:\n\n"${text}"`;
  if (context) {
    prompt += `\n\nProject context: ${context}`;
  }
  return prompt;
}
