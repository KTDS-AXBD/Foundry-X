// core/agent — Agent module (Phase 20-A: F397, Sprint 184)
// Agent/Orchestration: Agent, Workflows, Execution, Skills, MCP
// 13 routes
export { agentRoute } from "./routes/agent.js";
export { agentAdaptersRoute } from "./routes/agent-adapters.js";
export { agentDefinitionRoute } from "./routes/agent-definition.js";
export { orchestrationRoute } from "./routes/orchestration.js";
export { executionEventsRoute } from "./routes/execution-events.js";
export { taskStateRoute } from "./routes/task-state.js";
export { commandRegistryRoute } from "./routes/command-registry.js";
export { contextPassthroughRoute } from "./routes/context-passthrough.js";
export { workflowRoute } from "./routes/workflow.js";
export { capturedEngineRoute } from "./routes/captured-engine.js";
export { derivedEngineRoute } from "./routes/derived-engine.js";
export { skillRegistryRoute } from "./routes/skill-registry.js";
export { skillMetricsRoute } from "./routes/skill-metrics.js";

// F528: L3 Orchestration
export * from "./orchestration/index.js";
