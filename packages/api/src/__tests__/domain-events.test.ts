// ─── F398: D1EventBus 단위 테스트 (Sprint 185) ───

import { describe, it, expect, vi, beforeEach } from "vitest";
import { D1EventBus } from "@foundry-x/shared";
import type { DomainEventEnvelope } from "@foundry-x/shared";

/* ------------------------------------------------------------------ */
/*  In-memory D1 stub                                                  */
/* ------------------------------------------------------------------ */

type RowShape = {
  id: string; type: string; source: string;
  tenant_id: string; payload: string; metadata: string | null;
  created_at: string; status: string;
};

const rows: Record<string, RowShape> = {};

function makeD1Stub() {
  return {
    prepare(query: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (query.startsWith("INSERT")) {
                const a = args as (string | null)[];
                const id = a[0] as string;
                rows[id] = {
                  id,
                  type: a[1] as string,
                  source: a[2] as string,
                  tenant_id: a[3] as string,
                  payload: a[4] as string,
                  metadata: (a[5] as string | null) ?? null,
                  created_at: a[7] as string,
                  status: "pending",
                };
              }
              if (query.startsWith("UPDATE")) {
                const a = args as string[];
                if (query.includes("SET status = ?,")) {
                  // _ack: bind(status, processed_at, id)
                  const id = a[2];
                  if (id && rows[id]) rows[id]!.status = a[0]!;
                } else if (query.includes("status = 'failed'")) {
                  // _markFailed: bind(retryCount, error, next_retry_at, id)
                  const id = a[3];
                  if (id && rows[id]) rows[id]!.status = "failed";
                } else if (query.includes("status = 'dead_letter'")) {
                  // _moveToDLQ: bind(error, processed_at, id)
                  const id = a[2];
                  if (id && rows[id]) rows[id]!.status = "dead_letter";
                }
              }
              return { success: true };
            },
            async all<T>() {
              if (query.includes("SELECT") && query.includes("status = 'pending'")) {
                const results = Object.values(rows).filter((r) => r.status === "pending") as unknown as T[];
                return { results };
              }
              return { results: [] as T[] };
            },
          };
        },
      };
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1Stub = ReturnType<typeof makeD1Stub>;

function makeEvent(type: DomainEventEnvelope["type"] = "biz-item.created"): DomainEventEnvelope {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    type,
    source: "discovery",
    timestamp: new Date().toISOString(),
    payload: { bizItemId: "biz-1", title: "테스트", type: "I", orgId: "org-1", createdBy: "user-1" },
  };
}

describe("D1EventBus", () => {
  let bus: D1EventBus;
  let stub: D1Stub;

  beforeEach(() => {
    Object.keys(rows).forEach((k) => delete rows[k]);
    stub = makeD1Stub();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bus = new D1EventBus(stub as any);
  });

  it("publish() — D1에 이벤트 저장", async () => {
    const event = makeEvent();
    await bus.publish(event, "org-1");
    const row = rows[event.id];
    expect(row).toBeDefined();
    expect(row!.status).toBe("pending");
    expect(JSON.parse(row!.payload)).toMatchObject({ bizItemId: "biz-1" });
  });

  it("poll() — pending 이벤트를 핸들러로 전달 후 processed", async () => {
    const event = makeEvent();
    await bus.publish(event, "org-1");

    const handler = vi.fn().mockResolvedValue(undefined);
    bus.subscribe("biz-item.created", handler);

    const count = await bus.poll();
    expect(count).toBe(1);
    expect(handler).toHaveBeenCalledOnce();
    expect(rows[event.id]!.status).toBe("processed");
  });

  it("poll() — 핸들러 없으면 이벤트 그냥 처리됨 (핸들러 0개)", async () => {
    const event = makeEvent();
    await bus.publish(event, "org-1");

    const count = await bus.poll();
    expect(count).toBe(1);
    expect(rows[event.id]!.status).toBe("processed");
  });

  it("poll() — 와일드카드 핸들러('*')는 모든 이벤트 수신", async () => {
    const e1 = makeEvent("biz-item.created");
    const e2 = makeEvent("validation.completed");
    await bus.publish(e1, "org-1");
    await bus.publish(e2, "org-1");

    const handler = vi.fn().mockResolvedValue(undefined);
    bus.subscribe("*", handler);

    const count = await bus.poll();
    expect(count).toBe(2);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("poll() — 핸들러 에러 시 status=failed", async () => {
    const event = makeEvent();
    await bus.publish(event, "org-1");

    bus.subscribe("biz-item.created", async () => {
      throw new Error("handler fail");
    });

    await bus.poll();
    expect(rows[event.id]!.status).toBe("failed");
  });

  it("metadata를 포함한 이벤트 발행", async () => {
    const event: DomainEventEnvelope = {
      ...makeEvent(),
      metadata: { correlationId: "corr-1", userId: "u-1" },
    };
    await bus.publish(event, "org-1");
    const row = rows[event.id];
    expect(row!.metadata).toBeTruthy();
    const meta = JSON.parse(row!.metadata!);
    expect(meta.correlationId).toBe("corr-1");
  });
});
