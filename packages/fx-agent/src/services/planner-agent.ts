import type {
  AgentPlan,
  AgentPlanStatus,
  ProposedStep,
} from "@foundry-x/shared";
import { MODEL_SONNET } from "@foundry-x/shared";
import type { AgentTaskType, AgentExecutionRequest } from "./execution-types.js";
import type { SSEManager } from "./sse-manager.js";
import type { GitHubService } from "./github.js";
import { FileContextCollector, estimateTokens } from "./file-context-collector.js";
import type { CollectorResult } from "./file-context-collector.js";
import type { McpServerRegistry } from "./mcp-registry.js";
import { getPlannerPrompt } from "./planner-prompts.js";

interface ExternalToolInfo {
  serverId: string;
  serverName: string;
  tools: { name: string; description: string }[];
}

export interface PlannerAgentDeps {
  db: D1Database;
  sse?: SSEManager;
  apiKey?: string;
  model?: string;
  mcpRegistry?: McpServerRegistry;
  githubService?: GitHubService;
}

interface AnalysisResult {
  codebaseAnalysis: string;
  proposedSteps: ProposedStep[];
  risks: string[];
  estimatedTokens: number;
  analysisMode: "llm" | "mock";
  analysisModel?: string;
  analysisTokensUsed?: number;
  analysisDurationMs?: number;
  fileContextCount: number;
}

interface PlanRow {
  id: string;
  task_id: string;
  agent_id: string;
  codebase_analysis: string;
  proposed_steps: string;
  estimated_files: number;
  risks: string;
  estimated_tokens: number;
  status: string;
  human_feedback: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  execution_status: string | null;
  execution_started_at: string | null;
  execution_completed_at: string | null;
  execution_result: string | null;
  execution_error: string | null;
  analysis_mode: string | null;
  analysis_model: string | null;
  analysis_tokens_used: number | null;
  analysis_duration_ms: number | null;
  file_context_count: number | null;
}

function mapRow(r: PlanRow): AgentPlan {
  return {
    id: r.id, taskId: r.task_id, agentId: r.agent_id,
    codebaseAnalysis: r.codebase_analysis,
    proposedSteps: JSON.parse(r.proposed_steps),
    estimatedFiles: r.estimated_files,
    risks: JSON.parse(r.risks || "[]"),
    estimatedTokens: r.estimated_tokens,
    status: r.status as AgentPlanStatus,
    humanFeedback: r.human_feedback ?? undefined,
    createdAt: r.created_at,
    approvedAt: r.approved_at ?? undefined,
    rejectedAt: r.rejected_at ?? undefined,
    executionStatus: (r.execution_status as AgentPlan["executionStatus"]) ?? undefined,
    executionStartedAt: r.execution_started_at ?? undefined,
    executionCompletedAt: r.execution_completed_at ?? undefined,
    executionResult: r.execution_result ? JSON.parse(r.execution_result) : undefined,
    executionError: r.execution_error ?? undefined,
    analysisMode: (r.analysis_mode as "llm" | "mock") ?? "mock",
    analysisModel: r.analysis_model ?? undefined,
    analysisTokensUsed: r.analysis_tokens_used ?? undefined,
    analysisDurationMs: r.analysis_duration_ms ?? undefined,
    fileContextCount: r.file_context_count ?? 0,
  };
}

export class PlannerAgent {
  constructor(private deps: PlannerAgentDeps) {}

  private mockAnalysis(
    _taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
  ): { codebaseAnalysis: string; proposedSteps: ProposedStep[]; risks: string[]; estimatedTokens: number } {
    const targetFiles = context.targetFiles ?? [];
    const codebaseAnalysis = targetFiles.length > 0
      ? `대상 파일 ${targetFiles.length}개 분석: ${targetFiles.join(", ")}`
      : `${context.repoUrl} 리포지토리 ${context.branch} 브랜치 분석`;
    const proposedSteps: ProposedStep[] = targetFiles.map((file) => ({
      description: `${file} 수정`, type: "modify" as const, targetFile: file, estimatedLines: 20,
    }));
    if (context.instructions) {
      proposedSteps.push({ description: context.instructions, type: "create" as const, estimatedLines: 50 });
    }
    const risks: string[] = [];
    if (targetFiles.length > 5) risks.push(`영향 범위가 넓음: ${targetFiles.length}개 파일 수정`);
    return { codebaseAnalysis, proposedSteps, risks, estimatedTokens: (targetFiles.length || 1) * 2000 };
  }

