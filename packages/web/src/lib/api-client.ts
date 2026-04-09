import type { ModelQualityResponse, AgentModelMatrixResponse, SkillRegistryEntry, SkillSearchResult, SkillEnrichedView } from "@foundry-x/shared";
import { refreshAccessToken, scheduleTokenRefresh } from "./stores/auth-store";

export const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** JWT exp claim으로 만료 여부 확인 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonAuthHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...getAuthHeaders() };
}

// 동시 다발 refresh 시 한 번만 실행하기 위한 공유 Promise
let pendingRefresh: Promise<boolean> | null = null;

async function ensureFreshToken(): Promise<boolean> {
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = refreshAccessToken().finally(() => { pendingRefresh = null; });
  const ok = await pendingRefresh;
  if (ok) scheduleTokenRefresh();
  return ok;
}

/** 요청 전 토큰 만료 체크 + 401 후 자동 retry */
async function requestWithRetry(
  url: string,
  init: RequestInit,
  parseJson: boolean,
): Promise<Response> {
  // Pre-flight: 만료된 토큰이면 요청 전에 미리 refresh
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token && isTokenExpired(token)) {
    const refreshed = await ensureFreshToken();
    if (refreshed) {
      init = { ...init, headers: { ...init.headers as Record<string, string>, ...getAuthHeaders() } };
    }
  }

  let res = await fetch(url, init);

  // 401 fallback (서버 측 만료 판정이 다를 수 있으므로 유지)
  if (res.status === 401) {
    const refreshed = await ensureFreshToken();
    if (refreshed) {
      const newHeaders = { ...init.headers as Record<string, string>, ...getAuthHeaders() };
      res = await fetch(url, { ...init, headers: newHeaders });
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      // refresh도 실패 → 로그아웃 처리
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new ApiError(401, "로그인이 필요해요");
    }
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }
  return res;
}

export async function fetchApi<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await requestWithRetry(url, { headers: getAuthHeaders() }, true);
  return res.json() as Promise<T>;
}

export async function postApi<T>(path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await requestWithRetry(url, {
    method: "POST",
    headers: body !== undefined ? jsonAuthHeaders() : { ...getAuthHeaders() },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }, true);
  return res.json() as Promise<T>;
}

export async function deleteApi(path: string): Promise<void> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  await requestWithRetry(url, { method: "DELETE", headers: getAuthHeaders() }, false);
}

export async function patchApi<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await requestWithRetry(url, {
    method: "PATCH",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(body),
  }, true);
  return res.json() as Promise<T>;
}

export async function putApi<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await requestWithRetry(url, {
    method: "PUT",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(body),
  }, true);
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

// ─── Sprint 50: Invitation & Feedback (F173/F174) ───

export interface InvitationInfo {
  valid: boolean;
  email?: string;
  orgName?: string;
  orgSlug?: string;
  role?: "admin" | "member" | "viewer";
  expiresAt?: string;
  reason?: "not_found" | "expired" | "already_accepted";
}

export interface SetupPasswordResponse {
  accessToken: string;
  refreshToken: string;
  orgId: string;
  orgName: string;
}

export interface WeeklySummary {
  period: { start: string; end: string };
  activeUsers: number;
  totalPageViews: number;
  onboardingCompletion: { completed: number; total: number; rate: number };
  averageNps: number;
  feedbackCount: number;
  topPages: Array<{ path: string; views: number }>;
}

// Public endpoint (no auth)
export async function getInvitationInfo(token: string): Promise<InvitationInfo> {
  const url = `${BASE_URL}/auth/invitations/${token}/info`;
  const res = await fetch(url);
  if (!res.ok && res.status !== 404 && res.status !== 409 && res.status !== 410) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<InvitationInfo>;
}

// Public endpoint (no auth)
export async function setupPassword(data: {
  token: string;
  name: string;
  password: string;
}): Promise<SetupPasswordResponse> {
  const url = `${BASE_URL}/auth/setup-password`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<SetupPasswordResponse>;
}

// Public endpoint (no auth) — Google OAuth with invitation token
export async function googleLoginWithInvitation(
  credential: string,
  invitationToken: string,
): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string } }> {
  const url = `${BASE_URL}/auth/google`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, invitationToken }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; name: string } }>;
}

export async function submitContextFeedback(data: {
  npsScore: number;
  comment?: string;
  pagePath?: string;
  sessionSeconds?: number;
  feedbackType?: "nps" | "feature" | "bug" | "general";
  surveyId?: string;
}): Promise<{ success: boolean; id: string; npsScore: number }> {
  return postApi("/feedback", data);
}

export async function getWeeklySummary(): Promise<WeeklySummary> {
  return fetchApi<WeeklySummary>("/kpi/weekly-summary");
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

// ─── Sprint 48: SR Management Dashboard (F168) ───

export interface SrItem {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  sr_type: string;
  priority: string;
  status: string;
  confidence: number;
  matched_keywords: string[];
  workflow_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface SrStatsResponse {
  typeDistribution: Array<{ sr_type: string; count: number; avg_confidence: number }>;
  totalCount: number;
  feedbackCount: number;
  misclassificationRate: number;
}

export interface SrWorkflowNodeClient {
  id: string;
  type: "agent" | "condition" | "end";
  label: string;
  agentType?: string;
  dependsOn?: string[];
  status?: string;
}

export interface SrDetailItem extends SrItem {
  workflow_run?: {
    id: string;
    workflow_template: string;
    status: string;
    steps_completed: number;
    steps_total: number;
    result_summary: string | null;
    started_at: string | null;
    completed_at: string | null;
  } | null;
}

export interface SrFeedbackItem {
  id: string;
  sr_id: string;
  original_type: string;
  corrected_type: string;
  reason: string | null;
  submitted_by: string | null;
  created_at: string;
}

export async function fetchSrList(params?: {
  status?: string;
  sr_type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: SrItem[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.sr_type) qs.set("sr_type", params.sr_type);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return fetchApi(`/sr${query ? `?${query}` : ""}`);
}

export async function fetchSrStats(): Promise<SrStatsResponse> {
  return fetchApi<SrStatsResponse>("/sr/stats");
}

export async function fetchSrDetail(id: string): Promise<SrDetailItem> {
  return fetchApi<SrDetailItem>(`/sr/${id}`);
}

export async function submitSrFeedback(
  srId: string,
  body: { corrected_type: string; reason?: string },
): Promise<SrFeedbackItem> {
  return postApi<SrFeedbackItem>(`/sr/${srId}/feedback`, body);
}

// ─── Methodology API (F195) ───

export interface MethodologyInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  isDefault: boolean;
}

export interface MethodologyDetail {
  id: string;
  name: string;
  description: string;
  version: string;
  criteria: Array<{
    id: number;
    name: string;
    condition: string;
    skills: string[];
    outputType: string;
    isRequired: boolean;
  }>;
  reviewMethods: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
  }>;
}

export interface MethodologyRecommendation {
  id: string;
  name: string;
  score: number;
}

export interface PmSkillsCriteriaProgress {
  total: number;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: Array<{
    id: string;
    bizItemId: string;
    criterionId: number;
    name: string;
    skill: string;
    condition: string;
    status: "pending" | "in_progress" | "completed" | "needs_revision";
    evidence: string | null;
    outputType: string;
    score: number | null;
    completedAt: string | null;
    updatedAt: string;
  }>;
  gateStatus: "blocked" | "warning" | "ready";
}

export interface PmSkillAnalysisStep {
  order: number;
  skill: string;
  name: string;
  purpose: string;
  dependencies: string[];
  criteriaMapping: number[];
  isCompleted: boolean;
}

export interface PmSkillsClassification {
  methodologyId: string;
  entryPoint: string;
  confidence: number;
  reasoning: string;
  metadata: Record<string, unknown>;
}

export interface GateResult {
  gateStatus: "blocked" | "warning" | "ready";
  completedCount: number;
  totalCount: number;
  requiredMissing: number;
  details: Array<{
    criterionId: number;
    name: string;
    status: string;
    isRequired: boolean;
  }>;
}

export async function getMethodologies(): Promise<{ methodologies: MethodologyInfo[] }> {
  return fetchApi("/methodologies");
}

export async function getMethodologyDetail(id: string): Promise<MethodologyDetail> {
  return fetchApi(`/methodologies/${id}`);
}

export async function getMethodologyRecommendation(
  bizItemId: string,
): Promise<{ recommendations: MethodologyRecommendation[] }> {
  return fetchApi(`/methodologies/recommend/${bizItemId}`);
}

export async function getPmSkillsCriteria(
  bizItemId: string,
): Promise<PmSkillsCriteriaProgress> {
  return fetchApi(`/methodologies/pm-skills/criteria/${bizItemId}`);
}

export async function getPmSkillsAnalysisSteps(
  bizItemId: string,
): Promise<{ entryPoint: string; steps: PmSkillAnalysisStep[]; nextExecutableSkills: string[] }> {
  return fetchApi(`/methodologies/pm-skills/analysis-steps/${bizItemId}`);
}

export async function classifyWithPmSkills(
  bizItemId: string,
): Promise<{ classification: PmSkillsClassification }> {
  return postApi(`/methodologies/pm-skills/classify/${bizItemId}`);
}

export async function getPmSkillsGate(
  bizItemId: string,
): Promise<GateResult> {
  return fetchApi(`/methodologies/pm-skills/gate/${bizItemId}`);
}

// ─── Sprint 70: Viability / Traffic Light / Commit Gate API (F214) ───

export interface ViabilityCheckpoint {
  id: string;
  bizItemId: string;
  orgId: string;
  stage: string;
  decision: "go" | "pivot" | "drop";
  question: string;
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
}

export interface TrafficLightResponse {
  bizItemId: string;
  summary: { go: number; pivot: number; drop: number; pending: number };
  commitGate: { decision: string; decidedAt: string } | null;
  checkpoints: ViabilityCheckpoint[];
  overallSignal: "green" | "yellow" | "red";
}

export interface CommitGateResponse {
  id: string;
  bizItemId: string;
  question1Answer: string | null;
  question2Answer: string | null;
  question3Answer: string | null;
  question4Answer: string | null;
  finalDecision: "commit" | "explore_alternatives" | "drop";
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
}

export interface AnalysisPathResponse {
  discoveryType: string;
  typeName: string;
  stages: Array<{
    stage: string;
    stageName: string;
    intensity: "core" | "normal" | "light";
    question: string;
  }>;
  commitGateQuestions: string[];
}

export interface BizItemSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  discoveryType: string | null;
  createdAt: string;
}

