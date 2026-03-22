import type { ModelQualityResponse, AgentModelMatrixResponse } from "@foundry-x/shared";

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonAuthHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...getAuthHeaders() };
}

export async function fetchApi<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers: getAuthHeaders() });

  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function postApi<T>(path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: body !== undefined ? jsonAuthHeaders() : { ...getAuthHeaders() },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function deleteApi(path: string): Promise<void> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "DELETE", headers: getAuthHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
}

export async function patchApi<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function putApi<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ─── Spec Types ───

export interface SpecConflict {
  type: "direct" | "dependency" | "priority" | "scope";
  severity: "critical" | "warning" | "info";
  existingSpec: { id: string; title: string; field: string; value: string };
  newSpec: { field: string; value: string };
  description: string;
  suggestion?: string;
}

export interface SpecGenerateResult {
  spec: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
    priority: string;
    estimatedEffort: string;
    category: string;
  };
  model: string;
  confidence: number;
  markdown: string;
  conflicts: SpecConflict[];
}

// ─── Agent Execution Types ───

// F60: Generative UI types
export type SectionType = "text" | "code" | "diff" | "chart" | "diagram" | "table" | "timeline";

export interface UISection {
  type: SectionType;
  title: string;
  data: unknown;
  interactive?: boolean;
}

export interface UIAction {
  type: "approve" | "reject" | "edit" | "expand";
  label: string;
  targetSection?: number;
}

export interface UIHint {
  layout: "card" | "tabs" | "accordion" | "flow" | "iframe";
  sections: UISection[];
  html?: string;
  actions?: UIAction[];
}

