// ─── F527: F-L2-3 AgentRuntime + F-L2-4 Hooks (Sprint 280) ───

import type {
  AgentSpec,
  RuntimeContext,
  RuntimeResult,
  StopReason,
  AnthropicMessage,
  AnthropicContent,
  AnthropicToolDef,
  ModelCallContext,
  ModelCallResult,
  ToolCallContext,
  ToolCallResult,
  LLMTokenUsage,
} from "@foundry-x/shared";
import type { ToolRegistry } from "./tool-registry.js";
import type { TokenTracker } from "./token-tracker.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface AnthropicResponse {
  content: AnthropicContent[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
}

/**
 * AgentRuntime — 추론→도구→결과→반복 루프 엔진.
 *
 * Strands SDK의 Agent Loop 패턴:
 * 1. Claude 호출 (beforeModel hook)
 * 2. 응답 처리 (afterModel hook)
 * 3. tool_use → 도구 실행 (beforeTool / afterTool hook)
 * 4. end_turn / max_rounds / max_tokens → 종료
 */
export class AgentRuntime {
  constructor(
    private registry: ToolRegistry,
    private tracker: TokenTracker,
  ) {}

  async run(spec: AgentSpec, input: string, ctx: RuntimeContext): Promise<RuntimeResult> {
    const maxRounds = spec.constraints?.maxRounds ?? 10;
    const maxTokens = spec.constraints?.maxTokens ?? 4096;
    const hooks = ctx.hooks ?? {};

    const invocationCtx = { agentId: ctx.agentId, sessionId: ctx.sessionId, spec, input };

    await hooks.beforeInvocation?.(invocationCtx);

    const messages: AnthropicMessage[] = [{ role: "user", content: input }];
    const toolDefs: AnthropicToolDef[] = spec.tools.length > 0
      ? this.registry.toAnthropicTools(spec.tools)
      : [];

    let lastOutput = "";
    let lastStopReason: StopReason = "end_turn";
    let totalUsage: LLMTokenUsage = { inputTokens: 0, outputTokens: 0 };
    let rounds = 0;

    while (rounds < maxRounds) {
      rounds++;

      let modelCtx: ModelCallContext = {
        messages,
        systemPrompt: spec.systemPrompt,
        model: spec.model,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      };

      // beforeModel hook
      const hookResult = await hooks.beforeModel?.(modelCtx);
      if (hookResult) modelCtx = hookResult;

      // Claude API 호출
      const modelResult = await this.callClaude(modelCtx, ctx.apiKey, maxTokens);

      // 토큰 추적
      this.tracker.track(ctx.agentId, modelResult.usage);
      totalUsage = {
        inputTokens: totalUsage.inputTokens + modelResult.usage.inputTokens,
        outputTokens: totalUsage.outputTokens + modelResult.usage.outputTokens,
      };

      // afterModel hook
      await hooks.afterModel?.(modelCtx, modelResult);

      // 텍스트 출력 추출
      const textContent = modelResult.content
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("");
      if (textContent) lastOutput = textContent;

      // 종료 조건 확인
      const stopReason = modelResult.stopReason as StopReason;

      if (stopReason === "end_turn" || stopReason === "max_tokens") {
        lastStopReason = stopReason;
        // assistant 응답 추가
        messages.push({ role: "assistant", content: modelResult.content });
        break;
      }

      if (stopReason === "tool_use") {
        // assistant 응답 추가 (tool_use 포함)
        messages.push({ role: "assistant", content: modelResult.content });

        // 도구 호출 처리
        const toolUseItems = modelResult.content.filter((c) => c.type === "tool_use");
        const toolResults: AnthropicContent[] = [];

        for (const toolUse of toolUseItems) {
          if (!toolUse.name || !toolUse.id) continue;

          let toolCtx: ToolCallContext = {
            toolName: toolUse.name,
            toolInput: toolUse.input,
            toolUseId: toolUse.id,
          };

          // beforeTool hook — 'cancel' 반환 시 도구 건너뜀
          const beforeResult = await hooks.beforeTool?.(toolCtx);
          if (beforeResult === "cancel") {
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: "[cancelled by hook]",
              is_error: false,
            });
            continue;
          }
          if (beforeResult && typeof beforeResult === "object") {
            toolCtx = beforeResult;
          }

          // 도구 실행
          let toolResult: ToolCallResult;
          const toolDef = this.registry.get(toolCtx.toolName);

          if (!toolDef) {
            toolResult = { content: `Tool '${toolCtx.toolName}' not found in registry`, isError: true };
          } else {
            try {
              const output = await toolDef.execute(toolCtx.toolInput, {
                agentId: ctx.agentId,
                sessionId: ctx.sessionId,
                db: ctx.db,
              });
              toolResult = {
                content: typeof output === "string" ? output : JSON.stringify(output),
                isError: false,
              };
            } catch (err) {
              toolResult = {
                content: err instanceof Error ? err.message : String(err),
                isError: true,
              };
            }
          }

          // afterTool hook — 결과 override 가능
          const afterResult = await hooks.afterTool?.(toolCtx, toolResult);
          const finalResult = afterResult ?? toolResult;

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: finalResult.content,
            is_error: finalResult.isError,
          });
        }

        // tool_result를 user 메시지로 추가
        messages.push({ role: "user", content: toolResults });
        lastStopReason = "tool_use";
        continue;
      }

      // 알 수 없는 stop_reason → 종료
      lastStopReason = stopReason;
      break;
    }

    // max_rounds 도달
    if (rounds >= maxRounds && lastStopReason === "tool_use") {
      lastStopReason = "max_rounds";
    }

    const result: RuntimeResult = {
      output: lastOutput,
      stopReason: lastStopReason,
      rounds,
      tokenUsage: {
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        totalTokens: totalUsage.inputTokens + totalUsage.outputTokens,
      },
    };

    await hooks.afterInvocation?.(invocationCtx, result);

    return result;
  }

  private async callClaude(
    ctx: ModelCallContext,
    apiKey: string,
    maxTokens: number,
  ): Promise<ModelCallResult> {
    const body: Record<string, unknown> = {
      model: ctx.model,
      max_tokens: maxTokens,
      system: ctx.systemPrompt,
      messages: ctx.messages,
    };

    if (ctx.tools && ctx.tools.length > 0) {
      body.tools = ctx.tools;
    }

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as AnthropicResponse;

    return {
      content: data.content,
      stopReason: data.stop_reason,
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        cacheReadTokens: data.usage.cache_read_input_tokens,
        cacheWriteTokens: data.usage.cache_creation_input_tokens,
      },
    };
  }
}
