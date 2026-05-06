// F606: AuditBus + TraceContext TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditBus, generateTraceId, generateSpanId, parseTraceparent, buildTraceparent } from "./audit-bus.js";
import type { TraceContext } from "./audit-bus.js";

// D1 mock
function makeD1Mock() {
  const rows: Record<string, unknown>[] = [];
  return {
    rows,
    prepare: vi.fn().mockImplementation(() => ({
      bind: vi.fn().mockImplementation((..._args: unknown[]) => ({
        run: vi.fn().mockResolvedValue({ success: true, meta: { last_row_id: rows.length + 1 } }),
        all: vi.fn().mockResolvedValue({ results: rows }),
        first: vi.fn().mockResolvedValue(rows[0] ?? null),
      })),
    })),
  };
}

const FAKE_KEY = "test-hmac-key-32chars-padding-ok";
const FAKE_TRACE: TraceContext = {
  traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
  spanId: "00f067aa0ba902b7",
  sampled: true,
};

describe("F606: AuditBus", () => {
  let db: ReturnType<typeof makeD1Mock>;
  let bus: AuditBus;

  beforeEach(() => {
    db = makeD1Mock();
    bus = new AuditBus(db as unknown as D1Database, FAKE_KEY);
  });

  it("T1: emit()이 HMAC 서명을 포함하여 D1 INSERT를 호출한다", async () => {
    await bus.emit("agent.run", { model: "sonnet" }, FAKE_TRACE);
    expect(db.prepare).toHaveBeenCalledOnce();
  });

  it("T2: 동일 key + payload → 동일 hmac_signature", async () => {
    const sig1 = await bus.sign("agent.run", { model: "sonnet" }, FAKE_TRACE.traceId);
    const sig2 = await bus.sign("agent.run", { model: "sonnet" }, FAKE_TRACE.traceId);
    expect(sig1).toBe(sig2);
    expect(sig1.length).toBeGreaterThan(0);
  });

  it("T3: key가 달라지면 서명이 달라진다", async () => {
    const bus2 = new AuditBus(db as unknown as D1Database, "different-key-32chars-padding-ok");
    const sig1 = await bus.sign("agent.run", { a: 1 }, FAKE_TRACE.traceId);
    const sig2 = await bus2.sign("agent.run", { a: 1 }, FAKE_TRACE.traceId);
    expect(sig1).not.toBe(sig2);
  });

  it("T4: queryByTrace가 D1에서 trace_id 기준 조회한다", async () => {
    await bus.queryByTrace(FAKE_TRACE.traceId);
    expect(db.prepare).toHaveBeenCalledOnce();
  });
});

describe("F606: TraceContext helpers", () => {
  it("T5: generateTraceId — 32 hex chars", () => {
    const id = generateTraceId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("T6: generateSpanId — 16 hex chars", () => {
    const id = generateSpanId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("T7: parseTraceparent — 유효한 traceparent 파싱", () => {
    const header = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const ctx = parseTraceparent(header);
    expect(ctx).not.toBeNull();
    expect(ctx?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(ctx?.spanId).toBe("00f067aa0ba902b7");
    expect(ctx?.sampled).toBe(true);
  });

  it("T8: parseTraceparent — 잘못된 header → null", () => {
    expect(parseTraceparent("invalid")).toBeNull();
    expect(parseTraceparent("")).toBeNull();
  });

  it("T9: buildTraceparent — 표준 형식 생성", () => {
    const ctx: TraceContext = { traceId: "a".repeat(32), spanId: "b".repeat(16), sampled: true };
    const header = buildTraceparent(ctx);
    expect(header).toBe(`00-${"a".repeat(32)}-${"b".repeat(16)}-01`);
  });
});
