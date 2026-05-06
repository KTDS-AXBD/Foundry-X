import { describe, it, expect } from "vitest";
import { KVCacheService } from "../../core/infra/kv-cache.js";

class MockKV {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe("KVCacheService", () => {
  it("get returns null for missing key, data for existing key", async () => {
    const cache = new KVCacheService(new MockKV() as unknown as KVNamespace);

    expect(await cache.get("missing")).toBeNull();

    await cache.set("key1", { value: 42 });
    expect(await cache.get("key1")).toEqual({ value: 42 });
  });

  it("getOrFetch returns cached data on hit, fetches on miss", async () => {
    const cache = new KVCacheService(new MockKV() as unknown as KVNamespace);
    let fetchCount = 0;

    const fetcher = async () => {
      fetchCount++;
      return { items: ["a", "b"] };
    };

    const first = await cache.getOrFetch("data", fetcher);
    expect(first).toEqual({ items: ["a", "b"] });
    expect(fetchCount).toBe(1);

    const second = await cache.getOrFetch("data", fetcher);
    expect(second).toEqual({ items: ["a", "b"] });
    expect(fetchCount).toBe(1); // cached, not re-fetched
  });

  it("invalidate removes cached entry", async () => {
    const cache = new KVCacheService(new MockKV() as unknown as KVNamespace);

    await cache.set("key", "value");
    expect(await cache.get("key")).toBe("value");

    await cache.invalidate("key");
    expect(await cache.get("key")).toBeNull();
  });
});
