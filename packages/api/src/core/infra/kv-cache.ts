interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

export class KVCacheService {
  private defaultTTL = 300;

  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.kv.get(key, "text");
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      return entry.data ?? null;
    } catch {
      // Corrupted cache entry — treat as cache miss
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
    };
    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: ttlSeconds ?? this.defaultTTL,
    });
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async invalidate(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}
