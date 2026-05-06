// F624: SixHatsLLMPolicy TDD Red Phase
import { describe, it, expect, vi } from "vitest";
import { SixHatsLLMPolicy } from "../core/shaping/services/sixhats-llm-policy.js";
import type { SixHatsLLMCallContext } from "../core/shaping/services/sixhats-llm-policy.js";

const makeKVCache = () => {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, val: unknown) => { store.set(key, val as string); }),
    getOrFetch: vi.fn(),
    invalidate: vi.fn(),
    _store: store,
  };
};

const makeAuditBus = () => ({
  emit: vi.fn().mockResolvedValue(undefined),
});

const ctx: SixHatsLLMCallContext = {
  prdId: "prd-001",
  hatColor: "red",
  round: 1,
  opinionPrefix: "test opinion context",
  orgId: "org-001",
};

describe("SixHatsLLMPolicy", () => {
  it("cache miss → llm_call_required, audit NOT emitted", async () => {
    const kv = makeKVCache();
    const audit = makeAuditBus();
    const policy = new SixHatsLLMPolicy(kv as any, audit as any);

    const result = await policy.evaluateCall(ctx);

    expect(result.type).toBe("llm_call_required");
    expect(audit.emit).not.toHaveBeenCalled();
  });

  it("cache hit → returns cachedResponse, LLM call count 0, audit emitted with cacheHit=true", async () => {
    const kv = makeKVCache();
    const audit = makeAuditBus();
    const policy = new SixHatsLLMPolicy(kv as any, audit as any);

    const cacheKey = await policy.buildCacheKey(ctx);
    kv.get.mockResolvedValueOnce("cached llm response");

    const result = await policy.evaluateCall(ctx);

    expect(result.type).toBe("cache_hit");
    expect((result as Extract<typeof result, { type: "cache_hit" }>).cachedResponse).toBe("cached llm response");
    expect(audit.emit).toHaveBeenCalledOnce();
    expect(audit.emit).toHaveBeenCalledWith(
      "six_hats.llm_call",
      expect.objectContaining({ cacheHit: true, cacheKey }),
      expect.objectContaining({ traceId: expect.any(String) }),
      undefined,
      "org-001",
    );
    void cacheKey;
  });

  it("recordCall → cache.set(key, response, 3600) + audit emitted with cacheHit=false", async () => {
    const kv = makeKVCache();
    const audit = makeAuditBus();
    const policy = new SixHatsLLMPolicy(kv as any, audit as any);

    const cacheKey = await policy.buildCacheKey(ctx);
    await policy.recordCall(ctx, cacheKey, "response text", {
      costEstimate: 0.001,
      promptTokens: 100,
      completionTokens: 50,
      durationMs: 200,
    });

    expect(kv.set).toHaveBeenCalledWith(cacheKey, "response text", 3600);
    expect(audit.emit).toHaveBeenCalledOnce();
    expect(audit.emit).toHaveBeenCalledWith(
      "six_hats.llm_call",
      expect.objectContaining({ cacheHit: false, costEstimate: 0.001 }),
      expect.objectContaining({ traceId: expect.any(String) }),
      undefined,
      "org-001",
    );
  });
});
