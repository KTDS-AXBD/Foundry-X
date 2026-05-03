/**
 * F274: SkillMetricsService — 스킬 실행 메트릭 기록 + 집계 + 감사 로그
 */

import type {
  SkillMetricSummary,
  SkillDetailMetrics,
  SkillVersionRecord,
  SkillExecutionRecord,
  SkillLineageNode,
  SkillAuditEntry,
} from "@foundry-x/shared";

export interface RecordSkillExecutionParams {
  tenantId: string;
  skillId: string;
  version: number;
  bizItemId?: string;
  artifactId?: string;
  model: string;
  status: "completed" | "failed" | "timeout" | "cancelled";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  executedBy: string;
  errorMessage?: string;
}

export interface RegisterVersionParams {
  tenantId: string;
  skillId: string;
  version: number;
  promptHash: string;
  model: string;
  maxTokens: number;
  changelog?: string;
  createdBy: string;
}

export interface LogAuditParams {
  tenantId: string;
  entityType: "execution" | "version" | "lineage" | "skill";
  entityId: string;
  action: "created" | "updated" | "deleted" | "executed" | "versioned";
  actorId: string;
  details?: string;
}

export class SkillMetricsService {
  constructor(private db: D1Database) {}

  async recordExecution(params: RecordSkillExecutionParams): Promise<{ id: string }> {
    const id = generateId("se");

    await this.db
      .prepare(
        `INSERT INTO skill_executions
          (id, tenant_id, skill_id, version, biz_item_id, artifact_id, model, status,
           input_tokens, output_tokens, cost_usd, duration_ms, error_message, executed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        params.tenantId,
        params.skillId,
        params.version,
        params.bizItemId ?? null,
        params.artifactId ?? null,
        params.model,
        params.status,
        params.inputTokens,
        params.outputTokens,
        params.costUsd,
        params.durationMs,
        params.errorMessage ?? null,
        params.executedBy,
      )
      .run();

    await this.logAudit({
      tenantId: params.tenantId,
      entityType: "execution",
      entityId: id,
      action: "executed",
      actorId: params.executedBy,
      details: JSON.stringify({ skillId: params.skillId, status: params.status, durationMs: params.durationMs }),
    });

    return { id };
  }

  async getSkillMetricsSummary(
    tenantId: string,
    params?: { days?: number; status?: string },
  ): Promise<SkillMetricSummary[]> {
    const days = params?.days ?? 30;
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

    let sql = `SELECT
        skill_id,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_cnt,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_cnt,
        AVG(duration_ms) as avg_duration,
        SUM(cost_usd) as total_cost,
        AVG(input_tokens + output_tokens) as avg_tokens,
        MAX(executed_at) as last_executed
      FROM skill_executions
      WHERE tenant_id = ? AND executed_at >= ?`;

    const bindings: unknown[] = [tenantId, cutoff];

    if (params?.status) {
      sql += " AND status = ?";
      bindings.push(params.status);
    }

    sql += " GROUP BY skill_id ORDER BY total DESC";

    const rows = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<{
        skill_id: string;
        total: number;
        success_cnt: number;
        failed_cnt: number;
        avg_duration: number;
        total_cost: number;
        avg_tokens: number;
        last_executed: string | null;
      }>();

    return (rows.results ?? []).map((r) => ({
      skillId: r.skill_id,
      totalExecutions: r.total,
      successCount: r.success_cnt,
      failedCount: r.failed_cnt,
      successRate: r.total > 0 ? Math.round((r.success_cnt / r.total) * 100) : 0,
      avgDurationMs: Math.round(r.avg_duration ?? 0),
      totalCostUsd: Math.round((r.total_cost ?? 0) * 10000) / 10000,
      avgTokensPerExecution: Math.round(r.avg_tokens ?? 0),
      lastExecutedAt: r.last_executed,
    }));
  }

  async getSkillDetailMetrics(
    tenantId: string,
    skillId: string,
    params?: { days?: number },
  ): Promise<SkillDetailMetrics> {
    const days = params?.days ?? 30;
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

    // Summary
    const summaryRows = await this.db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_cnt,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_cnt,
          AVG(duration_ms) as avg_duration,
          SUM(cost_usd) as total_cost,
          AVG(input_tokens + output_tokens) as avg_tokens,
          MAX(executed_at) as last_executed
        FROM skill_executions
        WHERE tenant_id = ? AND skill_id = ? AND executed_at >= ?`,
      )
      .bind(tenantId, skillId, cutoff)
      .first<{
        total: number;
        success_cnt: number;
        failed_cnt: number;
        avg_duration: number;
        total_cost: number;
        avg_tokens: number;
        last_executed: string | null;
      }>();

    const total = summaryRows?.total ?? 0;

    // Recent executions (last 20)
    const recentRows = await this.db
      .prepare(
        `SELECT id, skill_id, version, model, status,
                input_tokens + output_tokens as total_tokens,
                cost_usd, duration_ms, executed_by, executed_at
         FROM skill_executions
         WHERE tenant_id = ? AND skill_id = ?
         ORDER BY executed_at DESC LIMIT 20`,
      )
      .bind(tenantId, skillId)
      .all<{
        id: string;
        skill_id: string;
        version: number;
        model: string;
        status: string;
        total_tokens: number;
        cost_usd: number;
        duration_ms: number;
        executed_by: string;
        executed_at: string;
      }>();

    // Versions
    const versionRows = await this.db
      .prepare(
        `SELECT id, skill_id, version, prompt_hash, model, max_tokens, changelog, created_by, created_at
         FROM skill_versions
         WHERE tenant_id = ? AND skill_id = ?
         ORDER BY version DESC`,
      )
      .bind(tenantId, skillId)
      .all<{
        id: string;
        skill_id: string;
        version: number;
        prompt_hash: string;
        model: string;
        max_tokens: number;
        changelog: string | null;
        created_by: string;
        created_at: string;
      }>();

    // Cost trend (daily aggregation)
    const trendRows = await this.db
      .prepare(
        `SELECT date(executed_at) as day, SUM(cost_usd) as cost, COUNT(*) as execs
         FROM skill_executions
         WHERE tenant_id = ? AND skill_id = ? AND executed_at >= ?
         GROUP BY date(executed_at)
         ORDER BY day`,
      )
      .bind(tenantId, skillId, cutoff)
      .all<{ day: string; cost: number; execs: number }>();

    return {
      skillId,
      totalExecutions: total,
      successCount: summaryRows?.success_cnt ?? 0,
      failedCount: summaryRows?.failed_cnt ?? 0,
      successRate: total > 0 ? Math.round(((summaryRows?.success_cnt ?? 0) / total) * 100) : 0,
      avgDurationMs: Math.round(summaryRows?.avg_duration ?? 0),
      totalCostUsd: Math.round((summaryRows?.total_cost ?? 0) * 10000) / 10000,
      avgTokensPerExecution: Math.round(summaryRows?.avg_tokens ?? 0),
      lastExecutedAt: summaryRows?.last_executed ?? null,
      versions: (versionRows.results ?? []).map((v) => ({
        id: v.id,
        skillId: v.skill_id,
        version: v.version,
        promptHash: v.prompt_hash,
        model: v.model,
        maxTokens: v.max_tokens,
        changelog: v.changelog,
        createdBy: v.created_by,
        createdAt: v.created_at,
      })),
      recentExecutions: (recentRows.results ?? []).map((e) => ({
        id: e.id,
        skillId: e.skill_id,
        version: e.version,
        model: e.model,
        status: e.status as SkillExecutionRecord["status"],
        totalTokens: e.total_tokens,
        costUsd: e.cost_usd,
        durationMs: e.duration_ms,
        executedBy: e.executed_by,
        executedAt: e.executed_at,
      })),
      costTrend: (trendRows.results ?? []).map((t) => ({
        date: t.day,
        cost: Math.round(t.cost * 10000) / 10000,
        executions: t.execs,
      })),
    };
  }

