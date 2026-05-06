import { AuditBus, generateTraceId, generateSpanId } from "../../infra/audit-bus.js";
import type { AutomationActionType, PolicyEvaluation } from "../types.js";

export class PolicyEngine {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: Pick<AuditBus, "emit">,
  ) {}

  async evaluate(
    orgId: string,
    actionType: AutomationActionType,
    context: Record<string, unknown> = {},
  ): Promise<PolicyEvaluation> {
    const row = await this.db
      .prepare(
        `SELECT id, allowed, reason FROM automation_policies WHERE org_id = ? AND action_type = ?`,
      )
      .bind(orgId, actionType)
      .first<{ id: string; allowed: number; reason: string | null }>();

    const allowed = row?.allowed === 1;
    const reason =
      row?.reason ?? (row ? "denied by policy" : "default-deny: no policy registered");
    const policyId = row?.id ?? null;
    const evaluatedAt = Date.now();

    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };

    await this.auditBus.emit("policy.evaluated", { orgId, actionType, allowed, policyId, context }, ctx);

    if (!allowed) {
      const violationId = crypto.randomUUID();
      await this.db
        .prepare(
          `INSERT INTO policy_violations (id, org_id, action_type, reason, metadata)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(violationId, orgId, actionType, reason, JSON.stringify(context))
        .run();

      await this.auditBus.emit("policy.violation", { violationId, orgId, actionType, reason }, ctx);
    }

    return { allowed, reason, policyId, evaluatedAt };
  }

  async registerPolicy(input: {
    orgId: string;
    actionType: AutomationActionType;
    allowed: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO automation_policies (id, org_id, action_type, allowed, reason, metadata)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (org_id, action_type) DO UPDATE SET
           allowed = excluded.allowed,
           reason = excluded.reason,
           metadata = excluded.metadata,
           updated_at = unixepoch('now') * 1000`,
      )
      .bind(
        id,
        input.orgId,
        input.actionType,
        input.allowed ? 1 : 0,
        input.reason ?? null,
        JSON.stringify(input.metadata ?? {}),
      )
      .run();
    return { id };
  }
}
