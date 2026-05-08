// F620 Sprint 367 CO-I07 — LaunchBlockingSignalService TDD
import { describe, it, expect, vi } from "vitest";
import { LaunchBlockingSignalService } from "./launch-blocking-signal.service.js";

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

describe("F620 CO-I07 LaunchBlockingSignalService", () => {
  it("notifyLaunch — signal 반환 + audit emit cross_org.launch_blocked", async () => {
    const bus = makeAuditBusMock();
    const svc = new LaunchBlockingSignalService(bus as never);

    const signal = await svc.notifyLaunch({
      blockId: "blk-1",
      releaseId: "rel-1",
      assetId: "asset-core-1",
      orgId: "org-1",
    });

    expect(signal.signalId).toBeTruthy();
    expect(signal.blockId).toBe("blk-1");
    expect(signal.releaseId).toBe("rel-1");
    expect(signal.assetId).toBe("asset-core-1");
    expect(signal.orgId).toBe("org-1");
    expect(signal.blockedAt).toBeGreaterThan(0);

    expect(bus.emit).toHaveBeenCalledOnce();
    expect(bus.emit).toHaveBeenCalledWith(
      "cross_org.launch_blocked",
      expect.objectContaining({
        signalId: signal.signalId,
        blockId: "blk-1",
        releaseId: "rel-1",
        assetId: "asset-core-1",
        orgId: "org-1",
      }),
      expect.objectContaining({
        traceId: expect.stringMatching(/^[0-9a-f]{32}$/),
        spanId: expect.stringMatching(/^[0-9a-f]{16}$/),
      }),
      undefined,
      "org-1",
    );
  });

  it("notifyLaunch — 동일 인자 두 번 호출 시 signalId 가 다름 (UUID)", async () => {
    const bus = makeAuditBusMock();
    const svc = new LaunchBlockingSignalService(bus as never);

    const a = await svc.notifyLaunch({
      blockId: "blk-1",
      releaseId: "rel-1",
      assetId: "asset-1",
      orgId: "org-1",
    });
    const b = await svc.notifyLaunch({
      blockId: "blk-1",
      releaseId: "rel-1",
      assetId: "asset-1",
      orgId: "org-1",
    });

    expect(a.signalId).not.toBe(b.signalId);
    expect(bus.emit).toHaveBeenCalledTimes(2);
  });
});
