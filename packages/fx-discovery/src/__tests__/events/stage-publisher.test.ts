/**
 * F568: StagePublisher TDD Red Phase (FX-REQ-611)
 * Discovery biz-item 스테이지 변경 시 domain_events에 이벤트 발행 검증
 */
import { describe, it, expect, vi } from "vitest";
import { StagePublisher } from "../../events/stage-publisher.js";
import type { D1Database } from "@cloudflare/workers-types";

const makeD1Mock = () => {
  const runMock = vi.fn().mockResolvedValue({ success: true });
  const bindMock = vi.fn().mockReturnValue({ run: runMock });
  const prepareMock = vi.fn().mockReturnValue({ bind: bindMock });
  return { db: { prepare: prepareMock } as unknown as D1Database, runMock, bindMock, prepareMock };
};

describe("StagePublisher — F568 TDD Red", () => {
  it("stage 변경 시 biz-item.stage-changed 이벤트를 domain_events에 INSERT한다", async () => {
    const { db, prepareMock } = makeD1Mock();
    const publisher = new StagePublisher(db);

    await publisher.publishIfComplete("biz-123", "org-1", "DISCOVERY", "FORMALIZATION");

    expect(prepareMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO domain_events"));
  });

  it("payload에 bizItemId, fromStage, toStage, orgId가 포함된다", async () => {
    const { db, bindMock } = makeD1Mock();
    const publisher = new StagePublisher(db);

    await publisher.publishIfComplete("biz-456", "org-2", "REGISTERED", "DISCOVERY");

    const callArgs = bindMock.mock.calls[0];
    expect(callArgs).toBeDefined();
    if (!callArgs) throw new Error("bindMock not called");
    // callArgs[2] = source, callArgs[4] = payload JSON string
    const payload = JSON.parse(callArgs[4] as string);
    expect(payload.bizItemId).toBe("biz-456");
    expect(payload.fromStage).toBe("REGISTERED");
    expect(payload.toStage).toBe("DISCOVERY");
    expect(payload.orgId).toBe("org-2");
  });

  it("event source가 'foundry-x'다", async () => {
    const { db, bindMock } = makeD1Mock();
    const publisher = new StagePublisher(db);

    await publisher.publishIfComplete("biz-789", "org-3", "DISCOVERY", "FORMALIZATION");

    const callArgs = bindMock.mock.calls[0];
    if (!callArgs) throw new Error("bindMock not called");
    expect(callArgs[2]).toBe("foundry-x");
  });

  it("event type이 'biz-item.stage-changed'다", async () => {
    const { db, bindMock } = makeD1Mock();
    const publisher = new StagePublisher(db);

    await publisher.publishIfComplete("biz-001", "org-1", null, "DISCOVERY");

    const callArgs = bindMock.mock.calls[0];
    if (!callArgs) throw new Error("bindMock not called");
    expect(callArgs[1]).toBe("biz-item.stage-changed");
  });

  it("fromStage가 null이어도 (최초 스테이지) 이벤트를 발행한다", async () => {
    const { db, prepareMock } = makeD1Mock();
    const publisher = new StagePublisher(db);

    await publisher.publishIfComplete("biz-new", "org-1", null, "REGISTERED");

    expect(prepareMock).toHaveBeenCalled();
  });

  it("DB 실패 시 throw하지 않고 로그만 남긴다 (fire-and-forget)", async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error("D1 error")),
        }),
      }),
    } as unknown as D1Database;
    const publisher = new StagePublisher(db);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      publisher.publishIfComplete("biz-fail", "org-1", "DISCOVERY", "FORMALIZATION"),
    ).resolves.not.toThrow();

    consoleSpy.mockRestore();
  });
});
