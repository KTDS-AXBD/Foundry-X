/**
 * F148: Agent Self-Reflection — 에이전트 출력 자기 평가 및 품질 향상
 */
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "./execution-types.js";
import type { AgentRunner } from "./agent-runner.js";

export interface ReflectionResult {
  score: number;
  confidence: number;
  reasoning: string;
  suggestions: string[];
}

export interface ReflectionMetadata extends ReflectionResult {
  retryCount: number;
  history: Array<{ iteration: number; score: number; confidence: number }>;
}

export interface SelfReflectionConfig {
  threshold: number;
  maxRetries: number;
  reflectionModel?: string;
}

const SELF_REFLECTION_PROMPT = `You are evaluating your own previous output.
Assess the quality of the output on these dimensions:
- Completeness: Does it fully address the request?
- Accuracy: Is the content correct and well-reasoned?
- Relevance: Does it focus on what was asked?
- Format: Is the output well-structured and clear?

Respond with JSON only:
{
  "score": <0-100>,
  "confidence": <0-100>,
  "reasoning": "<brief explanation>",
  "suggestions": ["<improvement 1>", "<improvement 2>"]
}`;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const DEFAULT_REFLECTION: ReflectionResult = {
  score: 50,
  confidence: 30,
  reasoning: "Failed to parse reflection output",
  suggestions: [],
};

export class AgentSelfReflection {
  static readonly DEFAULT_THRESHOLD = 60;
  static readonly DEFAULT_MAX_RETRIES = 2;
  static readonly HARD_MAX_RETRIES = 3;

  private readonly threshold: number;
  private readonly maxRetries: number;

  constructor(config?: Partial<SelfReflectionConfig>) {
    this.threshold = config?.threshold ?? AgentSelfReflection.DEFAULT_THRESHOLD;
    this.maxRetries = Math.min(
      config?.maxRetries ?? AgentSelfReflection.DEFAULT_MAX_RETRIES,
      AgentSelfReflection.HARD_MAX_RETRIES,
    );
  }

  async reflect(
    runner: AgentRunner,
    originalRequest: AgentExecutionRequest,
    result: AgentExecutionResult,
  ): Promise<ReflectionResult> {
    const reflectionRequest: AgentExecutionRequest = {
      taskId: `${originalRequest.taskId}-reflection`,
      agentId: originalRequest.agentId,
      taskType: originalRequest.taskType,
      context: {
        ...originalRequest.context,
        instructions: `${SELF_REFLECTION_PROMPT}\n\nOriginal request instructions: ${originalRequest.context.instructions ?? "N/A"}\n\nOutput to evaluate:\n${result.output.analysis ?? JSON.stringify(result.output)}`,
      },
      constraints: [],
    };

    try {
      const reflectionResult = await runner.execute(reflectionRequest);
      const text = reflectionResult.output.analysis ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { ...DEFAULT_REFLECTION };

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: clampScore(parsed.score ?? 50),
        confidence: clampScore(parsed.confidence ?? 30),
        reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : DEFAULT_REFLECTION.reasoning,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch {
      return { ...DEFAULT_REFLECTION };
    }
  }

  shouldRetry(score: number): boolean {
    return score < this.threshold;
  }

  enhanceWithReflection(runner: AgentRunner): AgentRunner {
    const self = this;

    return {
      type: runner.type,

      async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
        let bestResult = await runner.execute(request);
        let bestScore = -1;
        const history: Array<{ iteration: number; score: number; confidence: number }> = [];
        let retryCount = 0;

        const reflection = await self.reflect(runner, request, bestResult);
        bestScore = reflection.score;
        history.push({ iteration: 0, score: reflection.score, confidence: reflection.confidence });

        let currentRequest = request;
        let currentResult = bestResult;
        let lastReflection = reflection;

        while (self.shouldRetry(lastReflection.score) && retryCount < self.maxRetries) {
          retryCount++;
          const suggestionsSuffix = lastReflection.suggestions.length > 0
            ? `\n\nImprovement suggestions from self-reflection:\n${lastReflection.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
            : "";

          currentRequest = {
            ...currentRequest,
            context: {
              ...currentRequest.context,
              instructions: `${currentRequest.context.instructions ?? ""}${suggestionsSuffix}`,
            },
          };

          currentResult = await runner.execute(currentRequest);
          lastReflection = await self.reflect(runner, currentRequest, currentResult);
          history.push({ iteration: retryCount, score: lastReflection.score, confidence: lastReflection.confidence });

          if (lastReflection.score > bestScore) {
            bestScore = lastReflection.score;
            bestResult = currentResult;
          }
        }

        const finalReflection = history.length > 1
          ? lastReflection
          : reflection;

        const metadata: ReflectionMetadata = {
          score: bestScore,
          confidence: finalReflection.confidence,
          reasoning: finalReflection.reasoning,
          suggestions: finalReflection.suggestions,
          retryCount,
          history,
        };

        return {
          ...bestResult,
          reflection: metadata,
        };
      },

      async isAvailable(): Promise<boolean> {
        return runner.isAvailable();
      },

      supportsTaskType(taskType: string): boolean {
        return runner.supportsTaskType(taskType);
      },
    };
  }
}
