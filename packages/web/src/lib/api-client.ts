const BASE_URL = "/api";

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
