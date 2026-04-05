// ─── F336: EvaluatorOptimizer → AgentAdapter (Sprint 151) ───

import type { AgentAdapter } from "@foundry-x/shared";
import { AgentAdapterFactory } from "../agent-adapter-factory.js";
import type { EvaluatorOptimizerConfig } from "../evaluator-optimizer.js";
import { EvaluatorOptimizer } from "../evaluator-optimizer.js";

export function createEvaluatorOptimizerAdapter(
  config: EvaluatorOptimizerConfig,
): AgentAdapter {
  const evaluator = new EvaluatorOptimizer(config);
  return AgentAdapterFactory.wrapEvaluatorOptimizer(evaluator);
}