export interface AgentExecutionResult {
  status: "success" | "partial" | "failed";
  output: {
    analysis?: string;
    generatedCode?: Array<{ path: string; content: string; action: "create" | "modify" }>;
    reviewComments?: Array<{ file: string; line: number; comment: string; severity: "error" | "warning" | "info" }>;
    uiHint?: UIHint;
  };
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface AgentRunnerInfo {
  type: "claude-api" | "mcp" | "mock";
  available: boolean;
  model?: string;
  description: string;
}

export async function generateSpec(
  text: string,
  context?: string,
): Promise<SpecGenerateResult> {
  return postApi<SpecGenerateResult>("/spec/generate", { text, context });
}

export async function executeAgentTask(
  agentId: string,
  taskType: string,
  context: {
    repoUrl?: string;
    branch?: string;
    targetFiles?: string[];
    instructions?: string;
  },
): Promise<AgentExecutionResult> {
  return postApi<AgentExecutionResult>(`/agents/${agentId}/execute`, {
    taskType,
    context: {
      repoUrl: context.repoUrl ?? "https://github.com/KTDS-AXBD/Foundry-X",
      branch: context.branch ?? "master",
      ...context,
    },
  });
}

// ─── MCP Server Types (F61) ───

export interface McpServerInfo {
  id: string;
  name: string;
  serverUrl: string;
  transportType: "sse" | "http";
  status: "active" | "inactive" | "error";
  lastConnectedAt: string | null;
  errorMessage: string | null;
  toolCount: number;
  createdAt: string;
}

export interface McpTestResult {
  status: "connected" | "error";
  tools?: Array<{ name: string; description?: string }>;
  toolCount?: number;
  error?: string;
}

export async function listMcpServers(): Promise<McpServerInfo[]> {
  return fetchApi<McpServerInfo[]>("/mcp/servers");
}

export async function createMcpServer(params: {
  name: string;
  serverUrl: string;
  transportType: "sse" | "http";
  apiKey?: string;
}): Promise<McpServerInfo> {
  return postApi<McpServerInfo>("/mcp/servers", params);
}

export async function deleteMcpServer(id: string): Promise<void> {
  return deleteApi(`/mcp/servers/${id}`);
}

export async function testMcpServer(id: string): Promise<McpTestResult> {
  return postApi<McpTestResult>(`/mcp/servers/${id}/test`);
}

export async function getMcpServerTools(
  id: string,
): Promise<{ tools: Array<{ name: string; description?: string }>; cached: boolean }> {
  return fetchApi(`/mcp/servers/${id}/tools`);
}

// ─── MCP Prompts & Sampling (F64) ───

export async function listMcpPrompts(
  serverId: string,
): Promise<{
  prompts: Array<{
    name: string;
    description?: string;
    arguments?: Array<{ name: string; description?: string; required?: boolean }>;
  }>;
}> {
  return fetchApi(`/mcp/servers/${serverId}/prompts`);
}

export async function executeMcpPrompt(
  serverId: string,
  name: string,
  args?: Record<string, string>,
): Promise<{
  messages: Array<{
    role: "user" | "assistant";
    content:
      | { type: "text"; text: string }
      | { type: "resource"; resource: { uri: string; text: string; mimeType?: string } };
  }>;
}> {
  return postApi(`/mcp/servers/${serverId}/prompts/${encodeURIComponent(name)}`, { arguments: args });
}

export async function getMcpSamplingLog(
  serverId?: string,
  limit?: number,
): Promise<{
  logs: Array<{
    id: string;
    serverId: string;
    model: string;
    maxTokens: number;
    tokensUsed: number | null;
    durationMs: number | null;
    status: string;
    createdAt: string;
  }>;
}> {
  const params = new URLSearchParams();
  if (serverId) params.set("serverId", serverId);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return fetchApi(`/mcp/sampling/log${qs ? `?${qs}` : ""}`);
}

// ─── Agent PR Pipeline (F65) ───

export interface AgentPrResult {
  id: string;
  prNumber: number | null;
  prUrl: string | null;
  branch: string;
  status: string;
  reviewResult?: {
    decision: string;
    summary: string;
    comments: Array<{ file: string; line: number; comment: string; severity: string }>;
    sddScore: number;
    qualityScore: number;
    securityIssues: string[];
  };
  merged: boolean;
}

export async function createAgentPr(
  agentId: string,
  taskId: string,
  config?: Record<string, unknown>,
): Promise<AgentPrResult> {
  return postApi<AgentPrResult>("/agents/pr", { agentId, taskId, config });
}

export async function getAgentPr(id: string): Promise<Record<string, unknown>> {
  return fetchApi(`/agents/pr/${id}`);
}

export async function reviewAgentPr(id: string): Promise<Record<string, unknown>> {
  return postApi<Record<string, unknown>>(`/agents/pr/${id}/review`);
}

export async function mergeAgentPr(
  id: string,
): Promise<{ merged: boolean; needsHuman: boolean; reason?: string }> {
  return postApi(`/agents/pr/${id}/merge`);
}

// ─── MCP Resources (F67) ───

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export async function listMcpResources(
  serverId: string,
): Promise<{ resources: McpResource[] }> {
  return fetchApi(`/mcp/servers/${serverId}/resources`);
}

export async function listMcpResourceTemplates(
  serverId: string,
): Promise<{ resourceTemplates: McpResourceTemplate[] }> {
  return fetchApi(`/mcp/servers/${serverId}/resources/templates`);
}

export async function readMcpResource(
  serverId: string,
  uri: string,
): Promise<{ contents: McpResourceContent[] }> {
  return postApi(`/mcp/servers/${serverId}/resources/read`, { uri });
}

export async function subscribeMcpResource(
  serverId: string,
  uri: string,
): Promise<void> {
  await postApi(`/mcp/servers/${serverId}/resources/subscribe`, { uri });
}

// ─── Merge Queue + Parallel Execution (F68) ───

export interface MergeQueueEntry {
  id: string;
  prRecordId: string;
  prNumber: number;
  agentId: string;
  priority: number;
  position: number;
  modifiedFiles: string[];
  status: string;
  conflictsWith: string[];
  rebaseAttempted: boolean;
  rebaseSucceeded: boolean;
  createdAt: string;
  mergedAt: string | null;
}

export interface ConflictReport {
  conflicting: Array<{ entryA: string; entryB: string; files: string[] }>;
  suggestedOrder: string[];
  autoResolvable: boolean;
}

export async function getMergeQueue(): Promise<{
  entries: MergeQueueEntry[];
  conflicts: ConflictReport;
}> {
  return fetchApi("/agents/queue");
}

export async function processQueueNext(): Promise<{
  merged: boolean;
  entryId: string;
  rebaseAttempted?: boolean;
  conflictResolved?: boolean;
}> {
  return postApi("/agents/queue/process");
}

export async function updateQueuePriority(
  entryId: string,
  priority: number,
): Promise<void> {
  await patchApi(`/agents/queue/${entryId}/priority`, { priority });
}

export async function executeParallel(
  tasks: Array<{
    agentId: string;
    taskType: string;
    context: { repoUrl?: string; branch?: string; targetFiles?: string[]; instructions?: string };
  }>,
  createPrs: boolean = false,
): Promise<Record<string, unknown>> {
  return postApi("/agents/parallel", { tasks, createPrs });
}

export async function getParallelExecution(
  id: string,
): Promise<Record<string, unknown>> {
  return fetchApi(`/agents/parallel/${id}`);
}

// ─── Agent Plan (F75/F76) ───

export interface AgentPlanResponse {
  id: string;
  taskId: string;
  agentId: string;
  codebaseAnalysis: string;
  proposedSteps: Array<{ description: string; type: string; targetFile?: string; estimatedLines?: number }>;
  estimatedFiles: number;
  risks: string[];
  estimatedTokens: number;
  status: string;
  humanFeedback?: string;
  createdAt: string;
}

export async function createPlan(
  agentId: string,
  taskType: string,
  context: {
    repoUrl?: string;
    branch?: string;
    targetFiles?: string[];
    instructions?: string;
  },
): Promise<AgentPlanResponse> {
  return postApi<AgentPlanResponse>("/agents/plan", {
    agentId,
    taskType,
    context: {
      repoUrl: context.repoUrl ?? "https://github.com/KTDS-AXBD/Foundry-X",
      branch: context.branch ?? "master",
      ...context,
    },
  });
}

export async function approvePlan(planId: string): Promise<AgentPlanResponse> {
  return postApi<AgentPlanResponse>(`/agents/plan/${planId}/approve`);
}

export async function rejectPlan(planId: string, reason: string): Promise<AgentPlanResponse> {
  return postApi<AgentPlanResponse>(`/agents/plan/${planId}/reject`, { reason });
}

// ─── Agent Inbox (F76) ───

export interface InboxMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: string;
  subject: string;
  payload: Record<string, unknown>;
  acknowledged: boolean;
  parentMessageId?: string;
  createdAt: string;
  acknowledgedAt?: string;
}

