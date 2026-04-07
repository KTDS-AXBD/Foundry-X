// ─── F431: OGD Feedback Converter Service (Sprint 207) ───
// LLM 판별 결과(raw feedback + failedItems) → 구체적 수정 지시(StructuredInstruction[]) 변환

import type { StructuredInstruction } from "@foundry-x/shared";

export interface ConvertResult {
  instructions: StructuredInstruction[];
  inputTokens: number;
  outputTokens: number;
}

export class OgdFeedbackConverterService {
  constructor(private ai: Ai) {}

  async convert(
    rawFeedback: string,
    failedItems: string[],
  ): Promise<ConvertResult> {
    if (failedItems.length === 0 && !rawFeedback.trim()) {
      return { instructions: [], inputTokens: 0, outputTokens: 0 };
    }

    const systemPrompt = [
      "You are a UI code improvement advisor.",
      "Convert quality evaluation feedback into specific, actionable code instructions.",
      "Each instruction must:",
      "1. Name the specific issue (from the failed checklist item)",
      "2. Give an exact action to take (e.g., \"Replace Arial with Google Fonts Noto Sans\")",
      "3. Optionally provide a short CSS/HTML code snippet as example",
      "Output ONLY valid JSON: { \"instructions\": [{\"issue\": string, \"action\": string, \"example\"?: string}] }",
      "No markdown fences, no explanations — just the JSON object.",
    ].join(" ");

    const failedSection =
      failedItems.length > 0
        ? `Failed checklist items:\n${failedItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}`
        : "";

    const userPrompt = [
      failedSection,
      failedSection ? "" : undefined,
      `Raw feedback from discriminator:\n${rawFeedback}`,
    ]
      .filter((s) => s !== undefined)
      .join("\n");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.ai as any).run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1024,
      }) as { response?: string };

      const raw = response.response ?? "";
      const inputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      const outputTokens = Math.ceil(raw.length / 4);

      const parsed = this.parseInstructions(raw);
      if (parsed) {
        return { instructions: parsed, inputTokens, outputTokens };
      }

      // Fallback: failedItems에서 기본 지시 생성
      return {
        instructions: this.buildFallbackInstructions(failedItems),
        inputTokens,
        outputTokens,
      };
    } catch {
      return {
        instructions: this.buildFallbackInstructions(failedItems),
        inputTokens: 0,
        outputTokens: 0,
      };
    }
  }

  private parseInstructions(raw: string): StructuredInstruction[] | null {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const parsed = JSON.parse(jsonMatch[0]) as { instructions?: unknown[] };
      if (!Array.isArray(parsed.instructions)) return null;

      const instructions: StructuredInstruction[] = [];
      for (const item of parsed.instructions) {
        if (
          typeof item === "object" &&
          item !== null &&
          "issue" in item &&
          "action" in item &&
          typeof (item as Record<string, unknown>).issue === "string" &&
          typeof (item as Record<string, unknown>).action === "string"
        ) {
          const typedItem = item as Record<string, unknown>;
          instructions.push({
            issue: typedItem.issue as string,
            action: typedItem.action as string,
            example: typeof typedItem.example === "string" ? typedItem.example : undefined,
          });
        }
      }
      return instructions.length > 0 ? instructions : null;
    } catch {
      return null;
    }
  }

  private buildFallbackInstructions(failedItems: string[]): StructuredInstruction[] {
    return failedItems.map((item) => ({
      issue: item,
      action: `Fix the following issue: ${item}`,
    }));
  }
}
