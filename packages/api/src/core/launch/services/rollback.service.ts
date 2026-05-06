// F618: Rollback — 직전 버전 추적 + launch_rollbacks 이력 (append-only)
import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import type { RollbackRecord } from "../types.js";

function makeCtx() {
  return { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
}

export class RollbackService {
  constructor(
    private db: D1Database,
    private auditBus: Pick<AuditBus, "emit">,
  ) {}

  async executeRollback(input: {
    releaseId: string;
    fromVersion: string;
    toVersion: string;
    reason: string;
    requester: string;
  }): Promise<RollbackRecord> {
    const rollbackId = crypto.randomUUID();
    const executedAt = Date.now();

    await this.db
      .prepare(
        `INSERT INTO launch_rollbacks
         (rollback_id, release_id, from_version, to_version, reason, requester, executed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(rollbackId, input.releaseId, input.fromVersion, input.toVersion, input.reason, input.requester, executedAt)
      .run();

    await this.auditBus.emit(
      "launch.rollback.completed",
      {
        rollbackId,
        releaseId: input.releaseId,
        fromVersion: input.fromVersion,
        toVersion: input.toVersion,
        requester: input.requester,
      },
      makeCtx(),
    );

    return { rollbackId, releaseId: input.releaseId, fromVersion: input.fromVersion, toVersion: input.toVersion, reason: input.reason, executedAt, requester: input.requester };
  }

  async getRollbackHistory(releaseId: string): Promise<RollbackRecord[]> {
    const result = await this.db
      .prepare(
        "SELECT rollback_id, release_id, from_version, to_version, reason, requester, executed_at FROM launch_rollbacks WHERE release_id = ? ORDER BY executed_at DESC",
      )
      .bind(releaseId)
      .all<{ rollback_id: string; release_id: string; from_version: string; to_version: string; reason: string; requester: string; executed_at: number }>();

    return (result.results ?? []).map((row) => ({
      rollbackId: row.rollback_id,
      releaseId: row.release_id,
      fromVersion: row.from_version,
      toVersion: row.to_version,
      reason: row.reason,
      requester: row.requester,
      executedAt: row.executed_at,
    }));
  }
}