export async function listInboxMessages(
  agentId: string,
  unreadOnly?: boolean,
  limit?: number,
): Promise<{ messages: InboxMessage[] }> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unreadOnly", "true");
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return fetchApi(`/agents/inbox/${agentId}${qs ? `?${qs}` : ""}`);
}

export async function sendInboxMessage(
  fromAgentId: string,
  toAgentId: string,
  type: string,
  subject: string,
  payload: Record<string, unknown>,
  parentMessageId?: string,
): Promise<InboxMessage> {
  return postApi<InboxMessage>("/agents/inbox/send", { fromAgentId, toAgentId, type, subject, payload, parentMessageId });
}

export async function acknowledgeMessage(messageId: string): Promise<void> {
  await postApi(`/agents/inbox/${messageId}/ack`);
}

// ─── Sprint 17 F81: Inbox Thread ───

export async function getInboxThread(
  parentMessageId: string,
  limit?: number,
): Promise<{ thread: InboxMessage[]; total: number; parentMessageId: string }> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return fetchApi(`/agents/inbox/${parentMessageId}/thread${qs ? `?${qs}` : ""}`);
}

export async function ackThread(parentMessageId: string): Promise<{ acknowledged: boolean; count: number }> {
  return postApi(`/agents/inbox/${parentMessageId}/ack-thread`);
}

// ─── Conflict Resolution ───

export async function resolveConflict(
  conflictId: string,
  resolution: "accept" | "reject" | "modify",
  modifiedValue?: string,
): Promise<void> {
  await postApi("/spec/conflicts/resolve", { conflictId, resolution, modifiedValue });
}

// ─── Org API (F92) ───

type OrgRole = "owner" | "admin" | "member" | "viewer";