  async getSkillVersions(tenantId: string, skillId: string): Promise<SkillVersionRecord[]> {
    const rows = await this.db
      .prepare(
        `SELECT id, skill_id, version, prompt_hash, model, max_tokens, changelog, created_by, created_at
         FROM skill_versions
         WHERE tenant_id = ? AND skill_id = ?
         ORDER BY version DESC`,
      )
      .bind(tenantId, skillId)
      .all<{
        id: string;
        skill_id: string;
        version: number;
        prompt_hash: string;
        model: string;
        max_tokens: number;
        changelog: string | null;
        created_by: string;
        created_at: string;
      }>();

    return (rows.results ?? []).map((v) => ({
      id: v.id,
      skillId: v.skill_id,
      version: v.version,
      promptHash: v.prompt_hash,
      model: v.model,
      maxTokens: v.max_tokens,
      changelog: v.changelog,
      createdBy: v.created_by,
      createdAt: v.created_at,
    }));
  }

  async getSkillLineage(tenantId: string, skillId: string): Promise<SkillLineageNode> {
    const children = await this.db
      .prepare(
        `SELECT child_skill_id, derivation_type
         FROM skill_lineage
         WHERE tenant_id = ? AND parent_skill_id = ?`,
      )
      .bind(tenantId, skillId)
      .all<{ child_skill_id: string; derivation_type: string }>();

    const parents = await this.db
      .prepare(
        `SELECT parent_skill_id, derivation_type
         FROM skill_lineage
         WHERE tenant_id = ? AND child_skill_id = ?`,
      )
      .bind(tenantId, skillId)
      .all<{ parent_skill_id: string; derivation_type: string }>();

    return {
      skillId,
      derivationType: "manual",
      children: (children.results ?? []).map((c) => ({
        skillId: c.child_skill_id,
        derivationType: c.derivation_type as SkillLineageNode["derivationType"],
        children: [],
        parents: [{ skillId, derivationType: c.derivation_type }],
      })),
      parents: (parents.results ?? []).map((p) => ({
        skillId: p.parent_skill_id,
        derivationType: p.derivation_type,
      })),
    };
  }

