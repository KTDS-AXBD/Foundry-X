import type { MiddlewareHandler } from "hono";
import { AgentOrchestrator } from "../services/agent-orchestrator.js";
import type { Env } from "../env.js";

export const constraintGuard: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  const agentId = c.req.header("X-Agent-Id");
  const agentAction = c.req.header("X-Agent-Action");

  // No agent headers → regular user request, pass through
  if (!agentId || !agentAction) {
    return next();
  }

  const orchestrator = new AgentOrchestrator(c.env.DB);
  const result = await orchestrator.checkConstraint(agentAction);

  // Set response headers for observability
  c.header("X-Constraint-Tier", result.tier);
  c.header("X-Constraint-Allowed", String(result.allowed));

  if (!result.allowed && result.rule.enforcementMode === "block") {
    return c.json(
      {
        error: "Constraint violation",
        tier: result.tier,
        action: agentAction,
        reason: result.reason,
      },
      403,
    );
  }

  return next();
};
