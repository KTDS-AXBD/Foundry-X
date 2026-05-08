// F620 CO-I07: Launch-X 차단 신호 발행
// F618 Launch-X(release/publish) 시도 시 cross_org default-deny가 만든 block을 발행
// Minimal: audit emit 1 event (cross_org.launch_blocked).
// 후속 sprint(CO-I08): F618 LaunchEngine consumer 직접 호출로 release 차단까지 강제.
import { generateTraceId, generateSpanId } from "../../infra/types.js";
import type { AuditBus } from "../../infra/types.js";

export interface LaunchBlockingSignal {
  signalId: string;
  blockId: string; // cross_org_export_blocks.id
  releaseId: string;
  assetId: string;
  orgId: string;
  blockedAt: number;
}

export class LaunchBlockingSignalService {
  constructor(private readonly auditBus: AuditBus) {}

  async notifyLaunch(input: {
    blockId: string;
    releaseId: string;
    assetId: string;
    orgId: string;
  }): Promise<LaunchBlockingSignal> {
    const signal: LaunchBlockingSignal = {
      signalId: crypto.randomUUID(),
      blockId: input.blockId,
      releaseId: input.releaseId,
      assetId: input.assetId,
      orgId: input.orgId,
      blockedAt: Date.now(),
    };

    await this.auditBus.emit(
      "cross_org.launch_blocked",
      {
        signalId: signal.signalId,
        blockId: signal.blockId,
        releaseId: signal.releaseId,
        assetId: signal.assetId,
        orgId: signal.orgId,
      },
      { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true },
      undefined,
      input.orgId,
    );

    return signal;
  }
}