  async getAuditLog(
    tenantId: string,
    params?: { entityType?: string; days?: number; limit?: number; offset?: number },
  ): Promise<SkillAuditEntry[]> {
    const days = params?.days ?? 30;
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

    let sql = `SELECT id, entity_type, entity_id, action, actor_id, details, created_at
               FROM skill_audit_log
               WHERE tenant_id = ? AND created_at >= ?`;
    const bindings: unknown[] = [tenantId, cutoff];

    if (params?.entityType) {
      sql += " AND entity_type = ?";
      bindings.push(params.entityType);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);

    const rows = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<{
        id: string;
        entity_type: string;
        entity_id: string;
        action: string;
        actor_id: string;
        details: string | null;
        created_at: string;
      }>();

    return (rows.results ?? []).map((r) => ({
      id: r.id,
      entityType: r.entity_type as SkillAuditEntry["entityType"],
      entityId: r.entity_id,
      action: r.action as SkillAuditEntry["action"],
      actorId: r.actor_id,
      details: r.details,
      createdAt: r.created_at,
    }));
  }

  async logAudit(params: LogAuditParams): Promise<void> {
    const id = generateId("sal");
    await this.db
      .prepare(
        `INSERT INTO skill_audit_log (id, tenant_id, entity_type, entity_id, action, actor_id, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, params.tenantId, params.entityType, params.entityId, params.action, params.actorId, params.details ?? null)
      .run();
  }

  async registerVersion(params: RegisterVersionParams): Promise<{ id: string }> {
    const id = generateId("sv");
    await this.db
      .prepare(
        `INSERT INTO skill_versions (id, tenant_id, skill_id, version, prompt_hash, model, max_tokens, changelog, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, params.tenantId, params.skillId, params.version, params.promptHash, params.model, params.maxTokens, params.changelog ?? null, params.createdBy)
      .run();

    await this.logAudit({
      tenantId: params.tenantId,
      entityType: "version",
      entityId: id,
      action: "versioned",
      actorId: params.createdBy,
      details: JSON.stringify({ skillId: params.skillId, version: params.version }),
    });

    return { id };
  }
}

function generateId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${t}${r}`;
}
