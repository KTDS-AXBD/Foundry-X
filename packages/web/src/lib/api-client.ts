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

export async function fetchApi<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }

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
  const url = `${BASE_URL}/spec/generate`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, context }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<SpecGenerateResult>;
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
  const url = `${BASE_URL}/agents/${agentId}/execute`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      taskType,
      context: {
        repoUrl: context.repoUrl ?? "https://github.com/KTDS-AXBD/Foundry-X",
        branch: context.branch ?? "master",
        ...context,
      },
    }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<AgentExecutionResult>;
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
  const url = `${BASE_URL}/mcp/servers`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<McpServerInfo>;
}

export async function deleteMcpServer(id: string): Promise<void> {
  const url = `${BASE_URL}/mcp/servers/${id}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
}

export async function testMcpServer(id: string): Promise<McpTestResult> {
  const url = `${BASE_URL}/mcp/servers/${id}/test`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<McpTestResult>;
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
  const url = `${BASE_URL}/mcp/servers/${serverId}/prompts/${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ arguments: args }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<{ messages: any[] }>;
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
  const url = `${BASE_URL}/agents/pr`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ agentId, taskId, config }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<AgentPrResult>;
}

export async function getAgentPr(id: string): Promise<Record<string, unknown>> {
  return fetchApi(`/agents/pr/${id}`);
}

export async function reviewAgentPr(id: string): Promise<Record<string, unknown>> {
  const url = `${BASE_URL}/agents/pr/${id}/review`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function mergeAgentPr(
  id: string,
): Promise<{ merged: boolean; needsHuman: boolean; reason?: string }> {
  const url = `${BASE_URL}/agents/pr/${id}/merge`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<{ merged: boolean; needsHuman: boolean; reason?: string }>;
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
  const url = `${BASE_URL}/mcp/servers/${serverId}/resources/read`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ uri }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<{ contents: McpResourceContent[] }>;
}

export async function subscribeMcpResource(
  serverId: string,
  uri: string,
): Promise<void> {
  const url = `${BASE_URL}/mcp/servers/${serverId}/resources/subscribe`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ uri }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
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
  const url = `${BASE_URL}/agents/queue/process`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<any>;
}

export async function updateQueuePriority(
  entryId: string,
  priority: number,
): Promise<void> {
  const url = `${BASE_URL}/agents/queue/${entryId}/priority`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ priority }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
}

export async function executeParallel(
  tasks: Array<{
    agentId: string;
    taskType: string;
    context: { repoUrl?: string; branch?: string; targetFiles?: string[]; instructions?: string };
  }>,
  createPrs: boolean = false,
): Promise<Record<string, unknown>> {
  const url = `${BASE_URL}/agents/parallel`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ tasks, createPrs }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<Record<string, unknown>>;
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
  const url = `${BASE_URL}/agents/plan`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      agentId,
      taskType,
      context: {
        repoUrl: context.repoUrl ?? "https://github.com/KTDS-AXBD/Foundry-X",
        branch: context.branch ?? "master",
        ...context,
      },
    }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<AgentPlanResponse>;
}

export async function approvePlan(planId: string): Promise<AgentPlanResponse> {
  const url = `${BASE_URL}/agents/plan/${planId}/approve`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<AgentPlanResponse>;
}

export async function rejectPlan(planId: string, reason: string): Promise<AgentPlanResponse> {
  const url = `${BASE_URL}/agents/plan/${planId}/reject`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<AgentPlanResponse>;
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
  const url = `${BASE_URL}/agents/inbox/send`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fromAgentId, toAgentId, type, subject, payload, parentMessageId }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<InboxMessage>;
}

export async function acknowledgeMessage(messageId: string): Promise<void> {
  const url = `${BASE_URL}/agents/inbox/${messageId}/ack`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
}

// ─── Sprint 17 F81: Inbox Thread ───

export async function getInboxThread(
  parentMessageId: string,
  limit?: number,
): Promise<{ thread: InboxMessage[]; total: number; parentMessageId: string }> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const url = `${BASE_URL}/agents/inbox/${parentMessageId}/thread?${params}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `Failed to fetch thread: ${res.status}`);
  return res.json();
}

export async function ackThread(parentMessageId: string): Promise<{ acknowledged: boolean; count: number }> {
  const url = `${BASE_URL}/agents/inbox/${parentMessageId}/ack-thread`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<{ acknowledged: boolean; count: number }>;
}

// ─── Conflict Resolution ───

export async function resolveConflict(
  conflictId: string,
  resolution: "accept" | "reject" | "modify",
  modifiedValue?: string,
): Promise<void> {
  const url = `${BASE_URL}/spec/conflicts/resolve`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ conflictId, resolution, modifiedValue }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }
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

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getMyOrgs(): Promise<OrgResponse[]> {
  const res = await fetch(`${BASE_URL}/orgs`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function createOrg(params: { name: string; slug?: string }): Promise<OrgResponse> {
  const res = await fetch(`${BASE_URL}/orgs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function getOrg(orgId: string): Promise<OrgResponse> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function updateOrg(orgId: string, patch: { name?: string }): Promise<OrgResponse> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function switchOrg(orgId: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch(`${BASE_URL}/auth/switch-org`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ orgId }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function getOrgMembers(orgId: string): Promise<OrgMemberResponse[]> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/members`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function updateMemberRole(orgId: string, userId: string, role: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/members/${userId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/members/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
}

export async function createInvitation(orgId: string, data: { email: string; role: string }): Promise<OrgInvitationResponse> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/invitations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function getOrgInvitations(orgId: string): Promise<OrgInvitationResponse[]> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/invitations`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function acceptInvitation(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`${BASE_URL}/auth/invitations/${token}/accept`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function deleteInvitation(orgId: string, invitationId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/invitations/${invitationId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
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
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/projects/overview`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
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
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/monitoring/stats`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
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
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/workflows`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function createWorkflow(
  orgId: string,
  data: { name: string; description?: string; definition: WorkflowDefinition; template_id?: string },
): Promise<Workflow> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/workflows`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function getWorkflow(orgId: string, id: string): Promise<Workflow> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/workflows/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function updateWorkflow(
  orgId: string,
  id: string,
  data: { name?: string; description?: string; definition?: WorkflowDefinition; enabled?: boolean },
): Promise<Workflow> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/workflows/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function deleteWorkflow(orgId: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/workflows/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
}

export async function executeWorkflow(orgId: string, id: string): Promise<WorkflowExecution> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/workflows/${id}/execute`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
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
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/jira/projects`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function updateJiraConfig(orgId: string, config: JiraConfig): Promise<void> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/jira/config`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
}

// ─── Sprint 26: SSO & Services (F106) ───

export async function fetchHubToken(orgId: string): Promise<{ hubToken: string; expiresIn: number }> {
  const res = await fetch(`${BASE_URL}/auth/sso/token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ orgId }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export interface OrgService {
  orgId: string;
  serviceId: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
}

export async function getOrgServices(orgId: string): Promise<OrgService[]> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/services`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}

export async function updateOrgService(
  orgId: string,
  serviceId: string,
  enabled: boolean,
): Promise<OrgService> {
  const res = await fetch(`${BASE_URL}/orgs/${orgId}/services/${serviceId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json();
}
