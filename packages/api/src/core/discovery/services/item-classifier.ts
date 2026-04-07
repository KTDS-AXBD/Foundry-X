/**
 * Sprint 51 F175: 사업 아이템 분류기 (ItemClassifier)
 * 3턴 대화 시뮬레이션으로 BizItem을 Type A/B/C로 분류한다.
 * AgentRunner를 통해 LLM 단일 호출, JSON 파싱 + 유효성 검증.
 */
import type { AgentRunner } from "../../agent/services/agent-runner.js";
import type { AgentExecutionResult } from "../../agent/services/execution-types.js";
import {
  type BizItem,
  DEFAULT_WEIGHTS,
  CLASSIFICATION_SYSTEM_PROMPT,
  buildClassificationPrompt,
} from "./item-classification-prompts.js";

export type { BizItem } from "./item-classification-prompts.js";

const VALID_TYPES = ["type_a", "type_b", "type_c"] as const;
type ItemType = (typeof VALID_TYPES)[number];

export interface ClassificationResult {
  itemType: ItemType;
  confidence: number;
  turnAnswers: {
    turn1: string;
    turn2: string;
    turn3: string;
  };
  analysisWeights: Record<string, number>;
  reasoning: string;
}

export class ItemClassifier {
  constructor(
    private runner: AgentRunner,
    private db: D1Database,
  ) {}

  async classify(item: BizItem, context?: string): Promise<ClassificationResult> {
    const prompt = buildClassificationPrompt(item, context);

    const result: AgentExecutionResult = await this.runner.execute({
      taskId: `classify-${item.id}`,
      agentId: "item-classifier",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: CLASSIFICATION_SYSTEM_PROMPT,
      },
      constraints: [],
    });

    if (result.status === "failed") {
      throw new ClassificationError("LLM execution failed", "LLM_EXECUTION_FAILED");
    }

    const rawText = result.output.analysis ?? "";
    const parsed = this.parseResponse(rawText);
    return parsed;
  }

  private parseResponse(rawText: string): ClassificationResult {
    // Extract JSON from possible markdown code blocks
    let jsonStr = rawText.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!.trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new ClassificationError(
        `Failed to parse LLM response as JSON: ${rawText.slice(0, 200)}`,
        "LLM_PARSE_ERROR",
      );
    }

    // Validate type
    const itemType = parsed.type as string;
    if (!VALID_TYPES.includes(itemType as ItemType)) {
      throw new ClassificationError(
        `Invalid item type: ${itemType}. Expected one of: ${VALID_TYPES.join(", ")}`,
        "LLM_PARSE_ERROR",
      );
    }

    // Validate confidence
    const confidence = Number(parsed.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new ClassificationError(
        `Invalid confidence: ${parsed.confidence}. Expected 0.0~1.0`,
        "LLM_PARSE_ERROR",
      );
    }

    // Use LLM-provided weights or fall back to defaults
    const llmWeights = parsed.analysisWeights as Record<string, number> | undefined;
    const analysisWeights = this.validateWeights(llmWeights, itemType as ItemType);

    return {
      itemType: itemType as ItemType,
      confidence,
      turnAnswers: {
        turn1: String(parsed.turn1Answer ?? ""),
        turn2: String(parsed.turn2Answer ?? ""),
        turn3: String(parsed.turn3Answer ?? ""),
      },
      analysisWeights,
      reasoning: String(parsed.reasoning ?? ""),
    };
  }

  private validateWeights(
    llmWeights: Record<string, number> | undefined,
    itemType: ItemType,
  ): Record<string, number> {
    const defaults = DEFAULT_WEIGHTS[itemType];
    if (!defaults) return llmWeights ?? {};

    if (!llmWeights || typeof llmWeights !== "object") {
      return { ...defaults };
    }

    // Merge: use LLM values within 0~3 range, fallback to defaults
    const result: Record<string, number> = {};
    for (const key of Object.keys(defaults)) {
      const val = llmWeights[key];
      if (typeof val === "number" && val >= 0 && val <= 3) {
        result[key] = val;
      } else {
        result[key] = defaults[key]!;
      }
    }
    return result;
  }
}

export class ClassificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ClassificationError";
  }
}
