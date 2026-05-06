import {
  AuditBus,
  generateTraceId,
  generateSpanId,
} from "../../infra/types.js";
import {
  CONFIDENCE_THRESHOLD,
  type EthicsViolationType,
  type EthicsViolation,
  type KillSwitchState,
  type FPRateResult,
} from "../types.js";

function makeCtx() {
  return { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
}

function mapViolationRow(row: Record<string, unknown>): EthicsViolation {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    agentId: row.agent_id as string,
    violationType: row.violation_type as EthicsViolationType,
    thresholdValue: row.threshold_value as number,
    actualValue: row.actual_value as number,
    traceId: (row.trace_id as string | null) ?? null,
    escalatedToHuman: row.escalated_to_human === 1,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
    createdAt: row.created_at as number,
  };
}

function mapKillSwitchRow(row: Record<string, unknown>): KillSwitchState {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    agentId: row.agent_id as string,
    active: row.active === 1,
    reason: (row.reason as string | null) ?? null,
    activatedAt: (row.activated_at as number | null) ?? null,
    deactivatedAt: (row.deactivated_at as number | null) ?? null,
  };
}

export class EthicsEnforcer {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async checkConfidence(input: {
    orgId: string;
    agentId: string;
    callMeta: { confidence: number; callId: string; traceId?: string };
  }): Promise<{ passed: boolean; escalated: boolean }> {
    if (input.callMeta.confidence >= CONFIDENCE_THRESHOLD) {
      return { passed: true, escalated: false };
    }

    const id = crypto.randomUUID();
    const ctx = makeCtx();

    await this.db
      .prepare(
        `INSERT INTO ethics_violations (id, org_id, agent_id, violation_type, threshold_value, actual_value, trace_id, escalated_to_human, metadata)
         VALUES (?, ?, ?, 'confidence_threshold', ?, ?, ?, 1, ?)`,
      )
      .bind(
        id,
        input.orgId,
        input.agentId,
        CONFIDENCE_THRESHOLD,
        input.callMeta.confidence,
        input.callMeta.traceId ?? null,
        JSON.stringify({ callId: input.callMeta.callId }),
      )
      .run();

    await this.auditBus.emit(
      "ethics.threshold_violated",
      {
        violationId: id,
        orgId: input.orgId,
        agentId: input.agentId,
        violationType: "confidence_threshold",
        threshold: CONFIDENCE_THRESHOLD,
        actual: input.callMeta.confidence,
      },
      ctx,
    );

    return { passed: false, escalated: true };
  }

  async recordFP(input: {
    orgId: string;
    agentId: string;
    callId: string;
    reason?: string;
  }): Promise<void> {
    const ctx = makeCtx();

    await this.db
      .prepare(
        `INSERT INTO ethics_violations (id, org_id, agent_id, violation_type, threshold_value, actual_value, metadata)
         VALUES (?, ?, ?, 'fp_burst', 0, 1, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.orgId,
        input.agentId,
        JSON.stringify({ callId: input.callId, reason: input.reason ?? "" }),
      )
      .run();

    await this.auditBus.emit(
      "ethics.fp_recorded",
      { orgId: input.orgId, agentId: input.agentId, callId: input.callId },
      ctx,
    );
  }

  async getKillSwitchState(
    orgId: string,
    agentId: string,
  ): Promise<KillSwitchState | null> {
    const row = await this.db
      .prepare(`SELECT * FROM kill_switch_state WHERE org_id = ? AND agent_id = ?`)
      .bind(orgId, agentId)
      .first<Record<string, unknown>>();
    return row ? mapKillSwitchRow(row) : null;
  }

  async triggerKillSwitch(input: {
    orgId: string;
    agentId: string;
    active: boolean;
    reason?: string;
  }): Promise<KillSwitchState> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const ctx = makeCtx();

    await this.db
      .prepare(
        `INSERT INTO kill_switch_state (id, org_id, agent_id, active, reason, activated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (org_id, agent_id) DO UPDATE SET
           active = excluded.active,
           reason = excluded.reason,
           activated_at = CASE WHEN excluded.active = 1 THEN ? ELSE activated_at END,
           deactivated_at = CASE WHEN excluded.active = 0 THEN ? ELSE NULL END,
           updated_at = ?`,
      )
      .bind(id, input.orgId, input.agentId, input.active ? 1 : 0, input.reason ?? null, now, now, now, now)
      .run();

    await this.auditBus.emit(
      "ethics.kill_switch_triggered",
      {
        orgId: input.orgId,
        agentId: input.agentId,
        active: input.active,
        reason: input.reason,
      },
      ctx,
    );

    return (await this.getKillSwitchState(input.orgId, input.agentId))!;
  }

  async getFPRate(
    orgId: string,
    agentId: string,
    days = 7,
  ): Promise<FPRateResult> {
    const since = Date.now() - days * 86400 * 1000;

    const total = await this.db
      .prepare(`SELECT COUNT(*) as cnt FROM audit_events WHERE tenant_id = ? AND timestamp >= ?`)
      .bind(orgId, since)
      .first<{ cnt: number }>();

    const fp = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM ethics_violations
         WHERE org_id = ? AND agent_id = ? AND violation_type = 'fp_burst' AND created_at >= ?`,
      )
      .bind(orgId, agentId, since)
      .first<{ cnt: number }>();

    const totalCalls = total?.cnt ?? 0;
    const fpCount = fp?.cnt ?? 0;

    return {
      agentId,
      totalCalls,
      fpCount,
      fpRate: totalCalls ? fpCount / totalCalls : 0,
      windowDays: days,
    };
  }
}