export async function getTrafficLight(bizItemId: string): Promise<TrafficLightResponse> {
  return fetchApi(`/ax-bd/viability/traffic-light/${bizItemId}`);
}

export async function getCommitGate(bizItemId: string): Promise<CommitGateResponse> {
  return fetchApi(`/ax-bd/viability/commit-gate/${bizItemId}`);
}

export async function getViabilityCheckpoints(bizItemId: string): Promise<{ checkpoints: ViabilityCheckpoint[] }> {
  return fetchApi(`/ax-bd/viability/checkpoints/${bizItemId}`);
}

export async function getAnalysisPath(bizItemId: string): Promise<AnalysisPathResponse> {
  return fetchApi(`/biz-items/${bizItemId}/analysis-path`);
}

export async function getBizItems(): Promise<{ items: BizItemSummary[] }> {
  return fetchApi("/biz-items");
}

// ─── Sprint 94: Discovery Stages API (F263) ───

export interface StageProgress {
  stage: string;
  stageName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface DiscoveryProgress {
  stages: StageProgress[];
  currentStage: string | null;
  completedCount: number;
  totalCount: number;
}

export async function getDiscoveryProgress(bizItemId: string): Promise<DiscoveryProgress> {
  return fetchApi(`/biz-items/${bizItemId}/discovery-progress`);
}

export async function updateDiscoveryStage(
  bizItemId: string,
  stage: string,
  status: string,
): Promise<{ ok: boolean; stage: string; status: string }> {
  return postApi(`/biz-items/${bizItemId}/discovery-stage`, { stage, status });
}

// ─── Sprint 234: F480 Discovery Stage Runner API ───

export interface StageAnalysisResult {
  summary: string;
  details: string;
  confidence: number;
}

export interface StageRunResult {
  stage: string;
  stageName: string;
  intensity: "core" | "normal" | "light";
  result: StageAnalysisResult;
  viabilityQuestion: string | null;
  commitGateQuestions: string[] | null;
}

export interface StageConfirmResult {
  ok: boolean;
  nextStage: string | null;
}

export async function runDiscoveryStage(
  bizItemId: string,
  stage: string,
  feedback?: string,
): Promise<StageRunResult> {
  return postApi(`/biz-items/${bizItemId}/discovery-stage/${stage}/run`, { feedback });
}

export async function confirmDiscoveryStage(
  bizItemId: string,
  stage: string,
  viabilityAnswer: "go" | "pivot" | "stop",
  feedback?: string,
): Promise<StageConfirmResult> {
  return postApi(`/biz-items/${bizItemId}/discovery-stage/${stage}/confirm`, { viabilityAnswer, feedback });
}

// ─── Sprint 211: F438 발굴 분석 실행 API ───

export interface StartingPointResult {
  startingPoint: string;
  confidence: number;
  reasoning: string;
  needsConfirmation: boolean;
  analysisPath?: unknown;
}

export interface ClassifyResult {
  itemType: string;
  confidence: number;
  reasoning: string;
  turnAnswers: { turn1: string; turn2: string; turn3: string };
  analysisWeights: Record<string, number>;
}

export interface EvaluationScore {
  personaId: string;
  businessViability: number;
  strategicFit: number;
  customerValue: number;
  techMarket: number;
  execution: number;
  financialFeasibility: number;
  competitiveDiff: number;
  scalability: number;
  summary: string;
  concerns: string[];
}

export interface EvaluateResult {
  id: string;
  bizItemId: string;
  verdict: string;
  avgScore: number;
  totalConcerns: number;
  scores: EvaluationScore[];
  warnings: string[];
}

export async function runStartingPoint(
  bizItemId: string,
  context?: string,
): Promise<StartingPointResult> {
  return postApi(`/biz-items/${bizItemId}/starting-point`, context ? { context } : {});
}

export async function runClassify(
  bizItemId: string,
  context?: string,
): Promise<ClassifyResult> {
  return postApi(`/biz-items/${bizItemId}/classify`, context ? { context } : {});
}

export async function runEvaluate(bizItemId: string): Promise<EvaluateResult> {
  return postApi(`/biz-items/${bizItemId}/evaluate`, {});
}

// ─── Sprint 71: Skill Guide API (F215) ───

export interface SkillGuideResponse {
  orchestrator: {
    name: string;
    description: string;
    commands: Array<{ command: string; description: string }>;
    stages: Array<{ id: string; name: string; description: string }>;
  };
  skills: Array<{
    name: string;
    displayName: string;
    description: string;
    category: string;
    triggers: string[];
    frameworks: string[];
  }>;
}

export interface ProcessFlowResponse {
  lifecycle: Array<{ stage: number; name: string; description: string; tools: string[] }>;
  discovery: {
    types: Array<{ code: string; name: string; description: string; icon: string }>;
    stages: Array<{ id: string; name: string; coreFor: string[]; normalFor: string[]; lightFor: string[] }>;
    commitGate: { stage: string; questions: string[] };
  };
}

export interface TeamFaqResponse {
  categories: string[];
  items: Array<{ id: string; category: string; question: string; answer: string }>;
}

export async function getSkillGuide(): Promise<SkillGuideResponse> {
  return fetchApi<SkillGuideResponse>("/onboarding/skill-guide");
}

export async function getProcessFlow(): Promise<ProcessFlowResponse> {
  return fetchApi<ProcessFlowResponse>("/onboarding/process-flow");
}

export async function getTeamFaq(): Promise<TeamFaqResponse> {
  return fetchApi<TeamFaqResponse>("/onboarding/team-faq");
}

// ─── F217: TestAgent API Functions ───

export interface TestGenerationResponse {
  testFiles: Array<{
    path: string;
    content: string;
    testCount: number;
    framework: string;
  }>;
  totalTestCount: number;
  coverageEstimate: number;
  edgeCases: Array<{
    function: string;
    case: string;
    category: string;
  }>;
  tokensUsed: number;
  model: string;
  duration: number;
}

export interface CoverageGapResponse {
  analyzedFiles: number;
  uncoveredFunctions: Array<{
    file: string;
    function: string;
    complexity: string;
    priority: string;
  }>;
  missingEdgeCases: Array<{
    file: string;
    function: string;
    suggestedCases: string[];
  }>;
  overallCoverage: number;
  tokensUsed: number;
  model: string;
}

export async function generateTests(
  sourceCode: string,
  options?: { instructions?: string },
): Promise<TestGenerationResponse> {
  return postApi<TestGenerationResponse>("/agents/test/generate", {
    taskId: crypto.randomUUID(),
    context: {
      repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
      branch: "master",
      fileContents: { "source.ts": sourceCode },
      instructions: options?.instructions,
    },
  });
}

export async function analyzeCoverageGaps(
  sourceCode: string,
  testCode?: string,
): Promise<CoverageGapResponse> {
  return postApi<CoverageGapResponse>("/agents/test/coverage-gaps", {
    sourceFiles: { "source.ts": sourceCode },
    ...(testCode ? { testFiles: { "source.test.ts": testCode } } : {}),
  });
}

// ─── Detail Page API Functions ───

export interface BizItemDetail extends BizItemSummary {
  source: string;
  classification: Record<string, unknown> | null;
  createdBy: string;
  updatedAt: string;
}

export interface IdeaDetail {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  gitRef: string;
  authorId: string;
  syncStatus: string;
  createdAt: number;
  updatedAt: number;
}

export interface BmcDetail {
  id: string;
  ideaId: string | null;
  title: string;
  blocks: Array<{ blockType: string; content: string | null; updatedAt: number }>;
  createdAt: number;
  updatedAt: number;
}

export interface OfferingPackDetail {
  id: string;
  bizItemId: string;
  title: string;
  description: string | null;
  status: string;
  items: Array<{ id: string; itemType: string; title: string; content: string | null; url: string | null; sortOrder: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface BdpVersion {
  id: string;
  bizItemId: string;
  versionNum: number;
  content: string;
  isFinal: boolean;
  createdBy: string;
  createdAt: string;
}

export async function fetchBizItemDetail(id: string): Promise<BizItemDetail> {
  return fetchApi(`/biz-items/${id}`);
}

export async function fetchIdeaDetail(id: string): Promise<IdeaDetail> {
  const res = await fetchApi<{ items: IdeaDetail[] }>("/ax-bd/ideas");
  const found = res.items.find((i) => i.id === id);
  if (!found) throw new Error("Idea not found");
  return found;
}

export async function fetchBmcDetail(id: string): Promise<BmcDetail> {
  const res = await fetchApi<{ items: BmcDetail[] }>("/ax-bd/bmc");
  const found = res.items.find((b) => b.id === id);
  if (!found) throw new Error("BMC not found");
  return found;
}

export async function fetchOfferingPackDetail(id: string): Promise<OfferingPackDetail> {
  return fetchApi(`/offering-packs/${id}`);
}

// ─── Sprint 119: Offering Brief (F293) ───

export interface OfferingBrief {
  id: string;
  orgId: string;
  offeringPackId: string;
  title: string;
  content: string;
  targetAudience: string | null;
  meetingType: string;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function createOfferingBrief(
  packId: string,
  data?: { targetAudience?: string; meetingType?: string },
): Promise<OfferingBrief> {
  return postApi(`/offering-packs/${packId}/brief`, data ?? {});
}

export async function fetchOfferingBriefLatest(packId: string): Promise<OfferingBrief> {
  return fetchApi(`/offering-packs/${packId}/brief`);
}

export async function fetchOfferingBriefs(packId: string): Promise<OfferingBrief[]> {
  const res = await fetchApi<{ items: OfferingBrief[] }>(`/offering-packs/${packId}/briefs`);
  return res.items;
}

export async function fetchBdpLatest(bizItemId: string): Promise<BdpVersion> {
  return fetchApi(`/bdp/${bizItemId}`);
}

// ─── Sprint 212: F440 기획서 생성 + F438 분석 실행 APIs ───

export interface BusinessPlanResult {
  id: string;
  bizItemId: string;
  versionNum: number;
  content: string;
  createdAt: string;
}

// F445: 템플릿 파라미터 지원
export async function generateBusinessPlan(
  bizItemId: string,
  params?: { templateType?: 'internal'|'proposal'|'ir-pitch'; tone?: 'formal'|'casual'; length?: 'short'|'medium'|'long' },
): Promise<BusinessPlanResult> {
  return postApi(`/biz-items/${bizItemId}/generate-business-plan`, params ?? {});
}

// ─── Sprint 215: F444 편집기 + F445 템플릿 APIs ───

export interface BusinessPlanSectionItem {
  id: string;
  draftId: string;
  bizItemId: string;
  sectionNum: number;
  title: string;
  content: string;
  updatedAt: string | null;
}

export interface BpDiffResult {
  v1: { version: number; generatedAt: string };
  v2: { version: number; generatedAt: string };
  sections: Array<{
    num: number;
    title: string;
    v1Content: string;
    v2Content: string;
    changed: boolean;
  }>;
}

export async function fetchBusinessPlanSections(bizItemId: string): Promise<{ sections: BusinessPlanSectionItem[] }> {
  return fetchApi(`/biz-items/${bizItemId}/business-plan/sections`);
}

export async function updateBusinessPlanSection(bizItemId: string, sectionNum: number, content: string): Promise<void> {
  await patchApi(`/biz-items/${bizItemId}/business-plan/sections/${sectionNum}`, { content });
}

export async function regenerateBusinessPlanSection(bizItemId: string, sectionNum: number, customPrompt?: string): Promise<{ sectionNum: number; content: string }> {
  return postApi(`/biz-items/${bizItemId}/business-plan/sections/${sectionNum}/regenerate`, { customPrompt });
}

export async function saveBusinessPlanDraft(bizItemId: string, note?: string): Promise<BusinessPlanResult> {
  return postApi(`/biz-items/${bizItemId}/business-plan/save`, { note });
}

export async function fetchBusinessPlanDiff(bizItemId: string, v1: number, v2: number): Promise<BpDiffResult> {
  return fetchApi(`/biz-items/${bizItemId}/business-plan/diff?v1=${v1}&v2=${v2}`);
}

export async function fetchBusinessPlanVersions(bizItemId: string): Promise<Array<{ version: number; generatedAt: string }>> {
  const data = await fetchApi<{ versions: Array<{ version: number; generatedAt: string }> }>(`/biz-items/${bizItemId}/business-plan/versions`);
  return data.versions;
}

// F446: 사업기획서 내보내기 (Sprint 216)
export async function exportBusinessPlanPptx(bizItemId: string): Promise<Blob> {
  const url = `${BASE_URL}/biz-items/${bizItemId}/business-plan/export?format=pptx`;
  const res = await requestWithRetry(url, { headers: getAuthHeaders() }, false);
  if (!res.ok) throw new ApiError(res.status, "PPTX 내보내기 실패");
  return res.blob();
}

export async function exportBusinessPlanHtml(bizItemId: string): Promise<string> {
  const url = `${BASE_URL}/biz-items/${bizItemId}/business-plan/export?format=html`;
  const res = await requestWithRetry(url, { headers: getAuthHeaders() }, false);
  if (!res.ok) throw new ApiError(res.status, "HTML 내보내기 실패");
  return res.text();
}

export interface StartingPointResult {
  startingPointType: string;
  reason: string;
  confidence: number;
}

export async function analyzeStartingPoint(bizItemId: string): Promise<StartingPointResult> {
  return postApi(`/biz-items/${bizItemId}/starting-point`, {});
}

export interface ClassifyResult {
  discoveryType: string;
  industry: string | null;
  targetScale: string | null;
  reason: string;
}

export async function classifyBizItem(bizItemId: string): Promise<ClassifyResult> {
  return postApi(`/biz-items/${bizItemId}/classify`, {});
}

export interface EvaluateResult {
  personas: Array<{ name: string; score: number; feedback: string }>;
  overallScore: number;
  summary: string;
}

export async function evaluateBizItem(bizItemId: string): Promise<EvaluateResult> {
  return postApi(`/biz-items/${bizItemId}/evaluate`, {});
}

export interface ShapingArtifacts {
  businessPlan: { versionNum: number; createdAt: string } | null;
  offering: { id: string; status: string } | null;
  prd: { versionNum: number } | null;
  prototype: { id: string } | null;
}

export async function getShapingArtifacts(bizItemId: string): Promise<ShapingArtifacts> {
  return fetchApi(`/biz-items/${bizItemId}/shaping-artifacts`);
}

// ─── Sprint 88: Org Shared Data (F253) ───

export interface OrgSharedBmcItem {
  id: string;
  title: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  syncStatus: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrgActivityItem {
  type: string;
  resourceId: string;
  title: string;
  actorId: string;
  actorName: string | null;
  timestamp: string;
}

export async function getOrgSharedBmcs(
  orgId: string,
  opts?: { page?: number; limit?: number },
): Promise<{ items: OrgSharedBmcItem[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (opts?.page) qs.set("page", String(opts.page));
  if (opts?.limit) qs.set("limit", String(opts.limit));
  const query = qs.toString();
  return fetchApi(`/orgs/${orgId}/shared/bmcs${query ? `?${query}` : ""}`);
}

export async function getOrgActivityFeed(
  orgId: string,
  limit?: number,
): Promise<{ items: OrgActivityItem[] }> {
  const qs = limit ? `?limit=${limit}` : "";
  return fetchApi(`/orgs/${orgId}/shared/activity${qs}`);
}

// ─── Sprint 88: NPS Survey (F254) ───

export async function checkNpsSurvey(): Promise<{ shouldShow: boolean; surveyId: string | null }> {
  return fetchApi("/nps/check");
}

export async function dismissNpsSurvey(surveyId: string): Promise<{ success: boolean }> {
  return postApi("/nps/dismiss", { surveyId });
}

export interface NpsOrgSummary {
  averageNps: number;
  totalResponses: number;
  responseRate: number;
  weeklyTrend: Array<{ week: string; avgNps: number; count: number }>;
  recentFeedback: Array<{
    id: string;
    userId: string;
    npsScore: number;
    comment: string | null;
    createdAt: string;
  }>;
}

export async function getOrgNpsSummary(orgId: string): Promise<NpsOrgSummary> {
  return fetchApi(`/orgs/${orgId}/nps/summary`);
}

// ─── F262: BD 프로세스 진행 추적 ───

export interface DiscoveryStageProgress {
  stageId: string;
  stageName: string;
  hasArtifacts: boolean;
  artifactCount: number;
  checkpoint?: { decision: string; decidedAt: string };
}

export interface ProcessProgress {
  bizItemId: string;
  title: string;
  status: string;
  pipelineStage: string;
  pipelineEnteredAt: string;
  currentDiscoveryStage: string;
  discoveryStages: DiscoveryStageProgress[];
  completedStageCount: number;
  totalStageCount: number;
  trafficLight: {
    overallSignal: "green" | "yellow" | "red";
    go: number;
    pivot: number;
    drop: number;
    pending: number;
  };
  commitGate: { decision: string; decidedAt: string } | null;
  lastDecision: {
    decision: string;
    stage: string;
    comment: string;
    decidedAt: string;
  } | null;
}

export interface PortfolioSummary {
  totalItems: number;
  bySignal: { green: number; yellow: number; red: number };
  byPipelineStage: Record<string, number>;
  avgCompletionRate: number;
  bottleneck: { stageId: string; stageName: string; itemCount: number } | null;
}

export interface PortfolioProgressResponse {
  items: ProcessProgress[];
  summary: PortfolioSummary;
  total: number;
}

export async function getProcessProgress(bizItemId: string): Promise<ProcessProgress> {
  return fetchApi(`/ax-bd/progress/${bizItemId}`);
}

export async function getPortfolioProgress(params?: {
  signal?: string;
  pipelineStage?: string;
  page?: number;
  limit?: number;
}): Promise<PortfolioProgressResponse> {
  const query = new URLSearchParams();
  if (params?.signal) query.set("signal", params.signal);
  if (params?.pipelineStage) query.set("pipelineStage", params.pipelineStage);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return fetchApi(`/ax-bd/progress${qs ? `?${qs}` : ""}`);
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  return fetchApi("/ax-bd/progress/summary");
}

// ── KG Ontology (F255) ──────────────────────

export interface KgNode {
  id: string;
  orgId: string;
  type: string;
  name: string;
  nameEn?: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KgEdge {
  id: string;
  relationType: string;
  weight: number;
  label?: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface PathResult {
  path: Array<{ id: string; type: string; name: string }>;
  edges: Array<{ id: string; relationType: string; weight: number; label?: string }>;
  totalWeight: number;
  hopCount: number;
}

export interface ImpactNode {
  id: string;
  type: string;
  name: string;
  impactLevel: "HIGH" | "MEDIUM" | "LOW";
  impactScore: number;
  pathFromSource: string[];
  hopCount: number;
}

export interface ImpactResult {
  sourceNode: { id: string; type: string; name: string };
  affectedNodes: ImpactNode[];
  totalAffected: number;
  byLevel: { high: number; medium: number; low: number };
}

export interface KgStats {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
}

export async function getKgNodes(params?: { type?: string; q?: string; page?: number; limit?: number }): Promise<{ items: KgNode[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.q) query.set("q", params.q);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return fetchApi(`/ax-bd/kg/nodes${qs ? `?${qs}` : ""}`);
}

export async function getKgNode(id: string): Promise<KgNode> {
  return fetchApi(`/ax-bd/kg/nodes/${id}`);
}

export async function getKgNeighbors(nodeId: string, direction?: string): Promise<{ nodes: Array<{ id: string; type: string; name: string; name_en: string | null }>; edges: KgEdge[] }> {
  const qs = direction ? `?direction=${direction}` : "";
  return fetchApi(`/ax-bd/kg/nodes/${nodeId}/neighbors${qs}`);
}

export async function searchKgNodes(q: string): Promise<{ items: KgNode[] }> {
  return fetchApi(`/ax-bd/kg/nodes/search?q=${encodeURIComponent(q)}`);
}

export async function getKgPaths(source: string, target: string, maxDepth?: number): Promise<{ paths: PathResult[] }> {
  const query = new URLSearchParams({ source, target });
  if (maxDepth) query.set("maxDepth", String(maxDepth));
  return fetchApi(`/ax-bd/kg/path?${query}`);
}

export async function postKgImpact(body: { sourceNodeId: string; decayFactor?: number; threshold?: number; maxDepth?: number; relationTypes?: string[] }): Promise<ImpactResult> {
  return postApi("/ax-bd/kg/impact", body);
}

export async function getKgSubgraph(nodeId: string, depth?: number): Promise<{ nodes: Array<{ id: string; type: string; name: string }>; edges: Array<{ id: string; source: string; target: string; relationType: string; weight: number }> }> {
  const qs = depth ? `?depth=${depth}` : "";
  return fetchApi(`/ax-bd/kg/subgraph/${nodeId}${qs}`);
}

export async function getKgStats(): Promise<KgStats> {
  return fetchApi("/ax-bd/kg/stats");
}

export async function seedKgData(): Promise<{ ok: boolean; nodes: number; edges: number }> {
  return postApi("/ax-bd/kg/seed");
}

export async function clearKgData(): Promise<void> {
  return deleteApi("/ax-bd/kg/seed");
}

// ── F256: KG Scenario Simulation ──

export interface ScenarioPreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  eventNodeIds: string[];
  category: "petrochemical" | "semiconductor" | "compound";
}

export interface EventContribution {
  eventId: string;
  eventName: string;
  score: number;
}

export interface HotspotNode {
  id: string;
  type: string;
  name: string;
  nameEn?: string;
  combinedScore: number;
  impactLevel: "HIGH" | "MEDIUM" | "LOW";
  eventContributions: EventContribution[];
  eventCount: number;
  isHotspot: boolean;
}

export interface ScenarioResult {
  events: Array<{ id: string; name: string; nameEn?: string }>;
  affectedNodes: HotspotNode[];
  hotspots: HotspotNode[];
  totalAffected: number;
  hotspotCount: number;
  byLevel: { high: number; medium: number; low: number };
}

export async function getScenarioPresets(): Promise<{ presets: ScenarioPreset[] }> {
  return fetchApi("/ax-bd/kg/scenario/presets");
}

export async function simulateScenario(input: {
  eventNodeIds: string[];
  decayFactor?: number;
  threshold?: number;
  maxDepth?: number;
}): Promise<ScenarioResult> {
  return postApi("/ax-bd/kg/scenario/simulate", input);
}

// ── F266: HITL Review ──────────────────────────

export interface HitlReview {
  id: string;
  tenantId: string;
  artifactId: string;
  reviewerId: string;
  action: "approved" | "modified" | "regenerated" | "rejected";
  reason: string | null;
  modifiedContent: string | null;
  previousVersion: string | null;
  createdAt: string;
}

export async function submitHitlReview(input: {
  artifactId: string;
  action: "approved" | "modified" | "regenerated" | "rejected";
  reason?: string;
  modifiedContent?: string;
}): Promise<HitlReview> {
  return postApi("/hitl/review", input);
}

export async function getHitlHistory(artifactId: string): Promise<{ reviews: HitlReview[]; total: number }> {
  return fetchApi(`/hitl/history/${artifactId}`);
}

// ─── Sprint 121: GTM Outreach (F299) ───

export interface GtmCustomer {
  id: string;
  orgId: string;
  companyName: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactRole: string | null;
  companySize: string | null;
  notes: string | null;
  tags: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GtmOutreach {
  id: string;
  orgId: string;
  customerId: string;
  offeringPackId: string | null;
  title: string;
  status: string;
  proposalContent: string | null;
  proposalGeneratedAt: string | null;
  sentAt: string | null;
  responseNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  offeringPackTitle?: string;
}

export interface OutreachStats {
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
}

export async function fetchGtmCustomers(params?: Record<string, string>): Promise<{ items: GtmCustomer[]; total: number }> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchApi(`/gtm/customers${qs}`);
}

export async function createGtmCustomer(data: Partial<GtmCustomer>): Promise<GtmCustomer> {
  return postApi("/gtm/customers", data);
}

export async function fetchGtmCustomer(id: string): Promise<GtmCustomer> {
  return fetchApi(`/gtm/customers/${id}`);
}

export async function updateGtmCustomer(id: string, data: Partial<GtmCustomer>): Promise<GtmCustomer> {
  return patchApi(`/gtm/customers/${id}`, data);
}

export async function fetchGtmOutreachList(params?: Record<string, string>): Promise<{ items: GtmOutreach[]; total: number }> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetchApi(`/gtm/outreach${qs}`);
}

export async function createGtmOutreach(data: { customerId: string; offeringPackId?: string; title: string }): Promise<GtmOutreach> {
  return postApi("/gtm/outreach", data);
}

export async function fetchGtmOutreach(id: string): Promise<GtmOutreach> {
  return fetchApi(`/gtm/outreach/${id}`);
}

export async function updateGtmOutreachStatus(id: string, status: string, responseNote?: string): Promise<GtmOutreach> {
  return patchApi(`/gtm/outreach/${id}/status`, { status, responseNote });
}

export async function deleteGtmOutreach(id: string): Promise<void> {
  return deleteApi(`/gtm/outreach/${id}`);
}

export async function generateOutreachProposal(id: string): Promise<{ content: string }> {
  return postApi(`/gtm/outreach/${id}/generate`);
}

export async function fetchOutreachStats(): Promise<OutreachStats> {
  return fetchApi("/gtm/outreach/stats");
}

// ─── Skill Registry (F303) ───

export interface SkillRegistryListParams {
  category?: string;
  status?: string;
  safetyGrade?: string;
  limit?: number;
  offset?: number;
}

export interface SkillRegistryListResponse {
  skills: SkillRegistryEntry[];
  total: number;
}

export interface SkillSearchResponse {
  results: SkillSearchResult[];
  total: number;
  query: string;
}

export async function getSkillRegistryList(
  params?: SkillRegistryListParams,
): Promise<SkillRegistryListResponse> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  if (params?.safetyGrade) qs.set("safetyGrade", params.safetyGrade);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return fetchApi<SkillRegistryListResponse>(
    `/skills/registry${query ? `?${query}` : ""}`,
  );
}

export async function searchSkillRegistry(
  q: string,
  opts?: { category?: string; limit?: number },
): Promise<SkillSearchResponse> {
  const qs = new URLSearchParams({ q });
  if (opts?.category) qs.set("category", opts.category);
  if (opts?.limit) qs.set("limit", String(opts.limit));
  return fetchApi<SkillSearchResponse>(`/skills/search?${qs}`);
}

export async function getSkillRegistryDetail(
  skillId: string,
): Promise<SkillRegistryEntry> {
  return fetchApi<SkillRegistryEntry>(`/skills/registry/${skillId}`);
}

export async function getSkillEnriched(
  skillId: string,
): Promise<SkillEnrichedView> {
  return fetchApi<SkillEnrichedView>(`/skills/registry/${skillId}/enriched`);
}

// ─── F317: Backup/Restore ───────────────────────

export interface BackupMeta {
  id: string;
  tenantId: string;
  backupType: "manual" | "auto" | "pre_deploy";
  scope: "full" | "item";
  bizItemId: string | null;
  tablesIncluded: string[];
  itemCount: number;
  sizeBytes: number;
  createdBy: string;
  createdAt: string;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  deleted: number;
  tables: Record<string, { inserted: number; skipped: number }>;
}

export async function exportBackup(params: {
  backupType?: "manual" | "auto" | "pre_deploy";
  scope?: "full" | "item";
  bizItemId?: string;
}): Promise<BackupMeta> {
  return postApi<BackupMeta>("/backup/export", params);
}

export async function importBackup(params: {
  backupId: string;
  strategy?: "replace" | "merge";
}): Promise<ImportResult> {
  return postApi<ImportResult>("/backup/import", params);
}

export async function listBackups(params?: {
  backupType?: string;
  scope?: string;
  bizItemId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: BackupMeta[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.backupType) qs.set("backupType", params.backupType);
  if (params?.scope) qs.set("scope", params.scope);
  if (params?.bizItemId) qs.set("bizItemId", params.bizItemId);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return fetchApi<{ items: BackupMeta[]; total: number }>(
    `/backup/list${query ? `?${query}` : ""}`,
  );
}

export async function getBackup(id: string): Promise<BackupMeta> {
  return fetchApi<BackupMeta>(`/backup/${id}`);
}

export async function deleteBackup(id: string): Promise<void> {
  const url = `${BASE_URL}/backup/${id}`;
  await requestWithRetry(url, { method: "DELETE", headers: getAuthHeaders() }, true);
}

// ─── F346: Discovery Report (Sprint 156) ───

export interface DiscoveryReportData {
  id: string;
  bizItemId: string;
  title: string;
  type: "I" | "M" | "P" | "T" | "S" | null;
  completedStages: string[];
  overallProgress: number;
  tabs: Record<string, unknown>;
}

export async function fetchDiscoveryReport(itemId: string): Promise<DiscoveryReportData> {
  return fetchApi<DiscoveryReportData>(`/ax-bd/discovery-report/${itemId}`);
}

// Sprint 157: F349 — Executive Summary
export async function fetchExecutiveSummary(itemId: string) {
  return fetchApi<import("@foundry-x/shared").ExecutiveSummaryData>(
    `/ax-bd/discovery-report/${itemId}/summary`,
  );
}

// Sprint 157: F349 — Team Reviews
export async function fetchTeamReviews(itemId: string) {
  return fetchApi<{ data: import("@foundry-x/shared").TeamReviewVote[] }>(
    `/ax-bd/team-reviews/${itemId}`,
  );
}

// ─── Sprint 160: Prototype Dashboard + O-G-D (F355, F356) ───

export interface PrototypeJobItem {
  id: string;
  orgId: string;
  prdTitle: string;
  status: string;
  builderType: string;
  pagesUrl: string | null;
  costUsd: number;
  modelUsed: string;
  fallbackUsed: boolean;
  retryCount: number;
  qualityScore: number | null;
  ogdRounds: number;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface PrototypeJobDetail extends PrototypeJobItem {
  prdContent: string;
  buildLog: string;
  errorMessage: string | null;
  feedbackContent: string | null;
}

export interface OgdRoundItem {
  id: string;
  jobId: string;
  roundNumber: number;
  qualityScore: number | null;
  feedback: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelUsed: string;
  passed: boolean;
  createdAt: number;
}

export interface OgdSummaryResponse {
  jobId: string;
  totalRounds: number;
  bestScore: number;
  bestRound: number;
  passed: boolean;
  totalCostUsd: number;
  rounds: OgdRoundItem[];
}

export interface FeedbackItem {
  id: string;
  jobId: string;
  orgId: string;
  authorId: string | null;
  category: string;
  content: string;
  status: string;
  createdAt: number;
}

export async function fetchPrototypeJobs(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: PrototypeJobItem[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return fetchApi(`/prototype-jobs${q ? `?${q}` : ""}`);
}

export async function fetchPrototypeJob(id: string): Promise<PrototypeJobDetail> {
  return fetchApi(`/prototype-jobs/${id}`);
}

export async function fetchOgdSummary(jobId: string): Promise<{ summary: OgdSummaryResponse }> {
  return fetchApi(`/ogd/summary/${jobId}`);
}

export async function fetchOgdRounds(jobId: string): Promise<{ rounds: OgdRoundItem[] }> {
  return fetchApi(`/ogd/rounds/${jobId}`);
}

export async function submitPrototypeFeedback(
  jobId: string,
  data: { category: string; content: string },
): Promise<{ feedback: FeedbackItem; jobStatus: string }> {
  return postApi(`/prototype-jobs/${jobId}/feedback`, data);
}

export async function fetchPrototypeFeedback(
  jobId: string,
): Promise<{ items: FeedbackItem[] }> {
  return fetchApi(`/prototype-jobs/${jobId}/feedback`);
}

// ─── Offerings List & Create Wizard (F374, F375, Sprint 169) ───

export interface OfferingListItem {
  id: string;
  orgId: string;
  bizItemId: string | null;
  title: string;
  purpose: "report" | "proposal" | "review";
  format: "html" | "pptx";
  status: "draft" | "generating" | "review" | "approved" | "shared";
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchOfferings(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: OfferingListItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return fetchApi(`/offerings${qs ? `?${qs}` : ""}`);
}

export async function createOffering(data: {
  bizItemId?: string;
  title: string;
  purpose: "report" | "proposal" | "review";
  format: "html" | "pptx";
}): Promise<OfferingListItem> {
  return postApi("/offerings", data);
}

export async function deleteOffering(id: string): Promise<void> {
  return deleteApi(`/offerings/${id}`);
}

export async function toggleOfferingSection(
  offeringId: string,
  sectionId: string,
): Promise<OfferingSectionItem> {
  return patchApi(`/offerings/${offeringId}/sections/${sectionId}/toggle`, {});
}

// ─── Offering Editor & Validate (F376, F377, Sprint 170) ───

export interface OfferingDetail {
  id: string;
  orgId: string;
  bizItemId: string;
  title: string;
  purpose: "report" | "proposal" | "review";
  format: "html" | "pptx";
  status: "draft" | "generating" | "review" | "approved" | "shared";
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferingSectionItem {
  id: string;
  offeringId: string;
  sectionKey: string;
  title: string;
  content: string | null;
  sortOrder: number;
  isRequired: boolean;
  isIncluded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfferingValidationItem {
  id: string;
  offeringId: string;
  orgId: string;
  mode: "full" | "quick";
  status: "running" | "passed" | "failed" | "error";
  ogdRunId: string | null;
  ganScore: number | null;
  ganFeedback: string | null;
  sixhatsSummary: string | null;
  expertSummary: string | null;
  overallScore: number | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

export async function fetchOfferingDetail(id: string): Promise<OfferingDetail> {
  return fetchApi(`/offerings/${id}`);
}

export async function fetchOfferingSections(offeringId: string): Promise<OfferingSectionItem[]> {
  const res = await fetchApi<{ sections: OfferingSectionItem[] }>(`/offerings/${offeringId}/sections`);
  return res.sections;
}

export async function updateOfferingSection(
  offeringId: string,
  sectionId: string,
  data: { title?: string; content?: string; isIncluded?: boolean },
): Promise<OfferingSectionItem> {
  return putApi(`/offerings/${offeringId}/sections/${sectionId}`, data);
}

export async function reorderOfferingSections(
  offeringId: string,
  sectionIds: string[],
): Promise<{ sections: OfferingSectionItem[] }> {
  return putApi(`/offerings/${offeringId}/sections/reorder`, { sectionIds });
}

export async function fetchPrototypeHtml(prototypeId: string): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${BASE_URL}/ax-bd/prototypes/${prototypeId}/html`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new ApiError(res.status, "프로토타입 HTML을 불러올 수 없어요");
  return res.text();
}

export async function fetchOfferingHtmlPreview(offeringId: string): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${BASE_URL}/offerings/${offeringId}/export?format=html`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new ApiError(res.status, "Failed to fetch HTML preview");
  return res.text();
}

export async function triggerOfferingValidation(
  offeringId: string,
  mode: "full" | "quick" = "full",
): Promise<OfferingValidationItem> {
  return postApi(`/offerings/${offeringId}/validate`, { mode });
}

export async function fetchOfferingValidations(offeringId: string): Promise<OfferingValidationItem[]> {
  const res = await fetchApi<{ validations: OfferingValidationItem[]; total: number }>(`/offerings/${offeringId}/validations`);
  return res.validations;
}

// ─── F381: Design Tokens (Sprint 173) ───

export interface DesignTokenItem {
  id?: string;
  tokenKey: string;
  tokenValue: string;
  tokenCategory: "color" | "typography" | "layout" | "spacing";
}

export async function fetchOfferingDesignTokens(offeringId: string): Promise<DesignTokenItem[]> {
  const res = await fetchApi<{ tokens: DesignTokenItem[] }>(`/offerings/${offeringId}/tokens`);
  return res.tokens;
}

export async function updateOfferingDesignTokens(
  offeringId: string,
  tokens: DesignTokenItem[],
): Promise<DesignTokenItem[]> {
  const res = await putApi<{ tokens: DesignTokenItem[] }>(`/offerings/${offeringId}/tokens`, { tokens });
  return res.tokens;
}

export async function resetOfferingDesignTokens(offeringId: string): Promise<DesignTokenItem[]> {
  const res = await postApi<{ tokens: DesignTokenItem[] }>(`/offerings/${offeringId}/tokens/reset`);
  return res.tokens;
}

// ─── F378: Content Adapter (Sprint 171) ───

export type AdaptTone = "executive" | "technical" | "critical";

export interface AdaptedSection {
  sectionKey: string;
  title: string;
  content: string;
}

export interface AdaptResponse {
  adaptedSections: AdaptedSection[];
  tone: AdaptTone;
  offeringId: string;
  sectionCount: number;
}

export async function adaptOfferingTone(
  offeringId: string,
  tone: AdaptTone,
  sectionKeys?: string[],
): Promise<AdaptResponse> {
  return postApi(`/offerings/${offeringId}/adapt`, { tone, sectionKeys });
}

export async function previewOfferingTone(
  offeringId: string,
  tone: AdaptTone,
): Promise<AdaptResponse> {
  return fetchApi(`/offerings/${offeringId}/adapt/preview?tone=${tone}`);
}

// ─── F379: Discovery→Shape Pipeline (Sprint 171) ───

export interface ShapePipelineResult {
  offeringId: string;
  prefilledSections: number;
  totalSections: number;
  tone: string;
  status: "success" | "partial" | "failed";
  error?: string;
}

export interface ShapePipelineStatusResponse {
  status: "idle" | "processing" | "completed" | "failed";
  offering?: {
    id: string;
    title: string;
    prefilledCount: number;
  };
}

export async function triggerShapePipeline(
  itemId: string,
  tone: AdaptTone = "executive",
): Promise<ShapePipelineResult> {
  return postApi("/pipeline/shape/trigger", { itemId, tone });
}

export async function fetchShapePipelineStatus(
  itemId: string,
): Promise<ShapePipelineStatusResponse> {
  return fetchApi(`/pipeline/shape/status?itemId=${itemId}`);
}

// ─── F390: Quality Dashboard (Sprint 178) ───

export interface QualityDashboardSummaryResponse {
  totalPrototypes: number;
  averageScore: number;
  above80Count: number;
  above80Pct: number;
  totalCostSaved: number;
  generationModes: Record<string, number>;
}

export interface DimensionAverageResponse {
  build: number;
  ui: number;
  functional: number;
  prd: number;
  code: number;
}

export interface TrendPoint {
  date: string;
  avgScore: number;
  count: number;
}

export interface QualityTrendResponse {
  points: TrendPoint[];
  period: string;
}

export async function fetchQualityDashboardSummary(): Promise<QualityDashboardSummaryResponse> {
  const res = await fetchApi<{ summary: QualityDashboardSummaryResponse }>("/quality-dashboard/summary");
  return res.summary;
}

export async function fetchQualityDimensions(): Promise<DimensionAverageResponse> {
  const res = await fetchApi<{ dimensions: DimensionAverageResponse }>("/quality-dashboard/dimensions");
  return res.dimensions;
}

export async function fetchQualityTrend(days?: number): Promise<QualityTrendResponse> {
  const q = days ? `?days=${days}` : "";
  const res = await fetchApi<{ trend: QualityTrendResponse }>(`/quality-dashboard/trend${q}`);
  return res.trend;
}

// ─── F391: User Evaluations (Sprint 178) ───

export interface UserEvaluationItem {
  id: string;
  jobId: string;
  evaluatorRole: string;
  buildScore: number;
  uiScore: number;
  functionalScore: number;
  prdScore: number;
  codeScore: number;
  overallScore: number;
  comment: string | null;
  createdAt: string;
}

export interface CorrelationResult {
  dimension: string;
  pearson: number;
  sampleSize: number;
  autoMean: number;
  manualMean: number;
}

export interface CorrelationSummaryResponse {
  correlations: CorrelationResult[];
  overallPearson: number;
  totalEvaluations: number;
  calibrationStatus: "good" | "needs_attention" | "insufficient_data";
}

export async function submitUserEvaluation(data: {
  jobId: string;
  evaluatorRole: string;
  buildScore: number;
  uiScore: number;
  functionalScore: number;
  prdScore: number;
  codeScore: number;
  overallScore: number;
  comment?: string;
}): Promise<{ evaluation: UserEvaluationItem }> {
  return postApi("/user-evaluations", data);
}

export async function fetchUserEvaluations(
  jobId: string,
): Promise<{ items: UserEvaluationItem[] }> {
  return fetchApi(`/user-evaluations/${jobId}`);
}

export async function fetchCorrelation(): Promise<CorrelationSummaryResponse> {
  const res = await fetchApi<{ correlation: CorrelationSummaryResponse }>("/user-evaluations/correlation");
  return res.correlation;
}

// ─── Sprint 210: Discovery Criteria + Analysis Context (F437) ───

export interface DiscoveryCriterionItem {
  id: string;
  bizItemId: string;
  criterionId: number;
  name: string;
  condition: string;
  status: "pending" | "in_progress" | "completed" | "needs_revision";
  evidence: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface CriteriaProgress {
  total: 9;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: DiscoveryCriterionItem[];
  gateStatus: "blocked" | "warning" | "ready";
}

export async function getDiscoveryCriteria(bizItemId: string): Promise<CriteriaProgress> {
  return fetchApi(`/biz-items/${bizItemId}/discovery-criteria`);
}

export async function getNextGuide(bizItemId: string): Promise<{ step: string; description: string; actions: string[] }> {
  return fetchApi(`/biz-items/${bizItemId}/next-guide`);
}

// ─── F447: 파이프라인 단계 추적 ───────────────────────────────────────────

export interface PipelineStageHistoryRecord {
  id: string;
  bizItemId: string;
  stage: string;
  enteredAt: string;
  exitedAt: string | null;
  enteredBy: string;
  notes: string | null;
}

export interface PipelineItemDetail {
  id: string;
  title: string;
  currentStage: string;
  stageEnteredAt: string;
  stageHistory: PipelineStageHistoryRecord[];
}

export async function getPipelineItemDetail(bizItemId: string): Promise<PipelineItemDetail> {
  return fetchApi(`/pipeline/items/${bizItemId}`);
}

// ─── F448: 단계 간 자동 전환 ─────────────────────────────────────────────

export async function advancePipelineStage(
  bizItemId: string,
  stage: string,
  notes?: string,
): Promise<{ success: boolean }> {
  return patchApi(`/pipeline/items/${bizItemId}/stage`, { stage, notes });
}

// ─── F443: 파일 업로드 + 문서 추출 ──────────────────────────────────────

export interface UploadedFileMeta {
  id: string;
  filename: string;
  mime_type: string;
  status: string;
  size_bytes: number;
  created_at: number;
  parsed_at?: number | null;
  page_count?: number | null;
}

export async function fetchFiles(bizItemId?: string): Promise<UploadedFileMeta[]> {
  const params = bizItemId ? `?biz_item_id=${encodeURIComponent(bizItemId)}` : "";
  const data = await fetchApi<{ files: UploadedFileMeta[] }>(`/files${params}`);
  return data.files ?? [];
}

export async function deleteFile(fileId: string): Promise<void> {
  await deleteApi(`/files/${fileId}`);
}

export async function extractItemFromDocuments(
  fileIds: string[],
): Promise<{ title: string; description: string; confidence: number }> {
  return postApi("/files/extract-item", { file_ids: fileIds });
}

export async function associateFilesToItem(
  fileIds: string[],
  bizItemId: string,
): Promise<void> {
  await Promise.all(
    fileIds.map((id) => patchApi(`/files/${id}`, { biz_item_id: bizItemId })),
  );
}

// ── Sprint 220 F454/F455: 사업기획서 기반 PRD + 인터뷰 ──

export interface GeneratedPrdFromBp {
  id: string;
  bizItemId: string;
  version: number;
  content: string;
  sourceType: "business_plan";
  bpDraftId: string;
  generatedAt: string;
}

export async function generatePrdFromBp(
  bizItemId: string,
  options?: { bpDraftId?: string; skipLlmRefine?: boolean },
): Promise<GeneratedPrdFromBp> {
  return postApi<GeneratedPrdFromBp>(`/biz-items/${bizItemId}/generate-prd-from-bp`, options ?? {});
}

export interface PrdInterviewQuestion {
  seq: number;
  question: string;
  questionContext: string;
  answer: string | null;
  answeredAt: string | null;
}

export interface PrdInterviewSession {
  id: string;
  bizItemId: string;
  prdId: string;
  status: "in_progress" | "completed" | "cancelled";
  questionCount: number;
  answeredCount: number;
  questions: PrdInterviewQuestion[];
}

export async function startPrdInterview(
  bizItemId: string,
  prdId?: string,
): Promise<PrdInterviewSession> {
  return postApi<PrdInterviewSession>(`/biz-items/${bizItemId}/prd-interview/start`, { prdId });
}

export async function submitPrdInterviewAnswer(
  bizItemId: string,
  interviewId: string,
  seq: number,
  answer: string,
): Promise<{
  interviewId: string;
  seq: number;
  answeredCount: number;
  remainingCount: number;
  isComplete: boolean;
  updatedPrd?: { id: string; version: number; content: string };
}> {
  return postApi(`/biz-items/${bizItemId}/prd-interview/answer`, { interviewId, seq, answer });
}

export async function getPrdInterviewStatus(
  bizItemId: string,
): Promise<{ interview: PrdInterviewSession | null }> {
  return fetchApi<{ interview: PrdInterviewSession | null }>(`/biz-items/${bizItemId}/prd-interview/status`);
}

// ─── Sprint 221 F456: PRD 버전 관리 API ───

export interface GeneratedPrdEntry {
  id: string;
  biz_item_id: string;
  version: number;
  status: "draft" | "reviewing" | "confirmed";
  content: string;
  contentPreview?: string;
  criteria_snapshot: string | null;
  generated_at: number;
}

export interface DiffHunk {
  type: "added" | "removed" | "unchanged";
  content: string;
}

export async function listPrds(bizItemId: string): Promise<{ prds: GeneratedPrdEntry[] }> {
  return fetchApi<{ prds: GeneratedPrdEntry[] }>(`/biz-items/${bizItemId}/prds`);
}

export async function getPrd(bizItemId: string, prdId: string): Promise<GeneratedPrdEntry> {
  return fetchApi<GeneratedPrdEntry>(`/biz-items/${bizItemId}/prds/${prdId}`);
}

export async function confirmPrd(bizItemId: string, prdId: string): Promise<GeneratedPrdEntry> {
  return postApi<GeneratedPrdEntry>(`/biz-items/${bizItemId}/prds/${prdId}/confirm`);
}

export async function editPrd(bizItemId: string, prdId: string, content: string): Promise<GeneratedPrdEntry> {
  return patchApi<GeneratedPrdEntry>(`/biz-items/${bizItemId}/prds/${prdId}`, { content });
}

export async function diffPrds(
  bizItemId: string,
  v1Id: string,
  v2Id: string,
): Promise<{ v1: { id: string; version: number }; v2: { id: string; version: number }; hunks: DiffHunk[] }> {
  return fetchApi(`/biz-items/${bizItemId}/prds/diff?v1=${encodeURIComponent(v1Id)}&v2=${encodeURIComponent(v2Id)}`);
}

// ─── Sprint 223: F459 포트폴리오 연결 구조 (F459) ───

export interface PortfolioProgress {
  currentStage: string;
  completedStages: string[];
  criteriaCompleted: number;
  criteriaTotal: number;
  hasBusinessPlan: boolean;
  hasOffering: boolean;
  hasPrototype: boolean;
  overallPercent: number;
}

export interface PortfolioTree {
  item: { id: string; title: string; description: string | null; source: string; status: string; createdAt: string };
  classification: { itemType: string; confidence: number; classifiedAt: string } | null;
  evaluations: Array<{
    id: string; verdict: string; avgScore: number; totalConcerns: number; evaluatedAt: string;
    scores: Array<{ personaId: string; businessViability: number; strategicFit: number; customerValue: number; summary: string | null }>;
  }>;
  startingPoint: { startingPoint: string; confidence: number; reasoning: string | null } | null;
  criteria: Array<{ criterionId: number; status: string; evidence: string | null; completedAt: string | null }>;
  businessPlans: Array<{ id: string; version: number; modelUsed: string | null; generatedAt: string }>;
  offerings: Array<{
    id: string; title: string; purpose: string; format: string; status: string;
    currentVersion: number; sectionsCount: number; versionsCount: number; linkedPrototypeIds: string[];
  }>;
  prototypes: Array<{ id: string; version: number; format: string; templateUsed: string | null; generatedAt: string }>;
  pipelineStages: Array<{ stage: string; enteredAt: string; exitedAt: string | null; notes: string | null }>;
  progress: PortfolioProgress;
}

export async function fetchPortfolio(bizItemId: string): Promise<PortfolioTree> {
  const res = await fetchApi<{ data: PortfolioTree }>(`/biz-items/${bizItemId}/portfolio`);
  return res.data;
}

// ─── Sprint 224: Gap 보강 API 함수 ───

export interface PortfolioListItem {
  id: string;
  title: string;
  status: string;
  currentStage: string;
  hasEvaluation: boolean;
  prdCount: number;
  offeringCount: number;
  prototypeCount: number;
  overallPercent: number;
  createdAt: string;
}

export interface PortfolioListResponse {
  items: PortfolioListItem[];
  total: number;
}

export async function fetchPortfolioList(): Promise<PortfolioListResponse> {
  const res = await fetchApi<{ data: PortfolioListResponse }>("/biz-items/portfolio-list");
  return res.data;
}

export interface ArtifactLookupItem {
  id: string;
  title: string;
  status: string;
  currentStage: string;
}

export interface ArtifactLookupResponse {
  artifactType: "prd" | "offering" | "prototype";
  artifactId: string;
  bizItems: ArtifactLookupItem[];
}

export async function fetchBizItemsByArtifact(
  type: "prd" | "offering" | "prototype",
  id: string,
): Promise<ArtifactLookupResponse> {
  const res = await fetchApi<{ data: ArtifactLookupResponse }>(
    `/biz-items/by-artifact?type=${type}&id=${encodeURIComponent(id)}`,
  );
  return res.data;
}

// ─── F476: 피드백 관리 대시보드 ───

export interface FeedbackQueueItem {
  id: string;
  org_id: string;
  github_issue_number: number;
  github_issue_url: string;
  title: string;
  body: string | null;
  labels: string;
  screenshot_url: string | null;
  status: "pending" | "processing" | "done" | "failed" | "skipped";
  agent_pr_url: string | null;
  agent_log: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackQueueList {
  items: FeedbackQueueItem[];
  total: number;
}

export async function getFeedbackQueue(
  params?: { status?: string; limit?: number; offset?: number },
): Promise<FeedbackQueueList> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return fetchApi(`/feedback-queue${query ? `?${query}` : ""}`);
}

export async function getFeedbackQueueItem(id: string): Promise<FeedbackQueueItem> {
  return fetchApi(`/feedback-queue/${id}`);
}

export async function updateFeedbackQueueItem(
  id: string,
  body: { status?: "pending" | "done" | "failed" | "skipped"; agentPrUrl?: string; errorMessage?: string },
): Promise<FeedbackQueueItem> {
  return patchApi(`/feedback-queue/${id}`, body);
}

// ─── F483: 평가결과서 HTML 뷰어 (Sprint 236) ───

export async function fetchEvaluationReportHtml(itemId: string): Promise<string> {
  const res = await fetchApi<{ data: { html: string; updatedAt: string } }>(
    `/ax-bd/discovery-reports/${itemId}/html`,
  );
  return res.data.html;
}

export async function saveEvaluationReportHtml(itemId: string, html: string): Promise<void> {
  await putApi(`/ax-bd/discovery-reports/${itemId}/html`, { html });
}

export async function shareEvaluationReport(itemId: string): Promise<string> {
  const res = await postApi<{ data: { sharedToken: string } }>(
    `/ax-bd/discovery-reports/${itemId}/share`,
  );
  return res.data.sharedToken;
}
