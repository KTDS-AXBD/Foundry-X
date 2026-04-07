// ─── F406: GateXEventBridge 단위 테스트 (Sprint 191) ───

import { describe, it, expect, vi } from "vitest";
import { GateXEventBridge } from "../modules/gate/services/gate-event-bridge.js";
import { D1EventBus } from "@foundry-x/shared";

function makeBusMock() {
  const published: unknown[] = [];
  const subscribed: Array<{ type: string; handler: Function }> = [];

  const bus = {
    publish: vi.fn(async (event: unknown) => { published.push(event); }),
    subscribe: vi.fn((type: string, handler: Function) => { subscribed.push({ type, handler }); }),
    published,
    subscribed,
  } as unknown as D1EventBus;

  return bus;
}

describe("GateXEventBridge (F406)", () => {
  it("publishValidationCompleted — validation.completed 이벤트를 발행한다", async () => {
    const bus = makeBusMock();
    const bridge = new GateXEventBridge(bus);

    await bridge.publishValidationCompleted({
      validationId: "v-001",
      bizItemId: "biz-001",
      score: 85,
      verdict: "CONDITIONAL",
      orgId: "org-001",
      tenantId: "tenant-001",
    });

    expect(bus.publish).toHaveBeenCalledOnce();
    const [event, tenantId] = (bus.publish as any).mock.calls[0];
    expect(event.type).toBe("validation.completed");
    expect(event.source).toBe("gate");
    expect(event.payload.verdict).toBe("CONDITIONAL");
    expect(tenantId).toBe("tenant-001");
  });

  it("publishValidationRejected — validation.rejected 이벤트를 발행한다", async () => {
    const bus = makeBusMock();
    const bridge = new GateXEventBridge(bus);

    await bridge.publishValidationRejected({
      validationId: "v-002",
      bizItemId: "biz-002",
      reason: "스코어 기준 미달",
      orgId: "org-001",
      tenantId: "tenant-001",
    });

    expect(bus.publish).toHaveBeenCalledOnce();
    const [event] = (bus.publish as any).mock.calls[0];
    expect(event.type).toBe("validation.rejected");
    expect(event.payload.reason).toBe("스코어 기준 미달");
  });

  it("subscribeStageChanged — biz-item.stage-changed 구독을 등록한다", () => {
    const bus = makeBusMock();
    const bridge = new GateXEventBridge(bus);

    const handler = vi.fn();
    bridge.subscribeStageChanged(handler);

    expect(bus.subscribe).toHaveBeenCalledOnce();
    const [type] = (bus.subscribe as any).mock.calls[0];
    expect(type).toBe("biz-item.stage-changed");
  });
});
