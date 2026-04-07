// ─── F406: 이벤트 유실 복구 메커니즘 단위 테스트 (Sprint 191) ───

import { describe, it, expect, beforeEach } from "vitest";
import { D1EventBus } from "@foundry-x/shared";
import type { DomainEventEnvelope } from "@foundry-x/shared";

/* ------------------------------------------------------------------ */
/*  확장된 In-memory D1 stub (retry_count, last_error, next_retry_at)  */
/* ------------------------------------------------------------------ */

type RowShape = {
  id: string;
  type: string;
  source: string;
  tenant_id: string;
  payload: string;
  metadata: string | null;
  created_at: string;
  status: string;
  retry_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  processed_at: string | null;
};

let rows: Record<string, RowShape> = {};

function makeD1Stub() {
  return {
    prepare(query: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              const q = query.trim().toUpperCase();

              if (q.startsWith("INSERT")) {
                const a = args as (string | null)[];
                const id = a[0] as string;
                rows[id] = {
                  id,
                  type: a[1] as string,
                  source: a[2] as string,
                  tenant_id: a[3] as string,
                  payload: a[4] as string,
                  metadata: (a[5] as string | null) ?? null,
                  created_at: a[6] as string,
                  status: "pending",
                  retry_count: 0,
                  last_error: null,
                  next_retry_at: null,
                  processed_at: null,
                };
              }

              if (q.startsWith("UPDATE")) {
                // status = ?, processed_at = ? WHERE id = ?  (2 binds + id)
                // status = 'failed', retry_count = ?, last_error = ?, next_retry_at = ? WHERE id = ?
                // status = 'dead_letter', last_error = ?, processed_at = ? WHERE id = ?
                // status = 'pending', retry_count = 0, ... WHERE id = ? AND status = 'dead_letter'
                const a = args as (string | number | null)[];

                if (q.includes("STATUS = 'PENDING'") || (typeof a[0] === "string" && a[0] === "pending")) {
                  const id = a[a.length - 1] as string;
                  if (rows[id]) {
                    rows[id]!.status = "pending";
                    rows[id]!.retry_count = 0;
                    rows[id]!.last_error = null;
                    rows[id]!.next_retry_at = null;
                    rows[id]!.processed_at = null;
                  }
                } else if (q.includes("STATUS = 'DEAD_LETTER'") || (typeof a[0] === "string" && a[0] === "dead_letter")) {
                  const id = a[a.length - 1] as string;
                  if (rows[id]) {
                    rows[id]!.status = "dead_letter";
                    rows[id]!.last_error = a[1] as string;
                    rows[id]!.processed_at = a[2] as string;
                  }
                } else if (q.includes("STATUS = 'FAILED'") || (typeof a[0] === "number")) {
                  // _markFailed: bind(retryCount, error, nextRetryAt, id)
                  const id = a[a.length - 1] as string;
                  if (rows[id]) {
                    rows[id]!.status = "failed";
                    rows[id]!.retry_count = a[0] as number;
                    rows[id]!.last_error = a[1] as string;
                    rows[id]!.next_retry_at = a[2] as string;
                  }
                } else {
                  // _ack: bind(status, processedAt, id)
                  const id = a[a.length - 1] as string;
                  const newStatus = a[0] as string;
                  if (rows[id]) {
                    rows[id]!.status = newStatus;
                    rows[id]!.processed_at = a[1] as string;
                  }
                }
              }

              return { success: true };
            },

            async all<T>() {
              const q = query.trim().toUpperCase();

              if (q.includes("STATUS = 'PENDING'")) {
                const results = Object.values(rows).filter(
                  (r) => r.status === "pending",
                ) as unknown as T[];
                return { results };
              }

              if (q.includes("STATUS = 'FAILED'")) {
                const nowStr = args[1] as string | undefined;
                const maxRetries = args[0] as number ?? 3;
                const results = Object.values(rows).filter((r) => {
                  if (r.status !== "failed") return false;
                  if (r.retry_count >= maxRetries) return false;
                  if (r.next_retry_at && nowStr && r.next_retry_at > nowStr) return false;
                  return true;
                }) as unknown as T[];
                return { results };
              }

              if (q.includes("STATUS = 'DEAD_LETTER'")) {
                const results = Object.values(rows).filter(
                  (r) => r.status === "dead_letter",
                ) as unknown as T[];
                return { results };
              }

              return { results: [] as T[] };
            },

            async first<T>() {
              const q = query.trim().toUpperCase();
              if (q.includes("COUNT(*)") && q.includes("STATUS = ?")) {
                const targetStatus = args[0] as string;
                const cnt = Object.values(rows).filter((r) => r.status === targetStatus).length;
                return { cnt } as T;
              }
              if (q.includes("COUNT(*)") && q.includes("PROCESSED_AT >=")) {
                const cnt = Object.values(rows).filter((r) => r.status === "processed").length;
                return { cnt } as T;
              }
              return null;
            },
          };
        },
      };
    },
  };
}