export interface OrgResponse {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMemberResponse {
  orgId: string;
  userId: string;
  email: string;
  name: string;
  role: OrgRole;
  joinedAt: string;
}

export interface OrgInvitationResponse {
  id: string;
  orgId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  invitedBy: string;
}

export async function getMyOrgs(): Promise<OrgResponse[]> {
  return fetchApi<OrgResponse[]>("/orgs");
}

export async function createOrg(params: { name: string; slug?: string }): Promise<OrgResponse> {
  return postApi<OrgResponse>("/orgs", params);
}

export async function getOrg(orgId: string): Promise<OrgResponse> {
  return fetchApi<OrgResponse>(`/orgs/${orgId}`);
}

export async function updateOrg(orgId: string, patch: { name?: string }): Promise<OrgResponse> {
  return patchApi<OrgResponse>(`/orgs/${orgId}`, patch);
}

export async function switchOrg(orgId: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  return postApi("/auth/switch-org", { orgId });
}

export async function getOrgMembers(orgId: string): Promise<OrgMemberResponse[]> {
  return fetchApi<OrgMemberResponse[]>(`/orgs/${orgId}/members`);
}

export async function updateMemberRole(orgId: string, userId: string, role: string): Promise<void> {
  await patchApi(`/orgs/${orgId}/members/${userId}`, { role });
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  return deleteApi(`/orgs/${orgId}/members/${userId}`);
}

export async function createInvitation(orgId: string, data: { email: string; role: string }): Promise<OrgInvitationResponse> {
  return postApi<OrgInvitationResponse>(`/orgs/${orgId}/invitations`, data);
}

export async function getOrgInvitations(orgId: string): Promise<OrgInvitationResponse[]> {
  return fetchApi<OrgInvitationResponse[]>(`/orgs/${orgId}/invitations`);
}

export async function acceptInvitation(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  return postApi(`/auth/invitations/${token}/accept`);
}

export async function deleteInvitation(orgId: string, invitationId: string): Promise<void> {
  return deleteApi(`/orgs/${orgId}/invitations/${invitationId}`);
}

// ─── Sprint 24: Project Overview (F98) ───

export interface ProjectInfo {
  id: string;
  name: string;
  healthScore: number;
  grade: string;
  activeAgents: number;
  openTasks: number;
  recentPrCount: number;
  lastActivity: string;
}

export interface AgentActivityStats {
  tasksCompleted: number;
  prsCreated: number;
  messagesSent: number;
}

export interface ProjectsOverview {
  totalProjects: number;
  overallHealth: number;
  projects: ProjectInfo[];
  agentActivity: {
    last24h: AgentActivityStats;
    last7d: AgentActivityStats;
  };
}

export async function getProjectsOverview(orgId: string): Promise<ProjectsOverview> {
  return fetchApi<ProjectsOverview>(`/orgs/${orgId}/projects/overview`);
}

// ─── Sprint 24: Monitoring (F100) ───

export interface MonitoringStats {
  requests: number;
  errorRate: number;
  avgResponseMs: number;
  uptime: number;
  period: string;
}

export async function getMonitoringStats(orgId: string): Promise<MonitoringStats> {
  return fetchApi<MonitoringStats>(`/orgs/${orgId}/monitoring/stats`);
}

// ─── Sprint 24: Workflow Engine (F101) ───

export interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition" | "end";
  label: string;
  position: { x: number; y: number };
  data: {
    actionType?: "run_agent" | "create_pr" | "send_notification" | "run_analysis" | "wait_approval";
    config?: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  definition: WorkflowDefinition;
  templateId: string | null;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  currentStep: string | null;
  result: unknown;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export async function getWorkflows(orgId: string): Promise<Workflow[]> {
  return fetchApi<Workflow[]>(`/orgs/${orgId}/workflows`);
}

export async function createWorkflow(
  orgId: string,
  data: { name: string; description?: string; definition: WorkflowDefinition; template_id?: string },
): Promise<Workflow> {
  return postApi<Workflow>(`/orgs/${orgId}/workflows`, data);
}

export async function getWorkflow(orgId: string, id: string): Promise<Workflow> {
  return fetchApi<Workflow>(`/orgs/${orgId}/workflows/${id}`);
}

export async function updateWorkflow(
  orgId: string,
  id: string,
  data: { name?: string; description?: string; definition?: WorkflowDefinition; enabled?: boolean },
): Promise<Workflow> {
  return putApi<Workflow>(`/orgs/${orgId}/workflows/${id}`, data);
}

export async function deleteWorkflow(orgId: string, id: string): Promise<void> {
  return deleteApi(`/orgs/${orgId}/workflows/${id}`);
}

export async function executeWorkflow(orgId: string, id: string): Promise<WorkflowExecution> {
  return postApi<WorkflowExecution>(`/orgs/${orgId}/workflows/${id}/execute`);
}

// ─── Sprint 24: Jira Integration (F99) ───

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export interface JiraConfig {
  api_url: string;
  email: string;
  api_token: string;
  project_key?: string;
}

export async function getJiraProjects(orgId: string): Promise<JiraProject[]> {
  return fetchApi<JiraProject[]>(`/orgs/${orgId}/jira/projects`);
}

export async function updateJiraConfig(orgId: string, config: JiraConfig): Promise<void> {
  await putApi(`/orgs/${orgId}/jira/config`, config);
}

// ─── Sprint 26: SSO & Services (F106) ───

export async function fetchHubToken(orgId: string): Promise<{ hubToken: string; expiresIn: number }> {
  return postApi("/auth/sso/token", { orgId });
}

export interface OrgService {
  orgId: string;
  serviceId: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
}

export async function getOrgServices(orgId: string): Promise<OrgService[]> {
  return fetchApi<OrgService[]>(`/orgs/${orgId}/services`);
}

export async function updateOrgService(
  orgId: string,
  serviceId: string,
  enabled: boolean,
): Promise<OrgService> {
  return putApi<OrgService>(`/orgs/${orgId}/services/${serviceId}`, { enabled });
}

// ─── Sprint 27: KPI Analytics (F100) ───

export interface KpiSummary {
  wau: number;
  agentCompletionRate: number;
  sddIntegrityRate: number;
  totalEvents: number;
  breakdown: Record<string, number>;
  period: { from: string; to: string };
}

export interface KpiTrendPoint {
  date: string;
  pageViews: number;
  apiCalls: number;
  agentTasks: number;
}

export interface KpiEventItem {
  id: string;
  tenantId: string;
  eventType: string;
  userId: string | null;
  agentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function trackKpiEvent(
  eventType: string,
  metadata?: Record<string, unknown>,
): Promise<{ id: string; recorded: boolean }> {
  return postApi("/kpi/track", { eventType, metadata });
}

export async function getKpiSummary(days?: number): Promise<KpiSummary> {
  const params = new URLSearchParams();
  if (days) params.set("days", String(days));
  const qs = params.toString();
  return fetchApi(`/kpi/summary${qs ? `?${qs}` : ""}`);
}

export async function getKpiTrends(
  days?: number,
  groupBy?: "day" | "week",
): Promise<{ trends: KpiTrendPoint[] }> {
  const params = new URLSearchParams();
  if (days) params.set("days", String(days));
  if (groupBy) params.set("groupBy", groupBy);
  const qs = params.toString();
  return fetchApi(`/kpi/trends${qs ? `?${qs}` : ""}`);
}

export async function getKpiEvents(
  type?: string,
  limit?: number,
  offset?: number,
): Promise<{ events: KpiEventItem[]; total: number }> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString();
  return fetchApi(`/kpi/events${qs ? `?${qs}` : ""}`);
}

// ─── Onboarding Types (F114) ───

export interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
}

export interface OnboardingProgress {
  userId: string;
  completedSteps: string[];
  totalSteps: number;
  progressPercent: number;
  steps: OnboardingStep[];
}

export interface FeedbackSummary {
  averageNps: number;
  totalResponses: number;
  recentFeedback: { npsScore: number; comment: string | null; createdAt: string }[];
}

// ─── Onboarding API Functions (F114) ───

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  return fetchApi<OnboardingProgress>("/onboarding/progress");
}

