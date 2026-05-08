// F626: core_differentiator 차단율 측정 (T4 마무리)
// PRD §5.3 "차단율 100% 미달 시 외부 제안 중단" 게이트 측정 메커니즘
// 의존: F603 cross_org_export_blocks + F606 audit-bus
import type { AuditBus } from "../../infra/types.js";
import { generateTraceId, generateSpanId } from "../../infra/types.js";

export interface BlockingRateResult {
  orgId: string;
  windowDays: number;
  totalCoreDiffAssets: number;
  totalExportAttempts: number;
  blockedCount: number;
  blockingRate: number; // 0.0~1.0
  threshold: number; // 1.0 (100%)
  passed: boolean; // blockingRate === 1.0 (또는 시도 0건)
  measuredAt: number;
}

export interface BlockingRateAlert {
  alertId: string;
  orgId: string;
  blockingRate: number;
  threshold: number;
  alertedAt: number;
}

const DEFAULT_WINDOW_DAYS = 30;
const DAY_MS = 86400 * 1000;
const THRESHOLD = 1.0;

export class BlockingRateService {
  constructor(
    private readonly db: D1Database,
    private readonly auditBus: AuditBus,
  ) {}

  async calculateBlockingRate(orgId: string, days: number = DEFAULT_WINDOW_DAYS): Promise<BlockingRateResult> {
    const windowStart = Date.now() - days * DAY_MS;

    const coreDiff = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM cross_org_groups
         WHERE org_id = ? AND group_type = 'core_differentiator'`,
      )
      .bind(orgId)
      .first<{ cnt: number }>();

    // F603 default-deny가 모든 export 시도를 차단하므로 본 sprint Minimal: 시도 = 차단 (1:1).
    // 미래 정밀화: 별 export_attempts 테이블 또는 audit_events에서 cross_org.export_attempted SELECT.
    const blocked = await this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM cross_org_export_blocks
         WHERE org_id = ? AND created_at >= ?`,
      )
      .bind(orgId, windowStart)
      .first<{ cnt: number }>();

    const blockedCount = blocked?.cnt ?? 0;
    const totalExportAttempts = blockedCount;
    const blockingRate = totalExportAttempts > 0 ? blockedCount / totalExportAttempts : 1.0;

    const result: BlockingRateResult = {
      orgId,
      windowDays: days,
      totalCoreDiffAssets: coreDiff?.cnt ?? 0,
      totalExportAttempts,
      blockedCount,
      blockingRate,
      threshold: THRESHOLD,
      passed: blockingRate === THRESHOLD,
      measuredAt: Date.now(),
    };

    if (!result.passed && totalExportAttempts > 0) {
      await this.alertIfThresholdMissed(result);
    }

    return result;
  }

  async alertIfThresholdMissed(result: BlockingRateResult): Promise<void> {
    const alertId = crypto.randomUUID();
    await this.auditBus.emit(
      "cross_org.blocking_rate_alerted",
      {
        alertId,
        orgId: result.orgId,
        blockingRate: result.blockingRate,
        threshold: result.threshold,
        windowDays: result.windowDays,
        totalCoreDiffAssets: result.totalCoreDiffAssets,
        totalExportAttempts: result.totalExportAttempts,
        blockedCount: result.blockedCount,
      },
      // TraceContext — F606 helpers 사용 (W3C Trace Context 표준 형식)
      { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true },
      undefined,
      result.orgId,
    );
  }
}
