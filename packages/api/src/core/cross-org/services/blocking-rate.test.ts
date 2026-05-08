// F626 Sprint 364 — BlockingRateService TDD (T4 마무리)
// PRD §5.3 "차단율 100% 미달 시 외부 제안 중단" 게이트 측정
import { describe, it, expect, vi } from "vitest";
import { BlockingRateService } from "./blocking-rate.service.js";

function makeD1Mock(coreDiffCnt: number, blockedCnt: number) {
  const queries: string[] = [];
  return {
    queries,
    prepare: vi.fn().mockImplementation((sql: string) => {
      queries.push(sql);
      return {
        bind: vi.fn().mockImplementation(() => ({
          first: vi.fn().mockResolvedValue(
            sql.includes("cross_org_groups")
              ? { cnt: coreDiffCnt }
              : sql.includes("cross_org_export_blocks")
                ? { cnt: blockedCnt }
                : null,
          ),
        })),
      };
    }),
  };
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

describe("F626 BlockingRateService", () => {
  it("default-deny 100% (시도 = 차단) → rate=1.0, passed=true, audit emit 0건", async () => {
    const db = makeD1Mock(5, 5); // core_diff 자산 5개 + 차단 5건
    const bus = makeAuditBusMock();
    const svc = new BlockingRateService(db as unknown as D1Database, bus as never);

    const result = await svc.calculateBlockingRate("org-1", 30);

    expect(result.totalCoreDiffAssets).toBe(5);
    expect(result.blockedCount).toBe(5);
    expect(result.totalExportAttempts).toBe(5);
    expect(result.blockingRate).toBe(1.0);
    expect(result.threshold).toBe(1.0);
    expect(result.passed).toBe(true);
    expect(result.windowDays).toBe(30);
    expect(result.measuredAt).toBeGreaterThan(0);
    // passed=true → 알람 emit 0건 (rate=1.0이라 alertIfThresholdMissed 미호출)
    expect(bus.emit).not.toHaveBeenCalled();
    // 2 query 발행 검증 (cross_org_groups + cross_org_export_blocks)
    expect(db.queries.some((q) => q.includes("cross_org_groups"))).toBe(true);
    expect(db.queries.some((q) => q.includes("cross_org_export_blocks"))).toBe(true);
  });

  it("export 시도 0건 → rate=1.0 vacuous truth, passed=true, audit emit 0건", async () => {
    const db = makeD1Mock(3, 0);
    const bus = makeAuditBusMock();
    const svc = new BlockingRateService(db as unknown as D1Database, bus as never);

    const result = await svc.calculateBlockingRate("org-empty", 7);

    expect(result.totalExportAttempts).toBe(0);
    expect(result.blockedCount).toBe(0);
    expect(result.blockingRate).toBe(1.0); // vacuous (0건 시도 = 100% 차단으로 간주)
    expect(result.passed).toBe(true);
    expect(result.windowDays).toBe(7);
    expect(bus.emit).not.toHaveBeenCalled();
  });

  it("alertIfThresholdMissed — 직접 호출 시 audit emit 1건", async () => {
    const db = makeD1Mock(0, 0);
    const bus = makeAuditBusMock();
    const svc = new BlockingRateService(db as unknown as D1Database, bus as never);

    // 미래 시나리오 시뮬: 시도 10건 / 차단 7건 (rate=0.7)
    await svc.alertIfThresholdMissed({
      orgId: "org-bad",
      windowDays: 30,
      totalCoreDiffAssets: 5,
      totalExportAttempts: 10,
      blockedCount: 7,
      blockingRate: 0.7,
      threshold: 1.0,
      passed: false,
      measuredAt: Date.now(),
    });

    expect(bus.emit).toHaveBeenCalledTimes(1);
    expect(bus.emit).toHaveBeenCalledWith(
      "cross_org.blocking_rate_alerted",
      expect.objectContaining({
        orgId: "org-bad",
        blockingRate: 0.7,
        threshold: 1.0,
        windowDays: 30,
        totalCoreDiffAssets: 5,
        totalExportAttempts: 10,
        blockedCount: 7,
      }),
      expect.objectContaining({
        traceId: expect.stringMatching(/^[0-9a-f]{32}$/),
        spanId: expect.stringMatching(/^[0-9a-f]{16}$/),
      }),
      undefined,
      "org-bad",
    );
  });

  it("default windowDays = 30 (인자 미지정)", async () => {
    const db = makeD1Mock(1, 1);
    const bus = makeAuditBusMock();
    const svc = new BlockingRateService(db as unknown as D1Database, bus as never);

    const result = await svc.calculateBlockingRate("org-1");
    expect(result.windowDays).toBe(30);
  });
});
