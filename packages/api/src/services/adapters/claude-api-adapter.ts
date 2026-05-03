// ─── F336: Claude API Runner → AgentAdapter (Sprint 151) ───

import type { AgentAdapter } from "@foundry-x/shared";
import { AgentAdapterFactory } from "../../agent/services/agent-adapter-factory.js";
import { ClaudeApiRunner } from "../../agent/services/claude-api-runner.js";

export function createClaudeApiAdapter(
  apiKey: string,
  model?: string,
): AgentAdapter {
  const runner = new ClaudeApiRunner(apiKey, model);
  return AgentAdapterFactory.wrapRunner(
    runner,
    "claude-api",
    "generator",
    "code-generation",
  );
}
