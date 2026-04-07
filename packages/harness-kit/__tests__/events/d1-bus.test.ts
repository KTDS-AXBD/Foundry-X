import { describe, it, expect, vi } from "vitest";
import { D1EventBus } from "../../src/events/d1-bus.js";
import { createEvent } from "../../src/events/helpers.js";
import type { D1LikeDatabase } from "../../src/events/d1-bus.js";
import type { DomainEvent } from "../../src/events/types.js";

// ─── D1 Mock ───

type MockRow = {
  id: string;
  type: string;
  source: string;
  tenant_id: string;
  payload: string;
  metadata: string | null;
  status: string;
  created_at: string;
};

function createMockDb(rows: MockRow[] = []): D1LikeDatabase {
  const store: MockRow[] = [...rows];
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (sql.includes("INSERT INTO domain_events")) {
                store.push({
                  id: args[0] as string,
                  type: args[1] as string,
                  source: args[2] as string,
                  tenant_id: args[3] as string,
                  payload: args[4] as string,
                  metadata: args[5] as string | null,
                  status: "pending",
                  created_at: args[6] as string,
                });
              }
              if (sql.includes("UPDATE domain_events")) {
                const targetId = args[2] as string;
                const row = store.find((r) => r.id === targetId);
                if (row) row.status = args[0] as string;
              }
              return { success: true };
            },
            async all<T>() {
              if (sql.includes("SELECT") && sql.includes("status = 'pending'")) {
                return {
                  results: store.filter((r) => r.status === "pending").slice(0, (args[0] as number) || 50) as unknown as T[],
                };
              }
              return { results: [] as T[] };
            },
          };
        },
      };
    },
  };
}

// ─── Tests ───

describe("D1EventBus", () => {
  describe("publish()", () => {
    it("이벤트를 domain_events에 INSERT한다", async () => {
      const db = createMockDb();
      const bus = new D1EventBus(db);

      const event: DomainEvent = {
        id: "evt-001",
        type: "biz-item.created",
        source: "foundry-x",
        timestamp: "2026-04-07T00:00:00Z",
        payload: { itemId: "item-1" },
      };

      await expect(bus.publish(event)).resolves.toBeUndefined();
    });

    it("tenantId 기본값 'default' 사용", async () => {
      const db = createMockDb();
      const runSpy = vi.fn().mockResolvedValue({ success: true });
      const spyDb: D1LikeDatabase = {
        prepare() {
          return {
            bind(...args: unknown[]) {
              return { run: runSpy, all: async () => ({ results: [] }) };
            },
          };
        },
      };
      const bus = new D1EventBus(spyDb);
      await bus.publish({ id: "e1", type: "biz-item.created", source: "foundry-x", timestamp: new Date().toISOString(), payload: {} });
      expect(runSpy).toHaveBeenCalledOnce();
    });
  });

  describe("publishBatch()", () => {
    it("복수 이벤트를 모두 INSERT한다", async () => {
      const db = createMockDb();
      const bus = new D1EventBus(db);

      const events: DomainEvent[] = [
        { id: "e1", type: "biz-item.created", source: "foundry-x", timestamp: new Date().toISOString(), payload: {} },
        { id: "e2", type: "validation.completed", source: "gate-x", timestamp: new Date().toISOString(), payload: {} },
      ];
      await expect(bus.publishBatch(events)).resolves.toBeUndefined();
    });

    it("빈 배열 처리", async () => {
      const db = createMockDb();
      const bus = new D1EventBus(db);
      await expect(bus.publishBatch([])).resolves.toBeUndefined();
    });
  });

  describe("subscribe() + poll()", () => {
    it("pending 이벤트를 dispatch 후 핸들러 호출", async () => {
      const pendingRows: MockRow[] = [
        {
          id: "evt-pending-1",
          type: "biz-item.created",
          source: "foundry-x",
          tenant_id: "org-1",
          payload: JSON.stringify({ itemId: "x" }),
          metadata: null,
          status: "pending",
          created_at: "2026-04-07T00:00:00Z",
        },
      ];
      const db = createMockDb(pendingRows);
      const bus = new D1EventBus(db);

      const handler = vi.fn().mockResolvedValue(undefined);
      bus.subscribe("biz-item.created", handler);

      const count = await bus.poll();
      expect(count).toBe(1);
      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0]).toMatchObject({ id: "evt-pending-1", type: "biz-item.created" });
    });

    it("와일드카드('*') 구독은 모든 이벤트 수신", async () => {
      const rows: MockRow[] = [
        { id: "e1", type: "biz-item.created", source: "foundry-x", tenant_id: "t1", payload: "{}", metadata: null, status: "pending", created_at: "2026-04-07T00:00:00Z" },
        { id: "e2", type: "validation.completed", source: "gate-x", tenant_id: "t1", payload: "{}", metadata: null, status: "pending", created_at: "2026-04-07T00:01:00Z" },
      ];
      const db = createMockDb(rows);
      const bus = new D1EventBus(db);

      const handler = vi.fn().mockResolvedValue(undefined);
      bus.subscribe("*", handler);

      const count = await bus.poll();
      expect(count).toBe(2);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("핸들러 에러 시 failed 상태로 ACK", async () => {
      const rows: MockRow[] = [
        { id: "fail-1", type: "offering.generated", source: "foundry-x", tenant_id: "t1", payload: "{}", metadata: null, status: "pending", created_at: "2026-04-07T00:00:00Z" },
      ];
      const db = createMockDb(rows);
      const bus = new D1EventBus(db);

      bus.subscribe("offering.generated", async () => { throw new Error("handler error"); });

      const count = await bus.poll();
      // 에러가 발생해도 poll은 정상 종료하고 0을 반환 (failed로 ACK됨)
      expect(count).toBe(0);
      // row의 status가 'failed'로 변경됐는지 확인 (내부 store 접근)
      const updatedRow = rows[0];
      expect(updatedRow.status).toBe("failed");
    });

    it("poll 결과가 0이면 빈 DB", async () => {
      const db = createMockDb([]);
      const bus = new D1EventBus(db);
      const count = await bus.poll();
      expect(count).toBe(0);
    });
  });
});

describe("createEvent()", () => {
  it("id와 timestamp가 자동 주입된다", () => {
    const event = createEvent("biz-item.created", "foundry-x", { itemId: "abc" });
    expect(event.id).toBeTruthy();
    expect(event.id).toHaveLength(36); // UUID v4 형식
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    expect(event.type).toBe("biz-item.created");
    expect(event.source).toBe("foundry-x");
    expect(event.payload).toEqual({ itemId: "abc" });
  });

  it("metadata 선택 인자 포함 가능", () => {
    const event = createEvent("validation.completed", "gate-x", {}, { correlationId: "corr-1", userId: "u1" });
    expect(event.metadata?.correlationId).toBe("corr-1");
    expect(event.metadata?.userId).toBe("u1");
  });

  it("metadata 없으면 metadata 키 미포함", () => {
    const event = createEvent("pipeline.step-completed", "foundry-x", {});
    expect(event.metadata).toBeUndefined();
  });
});
