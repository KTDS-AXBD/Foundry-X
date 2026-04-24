// ─── F406: GateXEventBridge — Gate-X 검증 이벤트 연동 (Sprint 191) ───

import { D1EventBus } from '@foundry-x/shared';
import type {
  ValidationCompletedPayload,
  ValidationRejectedPayload,
  BizItemStageChangedPayload,
} from '@foundry-x/shared';

export class GateXEventBridge {
  constructor(private readonly bus: D1EventBus) {}

  /** Gate-X validation.completed 이벤트 → D1EventBus 발행 */
  async publishValidationCompleted(
    params: ValidationCompletedPayload & { tenantId: string },
  ): Promise<void> {
    const { tenantId, ...payload } = params;
    await this.bus.publish(
      {
        id: `vcomp-${crypto.randomUUID().slice(0, 8)}`,
        type: 'validation.completed',
        source: 'gate',
        timestamp: new Date().toISOString(),
        payload,
      },
      tenantId,
    );
  }

  /** Gate-X validation.rejected 이벤트 → D1EventBus 발행 */
  async publishValidationRejected(
    params: ValidationRejectedPayload & { tenantId: string },
  ): Promise<void> {
    const { tenantId, ...payload } = params;
    await this.bus.publish(
      {
        id: `vrej-${crypto.randomUUID().slice(0, 8)}`,
        type: 'validation.rejected',
        source: 'gate',
        timestamp: new Date().toISOString(),
        payload,
      },
      tenantId,
    );
  }

  /** Foundry-X → Gate-X: biz-item.stage-changed 구독 */
  subscribeStageChanged(
    handler: (payload: BizItemStageChangedPayload) => Promise<void>,
  ): void {
    this.bus.subscribe('biz-item.stage-changed', async (event) => {
      await handler(event.payload as BizItemStageChangedPayload);
    });
  }
}