export async function completeOnboardingStep(stepId: string): Promise<{
  success: boolean;
  stepId: string;
  progressPercent: number;
  allComplete: boolean;
}> {
  return patchApi("/onboarding/progress", { stepId, completed: true });
}

export async function submitFeedback(data: { npsScore: number; comment?: string }): Promise<{
  success: boolean;
  id: string;
  npsScore: number;
}> {
  return postApi("/feedback", data);
}

export async function getFeedbackSummary(): Promise<FeedbackSummary> {
  return fetchApi<FeedbackSummary>("/feedback/summary");
}

// ─── Sprint 30: Phase 4 KPI (F125) ───

export interface Phase4Kpi {
  wauTrend: { week: string; wau: number }[];
  agentCompletionRate: number;
  serviceIntegrationRate: number;
  period: { from: string; to: string };
}

export async function fetchPhase4Kpi(days = 28): Promise<Phase4Kpi> {
  return fetchApi<Phase4Kpi>(`/kpi/phase4?days=${days}`);
}

// ─── Sprint 43: Model Quality API (F143 UI) ───

export async function getModelQuality(
  days = 30,
  projectId?: string,
): Promise<ModelQualityResponse> {
  const params = new URLSearchParams({ days: String(days) });
  if (projectId) params.set("projectId", projectId);
  return fetchApi<ModelQualityResponse>(`/tokens/model-quality?${params}`);
}

export async function getAgentModelMatrix(
  days = 30,
  projectId?: string,
): Promise<AgentModelMatrixResponse> {
  const params = new URLSearchParams({ days: String(days) });
  if (projectId) params.set("projectId", projectId);
  return fetchApi<AgentModelMatrixResponse>(`/tokens/agent-model-matrix?${params}`);
}

// ─── Sprint 48: Onboarding Team Summary (F170) ───

export interface TeamMemberProgress {
  userId: string;
  name: string;
  stepsCompleted: number;
  totalSteps: number;
  progressPercent: number;
  lastActivity: string | null;
}

export interface OnboardingTeamSummary {
  totalMembers: number;
  completedMembers: number;
  averageProgress: number;
  members: TeamMemberProgress[];
}

export async function getOnboardingTeamSummary(): Promise<OnboardingTeamSummary> {
  return fetchApi<OnboardingTeamSummary>("/onboarding/team-summary");
}
