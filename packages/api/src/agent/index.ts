// agent — F576: moved from core/ (Sprint 323, Phase 46 Strangler 종결)
// F575+F576: all 15 routes → fx-agent. This barrel remains for internal cross-domain imports.
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
