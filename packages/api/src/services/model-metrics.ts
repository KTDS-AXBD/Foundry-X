/**
 * ModelMetricsService — 모델별 실행 메트릭 기록 + 품질/비용 집계 (F143)
 */

export interface ModelQualityMetric {
  model: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  tokenEfficiency: number;
}

export interface AgentModelCell {
  agentName: string;
  model: string;
  executions: number;
  totalCostUsd: number;
  avgDurationMs: number;
  successRate: number;
}

export class ModelMetricsService {
  constructor(private db: D1Database) {}

  async recordExecution(params: {
    projectId: string;
    agentName: string;
    taskType: string;
    model: string;
    status: "success" | "partial" | "failed";
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
  }): Promise<{ id: string; recorded: boolean }> {
    const id = `mem_${crypto.randomUUID().slice(0, 8)}`;

    await this.db
      .prepare(
        `INSERT INTO model_execution_metrics
          (id, project_id, agent_name, task_type, model, status, input_tokens, output_tokens, cost_usd, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        params.projectId,
        params.agentName,
        params.taskType,
        params.model,
        params.status,
        params.inputTokens,
        params.outputTokens,
        params.costUsd,
        params.durationMs,
      )
      .run();

    return { id, recorded: true };
  }

  async getModelQuality(params: {
    projectId?: string;
    days?: number;
  }): Promise<ModelQualityMetric[]> {
    const days = params.days ?? 30;
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

    let sql = `SELECT
        model,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_cnt,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_cnt,
        AVG(duration_ms) as avg_duration,
        SUM(cost_usd) as total_cost,
        SUM(input_tokens + output_tokens) as total_tokens
      FROM model_execution_metrics
      WHERE recorded_at >= ?`;

    const bindings: unknown[] = [cutoff];

    if (params.projectId) {
      sql += " AND project_id = ?";
      bindings.push(params.projectId);
    }

    sql += " GROUP BY model ORDER BY total DESC";

    const rows = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<{
        model: string;
        total: number;
        success_cnt: number;
        failed_cnt: number;
        avg_duration: number;
        total_cost: number;
        total_tokens: number;
      }>();

    return (rows.results ?? []).map((r) => ({
      model: r.model,
      totalExecutions: r.total,
      successCount: r.success_cnt,
      failedCount: r.failed_cnt,
      successRate: Math.round((r.success_cnt / r.total) * 100),
      avgDurationMs: Math.round(r.avg_duration),
      totalCostUsd: Math.round(r.total_cost * 10000) / 10000,
      avgCostPerExecution: Math.round((r.total_cost / r.total) * 10000) / 10000,
      tokenEfficiency: r.total_cost > 0
        ? Math.round((r.total_tokens / r.total_cost) * 100) / 100
        : 0,
    }));
  }

  async getAgentModelMatrix(params: {
    projectId?: string;
    days?: number;
  }): Promise<AgentModelCell[]> {
    const days = params.days ?? 30;
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

    let sql = `SELECT
        agent_name,
        model,
        COUNT(*) as executions,
        SUM(cost_usd) as total_cost,
        AVG(duration_ms) as avg_duration,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_cnt
      FROM model_execution_metrics
      WHERE recorded_at >= ?`;

    const bindings: unknown[] = [cutoff];

    if (params.projectId) {
      sql += " AND project_id = ?";
      bindings.push(params.projectId);
    }

    sql += " GROUP BY agent_name, model ORDER BY agent_name, executions DESC";

    const rows = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<{
        agent_name: string;
        model: string;
        executions: number;
        total_cost: number;
        avg_duration: number;
        success_cnt: number;
      }>();

    return (rows.results ?? []).map((r) => ({
      agentName: r.agent_name,
      model: r.model,
      executions: r.executions,
      totalCostUsd: Math.round(r.total_cost * 10000) / 10000,
      avgDurationMs: Math.round(r.avg_duration),
      successRate: Math.round((r.success_cnt / r.executions) * 100),
    }));
  }
}
