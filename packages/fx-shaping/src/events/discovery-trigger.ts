/**
 * F568: DiscoveryTrigger — Discovery→Shaping 트리거 핸들러 (FX-REQ-611)
 * PoC 범위: FORMALIZATION 스테이지 도달 이벤트 수신 시 shaping 워크플로우 트리거 기록
 * 실전 전환(Phase 46+): 실제 shaping API 호출로 교체
 */
import type { D1Database } from "@cloudflare/workers-types";
import { D1EventBus, type D1LikeDatabase } from "@foundry-x/harness-kit";

export interface TriggerResult {
  triggered: number;
  processed: number;
}

export class DiscoveryTrigger {
  private readonly bus: D1EventBus;
  private triggered = 0;

  constructor(db: D1Database) {
    this.bus = new D1EventBus(db as unknown as D1LikeDatabase);

    this.bus.subscribe("biz-item.stage-changed", async (event) => {
      const payload = event.payload as { toStage?: string; bizItemId?: string; orgId?: string };
      if (payload.toStage === "FORMALIZATION") {
        console.log(
          `[DiscoveryTrigger] Shaping 트리거: bizItemId=${payload.bizItemId} org=${payload.orgId}`,
        );
        this.triggered++;
      }
    });
  }

  async poll(limit = 50): Promise<TriggerResult> {
    this.triggered = 0;
    const processed = await this.bus.poll(limit);
    return { triggered: this.triggered, processed };
  }
}
