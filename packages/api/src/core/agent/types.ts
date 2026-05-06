// F609: cross-domain contract re-exports
// External callers must import from this file, not from internal services/

export { PromptGatewayService } from "./services/prompt-gateway.js";
export { ModelRouter } from "./services/model-router.js";
export type { AgentTaskType, AgentExecutionResult, AgentExecutionRequest } from "./services/execution-types.js";
export type { AgentRunner } from "./services/agent-runner.js";
export { createAgentRunner, createRoutedRunner } from "./services/agent-runner.js";
export { DiagnosticCollector } from "./services/diagnostic-collector.js";
export { MetaAgent } from "./services/meta-agent.js";
export { MetaApprovalService } from "./services/meta-approval.js";
export { ProposalRubric } from "./services/proposal-rubric.js";
export { GraphEngine } from "./services/graph-engine.js";
export { createDiscoveryGraph } from "./services/graphs/discovery-graph.js";
export type { GraphStageInput } from "./services/graphs/discovery-graph.js";
export { McpServerRegistry } from "./services/mcp-registry.js";
export { createTransport } from "./services/mcp-transport.js";
export { McpRunner } from "./services/mcp-runner.js";
export { McpSamplingHandler } from "./services/mcp-sampling.js";
export { McpResourcesClient } from "./services/mcp-resources.js";
export type { AgentInbox } from "./services/agent-inbox.js";
export { parseAgentDefinition, exportToYaml } from "./services/agent-definition-loader.js";
export type { MenuItem } from "./services/agent-definition-loader.js";
export type { TaskStateService } from "./services/task-state-service.js";
export type { AiReviewProvider, AiReviewResponse } from "./services/external-ai-reviewer.js";
export { ChatGptProvider, GeminiProvider, DeepSeekProvider } from "./services/external-ai-reviewer.js";
export { SkillMetricsService } from "./services/skill-metrics.js";

// F612: Pass 5 — multi-domain caller re-exports
export { AgentCollectionService } from "./services/agent-collection.js";
export { SkillPipelineRunner } from "./services/skill-pipeline-runner.js";

// F611: agent D1 API — cross-domain callers import from here
export {
  queryAllAgentSessions,
  queryDistinctAgentWorktrees,
  syncAgentSessionsData,
  countActiveSessionsByProject,
  countTasksByProjectSessions,
  countAgentsByOrg,
  countRecentAgentTasks,
  insertAgentMessage,
  updateAgentTaskHookStatus,
  insertAgentWorktree,
  cleanAgentWorktree,
  queryAgentFeedbackTopReasons,
  countAgentFeedbackPending,
  getTopAgentFeedbackReason,
  aggregateAgentFeedbackStatus,
  countAcceptedProposals,
} from "./services/agent-d1-api.js";
export type {
  AgentSessionRow,
  SyncAgentSessionsInput,
  InsertAgentMessageParams,
  UpdateAgentTaskHookStatusParams,
  InsertAgentWorktreeParams,
  FeedbackDateRangeParams,
  AgentSessionSseRow,
} from "./services/agent-d1-api.js";
export { queryRecentAgentSessions } from "./services/agent-d1-api.js";
