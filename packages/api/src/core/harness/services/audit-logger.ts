/**
 * AuditLogService — AI 생성 코드 감사 로그 서비스 (F165)
 */

export interface AuditEvent {
  tenantId: string;
  eventType: string;
  agentId?: string;
  modelId?: string;
  promptHash?: string;
  inputClassification?: string;
  outputType?: string;
  approvedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  eventType: string;
  agentId: string | null;
  modelId: string | null;
  promptHash: string | null;
  inputClassification: string;
  outputType: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditQueryParams {
  eventType?: string;
  agentId?: string;
  modelId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditStats {
  stats: { eventType: string; count: number }[];
  total: number;
  period: { from: string; to: string };
}

export class AuditLogService {
  constructor(private db: D1Database) {}

  async logEvent(event: AuditEvent): Promise<{ id: string; recorded: boolean }> {
    const id = `audit-${crypto.randomUUID()}`;
    const metadata = JSON.stringify(event.metadata ?? {});
    const approvedAt = event.approvedBy ? new Date().toISOString() : null;

    await this.db
      .prepare(
        `INSERT INTO audit_logs (id, tenant_id, event_type, agent_id, model_id, prompt_hash, input_classification, output_type, approved_by, approved_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        event.tenantId,
        event.eventType,
        event.agentId ?? null,
        event.modelId ?? null,
        event.promptHash ?? null,
        event.inputClassification ?? "internal",
        event.outputType ?? null,
        event.approvedBy ?? null,
        approvedAt,
        metadata,
      )
      .run();

    return { id, recorded: true };
  }

  async getEvents(
    tenantId: string,
    params?: AuditQueryParams,
  ): Promise<{ logs: AuditLog[]; total: number; page: number; pageSize: number }> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    let countSql = "SELECT COUNT(*) as cnt FROM audit_logs WHERE tenant_id = ?";
    let querySql = "SELECT * FROM audit_logs WHERE tenant_id = ?";
    const bindings: unknown[] = [tenantId];

    if (params?.eventType) {
      countSql += " AND event_type = ?";
      querySql += " AND event_type = ?";
      bindings.push(params.eventType);
    }

    if (params?.agentId) {
      countSql += " AND agent_id = ?";
      querySql += " AND agent_id = ?";
      bindings.push(params.agentId);
    }

    if (params?.modelId) {
      countSql += " AND model_id = ?";
      querySql += " AND model_id = ?";
      bindings.push(params.modelId);
    }

    if (params?.startDate) {
      countSql += " AND created_at >= ?";
      querySql += " AND created_at >= ?";
      bindings.push(params.startDate);
    }

    if (params?.endDate) {
      countSql += " AND created_at <= ?";
      querySql += " AND created_at <= ?";
      bindings.push(params.endDate);
    }

    querySql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

    const countResult = await this.db
      .prepare(countSql)
      .bind(...bindings)
      .first<{ cnt: number }>();

    const rows = await this.db
      .prepare(querySql)
      .bind(...bindings, pageSize, offset)
      .all<{
        id: string;
        tenant_id: string;
        event_type: string;
        agent_id: string | null;
        model_id: string | null;
        prompt_hash: string | null;
        input_classification: string;
        output_type: string | null;
        approved_by: string | null;
        approved_at: string | null;
        metadata: string;
        created_at: string;
      }>();

    const logs: AuditLog[] = (rows.results ?? []).map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      eventType: r.event_type,
      agentId: r.agent_id,
      modelId: r.model_id,
      promptHash: r.prompt_hash,
      inputClassification: r.input_classification,
      outputType: r.output_type,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      metadata: JSON.parse(r.metadata || "{}"),
      createdAt: r.created_at,
    }));

    return { logs, total: countResult?.cnt ?? 0, page, pageSize };
  }

  async getStats(tenantId: string, period: number = 7): Promise<AuditStats> {
    const cutoff = new Date(Date.now() - period * 86400_000).toISOString();
    const now = new Date().toISOString();

    const rows = await this.db
      .prepare(
        `SELECT event_type, COUNT(*) as cnt
         FROM audit_logs
         WHERE tenant_id = ? AND created_at >= ?
         GROUP BY event_type
         ORDER BY cnt DESC`,
      )
      .bind(tenantId, cutoff)
      .all<{ event_type: string; cnt: number }>();

    const stats = (rows.results ?? []).map((r) => ({
      eventType: r.event_type,
      count: r.cnt,
    }));

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    return {
      stats,
      total,
      period: { from: cutoff, to: now },
    };
  }
}
