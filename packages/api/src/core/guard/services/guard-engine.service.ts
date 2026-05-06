import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import { PolicyEngine } from "../../policy/types.js";
import type {
  GuardCheckRequest,
  GuardCheckResponse,
  GuardViolation,
} from "../types.js";
import { computeHmacSignature, generateULID } from "./hmac.js";

export class GuardEngine {
  constructor(
    private readonly db: D1Database,
    private readonly policyEngine: Pick<PolicyEngine, "evaluate">,
    private readonly auditBus: Pick<AuditBus, "emit">,
    private readonly hmacKey: string,
  ) {}

  async check(request: GuardCheckRequest): Promise<GuardCheckResponse> {
    const checkId = generateULID();
    const decidedAt = Date.now();

    const policyResult = await this.policyEngine.evaluate(
      request.context.orgId,
      request.actionType,
      request.metadata ?? {},
    );

    const allowed = policyResult.allowed;
    const violations: GuardViolation[] = allowed
      ? []
      : [
          {
            policyId: policyResult.policyId,
            reason: policyResult.reason,
            severity: "warning",
          },
        ];

    const sigPayload = `${checkId}|${request.context.orgId}|${request.actionType}|${allowed ? "1" : "0"}|${decidedAt}`;
    const hmacSignature = await computeHmacSignature(sigPayload, this.hmacKey);

    const ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
    await this.auditBus.emit(
      "guard.checked",
      {
        checkId,
        orgId: request.context.orgId,
        actionType: request.actionType,
        allowed,
        policyId: policyResult.policyId,
        violations,
      },
      ctx,
      request.context.actor,
      request.context.tenantId,
    );

    await this.db
      .prepare(
        `INSERT INTO guard_decisions
          (id, check_id, org_id, tenant_id, action_type, policy_id, violation, hmac_signature, actor, metadata, decided_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        checkId,
        checkId,
        request.context.orgId,
        request.context.tenantId ?? null,
        request.actionType,
        policyResult.policyId,
        allowed ? 0 : 1,
        hmacSignature,
        request.context.actor ?? null,
        JSON.stringify(request.metadata ?? {}),
        decidedAt,
      )
      .run();

    return {
      checkId,
      allowed,
      violations,
      hmacSignature,
      auditEventId: null,
      decidedAt,
    };
  }
}
