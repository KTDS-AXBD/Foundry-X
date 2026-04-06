import { describe, it, expect } from "vitest";
import { NoopEventBus } from "../../src/events/bus.js";
import type { DomainEvent } from "../../src/events/types.js";

describe("Event Types & NoopEventBus", () => {
  it("NoopEventBus.publish should not throw", async () => {
    const bus = new NoopEventBus();
    const event: DomainEvent = {
      id: "evt-1",
      type: "biz-item.created",
      source: "foundry-x",
      timestamp: new Date().toISOString(),
      payload: { itemId: "item-1" },
    };
    await expect(bus.publish(event)).resolves.toBeUndefined();
  });

  it("NoopEventBus.publishBatch should not throw", async () => {
    const bus = new NoopEventBus();
    await expect(bus.publishBatch([])).resolves.toBeUndefined();
  });

  it("NoopEventBus.subscribe should not throw", () => {
    const bus = new NoopEventBus();
    expect(() =>
      bus.subscribe("biz-item.created", async () => {}),
    ).not.toThrow();
  });

  it("DomainEvent should accept all event types", () => {
    const event: DomainEvent<{ test: boolean }> = {
      id: "evt-2",
      type: "validation.completed",
      source: "gate-x",
      timestamp: "2026-04-07T00:00:00Z",
      payload: { test: true },
      metadata: {
        correlationId: "corr-1",
        userId: "user-1",
        orgId: "org-1",
      },
    };
    expect(event.type).toBe("validation.completed");
    expect(event.metadata?.correlationId).toBe("corr-1");
  });
});