  parseAnalysisResponse(
    text: string, context: AgentExecutionRequest["context"],
  ): { codebaseAnalysis: string; proposedSteps: ProposedStep[]; risks: string[]; estimatedTokens: number } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.mockAnalysis("code-generation", context);
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        codebaseAnalysis: parsed.codebaseAnalysis ?? "",
        proposedSteps: Array.isArray(parsed.proposedSteps) ? parsed.proposedSteps : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        estimatedTokens: typeof parsed.estimatedTokens === "number" ? parsed.estimatedTokens : 2000,
      };
    } catch { return this.mockAnalysis("code-generation", context); }
  }

  async gatherExternalToolInfo(): Promise<ExternalToolInfo[]> {
    if (!this.deps.mcpRegistry) return [];
    try {
      const servers = await this.deps.mcpRegistry.listServers();
      const result: ExternalToolInfo[] = [];
      for (const server of servers) {
        if (server.status !== "active" || !server.toolsCache) continue;
        try {
          const tools = JSON.parse(server.toolsCache) as { name: string; description?: string }[];
          const limited = tools.slice(0, 10).map((t) => ({ name: t.name, description: (t.description ?? "").slice(0, 80) }));
          if (limited.length > 0) result.push({ serverId: server.id, serverName: server.name, tools: limited });
        } catch { /* invalid toolsCache */ }
      }
      return result;
    } catch { return []; }
  }

  private buildPromptWithFileContext(
    taskType: AgentTaskType, context: AgentExecutionRequest["context"],
    fileResult: CollectorResult, externalTools: ExternalToolInfo[],
  ): string {
    const lines = [`Task Type: ${taskType}`, `Repository: ${context.repoUrl}`, `Branch: ${context.branch}`];
    if (context.targetFiles?.length) lines.push(`Target Files: ${context.targetFiles.join(", ")}`);
    if (context.instructions) lines.push(`\nInstructions: ${context.instructions}`);
    if (context.spec) lines.push(`\nSpec Context: ${context.spec.title} — ${context.spec.description}`);
    if (externalTools.length > 0) {
      lines.push("\nAvailable External Tools:");
      for (const server of externalTools) {
        lines.push(`[Server: ${server.serverName} (id: ${server.serverId})]`);
        for (const tool of server.tools) lines.push(`  - ${tool.name}: ${tool.description}`);
      }
    }
    if (fileResult.files.length > 0) {
      lines.push("\n## File Contents");
      for (const file of fileResult.files) {
        const tag = file.depth === 0 ? "[Target]" : "[Import]";
        const truncNote = file.truncated ? " (truncated)" : "";
        lines.push(`\n### ${tag} ${file.path}${truncNote} (${file.lineCount} lines)`);
        lines.push("```typescript", file.content, "```");
      }
      if (fileResult.skippedFiles.length > 0)
        lines.push(`\n> Skipped files (budget exceeded): ${fileResult.skippedFiles.join(", ")}`);
    }
    return lines.join("\n");
  }

  private async callLlmWithRetry(
    prompt: string, systemPrompt: string, model: string,
  ): Promise<{ text: string; tokensUsed: number } | null> {
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": this.deps.apiKey!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages: [{ role: "user", content: prompt }] }),
        });
        if (res.ok) {
          const body = await res.json() as { content: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
          return { text: body.content?.find((c) => c.type === "text")?.text ?? "", tokensUsed: (body.usage?.input_tokens ?? 0) + (body.usage?.output_tokens ?? 0) };
        }
        if (res.status === 400 || res.status === 401 || res.status === 403) return null;
        if (attempt < 1) await new Promise((r) => setTimeout(r, res.status === 429 ? 1000 : 2000));
      } catch {
        if (attempt < 1) await new Promise((r) => setTimeout(r, 2000));
      }
    }
    return null;
  }

  private extractRepo(repoUrl?: string): string {
    if (!repoUrl) return "";
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/.]+)/);
    return match?.[1] ?? repoUrl;
  }

  private async analyzeCodebase(
    taskType: AgentTaskType, context: AgentExecutionRequest["context"], model?: string,
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const collector = new FileContextCollector(this.deps.githubService ?? null, { tokenBudget: 50_000, maxDepth: 1, maxFileLines: 500 });
    const fileResult = await collector.collect(this.extractRepo(context.repoUrl), context.branch ?? "main", context.targetFiles ?? [], context.fileContents);

    if (!this.deps.apiKey) {
      return { ...this.mockAnalysis(taskType, context), analysisMode: "mock", fileContextCount: fileResult.files.length };
    }

    const externalTools = await this.gatherExternalToolInfo();
    const systemPrompt = getPlannerPrompt(taskType);
    const userPrompt = this.buildPromptWithFileContext(taskType, context, fileResult, externalTools);
    const selectedModel = model ?? this.deps.model ?? MODEL_SONNET;
    const llmResult = await this.callLlmWithRetry(userPrompt, systemPrompt, selectedModel);

    if (!llmResult) {
      return { ...this.mockAnalysis(taskType, context), analysisMode: "mock", analysisModel: selectedModel, analysisDurationMs: Date.now() - startTime, fileContextCount: fileResult.files.length };
    }

    const parsed = this.parseAnalysisResponse(llmResult.text, context);
    return {
      ...parsed, estimatedTokens: fileResult.totalTokens + estimateTokens(systemPrompt) + 1000,
      analysisMode: "llm", analysisModel: selectedModel, analysisTokensUsed: llmResult.tokensUsed,
      analysisDurationMs: Date.now() - startTime, fileContextCount: fileResult.files.length,
    };
  }

  async createPlan(
    agentId: string, taskType: AgentTaskType,
    context: AgentExecutionRequest["context"], model?: string,
  ): Promise<AgentPlan> {
    const id = `plan-${crypto.randomUUID().slice(0, 8)}`;
    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const analysis = await this.analyzeCodebase(taskType, context, model);
    const estimatedFiles = analysis.proposedSteps.filter((s) => s.targetFile).length || context.targetFiles?.length || 1;

    await this.deps.db.prepare(
      `INSERT INTO agent_plans (id, task_id, agent_id, codebase_analysis, proposed_steps, estimated_files, risks, estimated_tokens, status, created_at, analysis_mode, analysis_model, analysis_tokens_used, analysis_duration_ms, file_context_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?, ?, ?, ?)`,
    ).bind(id, taskId, agentId, analysis.codebaseAnalysis, JSON.stringify(analysis.proposedSteps), estimatedFiles, JSON.stringify(analysis.risks), analysis.estimatedTokens, now, analysis.analysisMode, analysis.analysisModel ?? null, analysis.analysisTokensUsed ?? null, analysis.analysisDurationMs ?? null, analysis.fileContextCount).run();

    this.deps.sse?.pushEvent({
      event: "agent.plan.created",
      data: { planId: id, taskId, agentId, stepsCount: analysis.proposedSteps.length, estimatedTokens: analysis.estimatedTokens, analysisMode: analysis.analysisMode },
    });

    return {
      id, taskId, agentId, codebaseAnalysis: analysis.codebaseAnalysis, proposedSteps: analysis.proposedSteps,
      estimatedFiles, risks: analysis.risks, estimatedTokens: analysis.estimatedTokens,
      status: "pending_approval", createdAt: now, analysisMode: analysis.analysisMode,
      analysisModel: analysis.analysisModel, analysisTokensUsed: analysis.analysisTokensUsed,
      analysisDurationMs: analysis.analysisDurationMs, fileContextCount: analysis.fileContextCount,
    };
  }

  async revisePlan(planId: string, feedback: string): Promise<AgentPlan> {
    await this.deps.db.prepare(`UPDATE agent_plans SET status = 'modified', human_feedback = ? WHERE id = ?`).bind(feedback, planId).run();
    const plan = await this.getPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    return plan;
  }

  async approvePlan(planId: string): Promise<AgentPlan> {
    const now = new Date().toISOString();
    await this.deps.db.prepare(`UPDATE agent_plans SET status = 'approved', approved_at = ? WHERE id = ?`).bind(now, planId).run();
    this.deps.sse?.pushEvent({ event: "agent.plan.approved", data: { planId, approvedBy: "user" } });
    const plan = await this.getPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    return plan;
  }

  async rejectPlan(planId: string, reason?: string): Promise<AgentPlan> {
    const now = new Date().toISOString();
    await this.deps.db.prepare(`UPDATE agent_plans SET status = 'rejected', rejected_at = ?, human_feedback = COALESCE(?, human_feedback) WHERE id = ?`).bind(now, reason ?? null, planId).run();
    this.deps.sse?.pushEvent({ event: "agent.plan.rejected", data: { planId, reason } });
    const plan = await this.getPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    return plan;
  }

  async getPlan(planId: string): Promise<AgentPlan | null> {
    const row = await this.deps.db.prepare("SELECT * FROM agent_plans WHERE id = ?").bind(planId).first<PlanRow>();
    return row ? mapRow(row) : null;
  }

  async listPlans(agentId?: string): Promise<AgentPlan[]> {
    let query = "SELECT * FROM agent_plans";
    const bindings: string[] = [];
    if (agentId) { query += " WHERE agent_id = ?"; bindings.push(agentId); }
    query += " ORDER BY created_at DESC";
    const stmt = this.deps.db.prepare(query);
    const { results } = bindings.length > 0 ? await stmt.bind(...bindings).all<PlanRow>() : await stmt.all<PlanRow>();
    return results.map(mapRow);
  }
}
