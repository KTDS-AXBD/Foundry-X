// ─── F528: L3 Orchestration — barrel export (fx-agent scope) ───
// Note: GraphEngine and createDiscoveryGraph are in packages/api/src/services/agent/ (api-only)
export { agentAsTool } from "./agents-as-tools.js";
export { ConcreteSteeringHandler } from "./steering-handler.js";
export { ConversationManager } from "./conversation-manager.js";
export { createOrchestrationLoopNode } from "./orchestration-loop-node.js";
export type { SteeringRule } from "./steering-handler.js";
export type { AgentAsToolOptions } from "./agents-as-tools.js";
export type { OrchestrationLoopNodeOptions } from "./orchestration-loop-node.js";
