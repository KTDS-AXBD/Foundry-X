/**
 * Sprint 52: 5시작점 분류 서비스 (F182)
 * BDP-002 §4 기반 — LLM으로 사업 아이템의 시작점을 분류
 */

import type { AgentRunner } from "../../agent/services/agent-runner.js";
import type { AgentExecutionResult } from "../../agent/services/execution-types.js";
import {
  STARTING_POINT_SYSTEM_PROMPT,
  buildStartingPointPrompt,
} from "./starting-point-prompts.js";
import { STARTING_POINTS, type StartingPointType } from "./analysis-paths.js";

const CONFIDENCE_THRESHOLD = 0.6;

export interface StartingPointClassificationResult {
  startingPoint: StartingPointType;
  confidence: number;
  reasoning: string;
  needsConfirmation: boolean;
}

export class StartingPointClassifier {
  constructor(private runner: AgentRunner) {}

  async classify(
    item: { title: string; description: string | null; source: string },
    context?: string,
  ): Promise<StartingPointClassificationResult> {
    const prompt = buildStartingPointPrompt(item, context);

    const result: AgentExecutionResult = await this.runner.execute({
      taskId: `sp-classify-${Date.now()}`,
      agentId: "starting-point-classifier",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: STARTING_POINT_SYSTEM_PROMPT,
      },
      constraints: [],
    });

    if (result.status === "failed") {
      throw new StartingPointError("LLM execution failed", "LLM_EXECUTION_FAILED");
    }

    const rawText = result.output.analysis ?? "";
    return this.parseResponse(rawText);
  }

  private parseResponse(rawText: string): StartingPointClassificationResult {
    let jsonStr = rawText.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]!.trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new StartingPointError(
        `Failed to parse LLM response: ${rawText.slice(0, 200)}`,
        "LLM_PARSE_ERROR",
      );
    }

    const sp = parsed.startingPoint as string;
    if (!STARTING_POINTS.includes(sp as StartingPointType)) {
      throw new StartingPointError(
        `Invalid starting point: ${sp}. Expected: ${STARTING_POINTS.join(", ")}`,
        "LLM_PARSE_ERROR",
      );
    }

    const confidence = Number(parsed.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new StartingPointError(
        `Invalid confidence: ${parsed.confidence}`,
        "LLM_PARSE_ERROR",
      );
    }

    return {
      startingPoint: sp as StartingPointType,
      confidence,
      reasoning: String(parsed.reasoning ?? ""),
      needsConfirmation: confidence < CONFIDENCE_THRESHOLD,
    };
  }
}

export class StartingPointError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "StartingPointError";
  }
}
