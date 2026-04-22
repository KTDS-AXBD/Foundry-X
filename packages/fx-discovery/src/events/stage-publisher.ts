/**
 * F568: StagePublisher — biz-item 스테이지 변경 시 domain_events에 이벤트 발행 (FX-REQ-611)
 * Fire-and-forget: 발행 실패가 API 응답에 영향 없음
 */
import type { D1Database } from "@cloudflare/workers-types";
import { D1EventBus, type D1LikeDatabase } from "@foundry-x/harness-kit";
import { randomUUID } from "crypto";

export class StagePublisher {
  private readonly bus: D1EventBus;

  constructor(db: D1Database) {
    this.bus = new D1EventBus(db as unknown as D1LikeDatabase);
  }

  async publishIfComplete(
    bizItemId: string,
    orgId: string,
    fromStage: string | null,
    toStage: string,
  ): Promise<void> {
    try {
      await this.bus.publish(
        {
          id: randomUUID(),
          type: "biz-item.stage-changed",
          source: "foundry-x",
          timestamp: new Date().toISOString(),
          payload: { bizItemId, fromStage, toStage, orgId },
        },
        orgId,
      );
    } catch (err) {
      console.error("[StagePublisher] event publish failed (fire-and-forget):", err);
    }
  }
}
