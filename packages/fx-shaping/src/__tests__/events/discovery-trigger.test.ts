/**
 * F568: DiscoveryTrigger TDD Red Phase (FX-REQ-611)
 * Discovery→Shaping 트리거 핸들러 — FORMALIZATION 스테이지 도달 시 triggering 검증
 */
import { describe, it, expect, vi } from "vitest";
import { DiscoveryTrigger } from "../../events/discovery-trigger.js";
import type { D1Database } from "@cloudflare/workers-types";

const makeD1Mock = (pendingRows: Record<string, unknown>[] = []) => {
  const runMock = vi.fn().mockResolvedValue({ success: true });
  const bindMock = vi.fn().mockReturnValue({
    run: runMock,
    all: vi.fn().mockResolvedValue({ results: pendingRows }),
  });
  const prepareMock = vi.fn().mockReturnValue({ bind: bindMock });
  return { db: { prepare: prepareMock } as unknown as D1Database, runMock, prepareMock };
};

const makeStageChangedEvent = (toStage: string, id = "evt-001") => ({
  id,
  type: "biz-item.stage-changed",
  source: "discovery",
  created_at: new Date().toISOString(),
  payload: JSON.stringify({ bizItemId: "biz-001", fromStage: "DISCOVERY", toStage, orgId: "org-1" }),
  metadata: null,
});

describe("DiscoveryTrigger — F568 TDD Red", () => {
  it("pending 이벤트를 poll하여 처리한다", async () => {
    const event = makeStageChangedEvent("FORMALIZATION");
    const { db, prepareMock } = makeD1Mock([event]);
    const trigger = new DiscoveryTrigger(db);

    const result = await trigger.poll();

    expect(prepareMock).toHaveBeenCalledWith(expect.stringContaining("domain_events"));
    expect(result.processed).toBe(1);
  });

  it("toStage = FORMALIZATION 이벤트 수신 시 shaping 트리거를 기록한다", async () => {
    const event = makeStageChangedEvent("FORMALIZATION");
    const { db } = makeD1Mock([event]);
    const trigger = new DiscoveryTrigger(db);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await trigger.poll();

    expect(result.triggered).toBe(1);
    consoleSpy.mockRestore();
  });

  it("FORMALIZATION이 아닌 스테이지는 트리거하지 않는다", async () => {
    const event = makeStageChangedEvent("DISCOVERY");
    const { db } = makeD1Mock([event]);
    const trigger = new DiscoveryTrigger(db);

    const result = await trigger.poll();

    expect(result.triggered).toBe(0);
    expect(result.processed).toBe(1);
  });

  it("pending 이벤트가 없으면 0을 반환한다", async () => {
    const { db } = makeD1Mock([]);
    const trigger = new DiscoveryTrigger(db);

    const result = await trigger.poll();

    expect(result.triggered).toBe(0);
    expect(result.processed).toBe(0);
  });

  it("처리 후 이벤트를 processed 상태로 ack한다", async () => {
    const event = makeStageChangedEvent("FORMALIZATION");
    const { db, prepareMock } = makeD1Mock([event]);
    const trigger = new DiscoveryTrigger(db);

    await trigger.poll();

    const updateCall = prepareMock.mock.calls.find(
      (args) => (args[0] as string).includes("UPDATE domain_events"),
    );
    expect(updateCall).toBeDefined();
  });

  it("biz-item.stage-changed 외 이벤트 타입은 무시한다", async () => {
    const otherEvent = {
      ...makeStageChangedEvent("FORMALIZATION", "evt-002"),
      type: "offering.generated",
    };
    const { db } = makeD1Mock([otherEvent]);
    const trigger = new DiscoveryTrigger(db);

    const result = await trigger.poll();

    expect(result.triggered).toBe(0);
  });
});