function makeEvent(id = "evt-1"): DomainEventEnvelope {
  return {
    id,
    type: "validation.completed",
    source: "gate",
    timestamp: new Date().toISOString(),
    payload: { validationId: "v1", bizItemId: "b1", score: 90, verdict: "PASS", orgId: "org1" },
  };
}

/* ------------------------------------------------------------------ */
/*  테스트                                                              */
/* ------------------------------------------------------------------ */

describe("D1EventBus — 이벤트 유실 복구 (F406)", () => {
  beforeEach(() => {
    rows = {};
  });

  describe("retry()", () => {
    it("failed 이벤트를 재처리하고 processed로 전환한다", async () => {
      const db = makeD1Stub();
      const bus = new D1EventBus(db as any);

      // 직접 failed 상태 행 삽입
      rows["evt-failed"] = {
        id: "evt-failed",
        type: "validation.completed",
        source: "gate",
        tenant_id: "t1",
        payload: JSON.stringify({ validationId: "v1", bizItemId: "b1", score: 90, verdict: "PASS", orgId: "org1" }),
        metadata: null,
        created_at: new Date().toISOString(),
        status: "failed",
        retry_count: 1,
        last_error: "timeout",
        next_retry_at: new Date(Date.now() - 1000).toISOString(), // 과거 → 즉시 재처리
        processed_at: null,
      };

      const handler = vi.fn().mockResolvedValue(undefined);
      bus.subscribe("validation.completed", handler);

      const retried = await bus.retry();

      expect(retried).toBe(1);
      expect(handler).toHaveBeenCalledOnce();
      expect(rows["evt-failed"]!.status).toBe("processed");
    });

    it("next_retry_at 미도달 이벤트는 skip한다", async () => {
      const db = makeD1Stub();
      const bus = new D1EventBus(db as any);

      rows["evt-not-yet"] = {
        id: "evt-not-yet",
        type: "biz-item.created",
        source: "discovery",
        tenant_id: "t1",
        payload: "{}",
        metadata: null,
        created_at: new Date().toISOString(),
        status: "failed",
        retry_count: 1,
        last_error: "error",
        next_retry_at: new Date(Date.now() + 60_000).toISOString(), // 미래 → skip
        processed_at: null,
      };

      const handler = vi.fn();
      bus.subscribe("biz-item.created", handler);

      const retried = await bus.retry();

      expect(retried).toBe(0);
      expect(handler).not.toHaveBeenCalled();
    });

    it("재처리 실패 시 retry_count를 증가시킨다", async () => {
      const db = makeD1Stub();
      const bus = new D1EventBus(db as any);

      rows["evt-fail2"] = {
        id: "evt-fail2",
        type: "validation.completed",
        source: "gate",
        tenant_id: "t1",
        payload: JSON.stringify({ validationId: "v2", bizItemId: "b2", score: 50, verdict: "FAIL", orgId: "org1" }),
        metadata: null,
        created_at: new Date().toISOString(),
        status: "failed",
        retry_count: 1,
        last_error: "prev error",
        next_retry_at: new Date(Date.now() - 1000).toISOString(),
        processed_at: null,
      };

      bus.subscribe("validation.completed", async () => {
        throw new Error("handler error");
      });

      await bus.retry();

      expect(rows["evt-fail2"]!.retry_count).toBe(2);
      expect(rows["evt-fail2"]!.status).toBe("failed");
      expect(rows["evt-fail2"]!.last_error).toContain("handler error");
    });

    it("retry_count >= maxRetries 이면 dead_letter로 이관한다", async () => {
      const db = makeD1Stub();
      const bus = new D1EventBus(db as any);

      rows["evt-max"] = {
        id: "evt-max",
        type: "validation.completed",
        source: "gate",
        tenant_id: "t1",
        payload: JSON.stringify({ validationId: "v3", bizItemId: "b3", score: 0, verdict: "FAIL", orgId: "org1" }),
        metadata: null,
        created_at: new Date().toISOString(),
        status: "failed",
        retry_count: 2, // 2 + 1 = 3 = maxRetries → dead_letter
        last_error: "repeated error",
        next_retry_at: new Date(Date.now() - 1000).toISOString(),
        processed_at: null,
      };

      bus.subscribe("validation.completed", async () => {
        throw new Error("still failing");
      });

      await bus.retry();

      expect(rows["evt-max"]!.status).toBe("dead_letter");
    });
  });

  describe("getDLQ() + reprocess()", () => {
    it("dead_letter 이벤트를 조회한다", async () => {
      const db = makeD1Stub();
      const bus = new D1EventBus(db as any);

      rows["evt-dlq"] = {
        id: "evt-dlq",
        type: "offering.generated",
        source: "launch",
        tenant_id: "t1",
        payload: "{}",
        metadata: null,
        created_at: new Date().toISOString(),
        status: "dead_letter",
        retry_count: 3,
        last_error: "max retries exceeded",
        next_retry_at: null,
        processed_at: new Date().toISOString(),
      };

      const dlq = await bus.getDLQ();

      expect(dlq).toHaveLength(1);
      expect(dlq[0]!.id).toBe("evt-dlq");
    });

    it("reprocess()는 dead_letter 이벤트를 pending으로 초기화한다", async () => {
      const db = makeD1Stub();
      const bus = new D1EventBus(db as any);

      rows["evt-reprocess"] = {
        id: "evt-reprocess",
        type: "prototype.created",
        source: "launch",
        tenant_id: "t1",
        payload: "{}",
        metadata: null,
        created_at: new Date().toISOString(),
        status: "dead_letter",
        retry_count: 3,
        last_error: "old error",
        next_retry_at: null,
        processed_at: new Date().toISOString(),
      };

      await bus.reprocess("evt-reprocess");

      expect(rows["evt-reprocess"]!.status).toBe("pending");
      expect(rows["evt-reprocess"]!.retry_count).toBe(0);
      expect(rows["evt-reprocess"]!.last_error).toBeNull();
    });
  });

  describe("getStatus()", () => {
    it("각 상태별 이벤트 건수를 반환한다", async () => {
      const db = makeD1Stub();
      const bus = new D1EventBus(db as any);

      const now = new Date().toISOString();
      rows["p1"] = { id: "p1", type: "biz-item.created", source: "discovery", tenant_id: "t1", payload: "{}", metadata: null, created_at: now, status: "pending", retry_count: 0, last_error: null, next_retry_at: null, processed_at: null };
      rows["f1"] = { ...rows["p1"]!, id: "f1", status: "failed" };
      rows["d1"] = { ...rows["p1"]!, id: "d1", status: "dead_letter" };

      const status = await bus.getStatus();

      expect(status.pending).toBe(1);
      expect(status.failed).toBe(1);
      expect(status.dead_letter).toBe(1);
    });
  });
});

import { vi } from "vitest";
