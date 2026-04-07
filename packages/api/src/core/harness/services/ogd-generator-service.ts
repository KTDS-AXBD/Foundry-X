// ─── F355: O-G-D Generator Service (Sprint 160) ───
// PRD → HTML 프로토타입 생성 (Haiku 모델 기반)
// F423: impeccable 디자인 스킬 통합 (Sprint 203)

import { getImpeccableReference } from "../../../data/impeccable-reference.js";

interface GenerateResult {
  html: string;
  inputTokens: number;
  outputTokens: number;
  modelUsed: string;
}

export class OgdGeneratorService {
  constructor(
    private ai: Ai,
    private apiKey?: string,
  ) {}

  async generate(
    prdContent: string,
    previousFeedback?: string,
  ): Promise<GenerateResult> {
    const designReference = getImpeccableReference();

    const systemPrompt = [
      "You are a prototype HTML generator.",
      "Generate a complete, self-contained single-page HTML prototype based on the PRD below.",
      "Include inline CSS and minimal JS.",
      "Output ONLY the HTML — no markdown fences, no explanations.",
      "",
      "=== DESIGN QUALITY GUIDELINES ===",
      "Apply the following professional design principles when generating HTML:",
      "",
      designReference,
      "=== END DESIGN GUIDELINES ===",
    ].join("\n");

    let userPrompt = `PRD:\n${prdContent}`;
    if (previousFeedback) {
      userPrompt += `\n\nPrevious round feedback (improve these areas):\n${previousFeedback}`;
    }

    const messages = [
      { role: "user" as const, content: userPrompt },
    ];

    // Workers AI (Haiku-class model)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (this.ai as any).run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 4096,
    }) as { response?: string };

    const html = response.response ?? "";

    // Token approximation (Workers AI doesn't return exact counts)
    const inputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
    const outputTokens = Math.ceil(html.length / 4);

    return {
      html,
      inputTokens,
      outputTokens,
      modelUsed: "llama-3.1-8b",
    };
  }
}
