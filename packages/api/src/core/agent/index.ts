// core/agent — Agent module (Phase 20-A: F397, Sprint 184)
// F575: agentRoute/orchestrationRoute/streamingRoute/capturedEngineRoute/derivedEngineRoute/skillRegistryRoute/skillMetricsRoute → fx-agent (Phase 46)
// 8 routes (F571 Walking Skeleton) remain for backward compat until api cleanup sprint
export { agentAdaptersRoute } from "./routes/agent-adapters.js";
export { agentDefinitionRoute } from "./routes/agent-definition.js";
export { executionEventsRoute } from "./routes/execution-events.js";
export { taskStateRoute } from "./routes/task-state.js";
export { commandRegistryRoute } from "./routes/command-registry.js";
export { contextPassthroughRoute } from "./routes/context-passthrough.js";
export { workflowRoute } from "./routes/workflow.js";

// F528: L3 Orchestration
export * from "./orchestration/index.js";

// F529: L1 Streaming
export * from "./streaming/index.js";

// F530: L4 Meta Layer
export { metaRoute } from "./routes/meta.js";
