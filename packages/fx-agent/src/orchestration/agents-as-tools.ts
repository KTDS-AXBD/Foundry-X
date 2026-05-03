// ─── F528: F-L3-4 Agents-as-Tools ───
import { z } from "zod";
import { defineTool } from "../runtime/define-tool.js";
import type { ToolDefinition } from "../runtime/define-tool.js";
import type { AgentSpec, RuntimeContext } from "@foundry-x/shared";

export interface AgentAsToolOptions {
  preserve_context?: boolean;
  description?: string;
}

/** AgentRuntime의 최소 인터페이스 (순환 의존 방지) */
interface AgentRuntimeLike {
  spec: AgentSpec;
  run(spec: AgentSpec, input: string, ctx: RuntimeContext): Promise<{ output: string }>;
}

/**
 * Agent를 Tool로 변환한다.
 * 반환된 ToolDefinition은 ToolRegistry에 등록하거나 다른 에이전트에 주입 가능.
 */
export function agentAsTool(
  runtime: AgentRuntimeLike,
  opts: AgentAsToolOptions = {},
): ToolDefinition<{ message: string }, string> {
  const { spec } = runtime;
  const toolName = `agent_${spec.name}`;
  const description = opts.description ?? spec.systemPrompt.slice(0, 120);

  return defineTool({
    name: toolName,
    description,
    inputSchema: z.object({ message: z.string().describe("Task message for the agent") }),
    category: "agent",
    execute: async ({ message }, toolCtx) => {
      const runtimeCtx: RuntimeContext = {
        agentId: spec.name,
        sessionId: toolCtx.sessionId,
        apiKey: (toolCtx as unknown as { apiKey?: string }).apiKey ?? "",
      };
      const result = await runtime.run(spec, message, runtimeCtx);
      return result.output;
    },
  });
}
