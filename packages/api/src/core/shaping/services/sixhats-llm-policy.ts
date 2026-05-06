// F624: Six Hats LLM 호출 정책 — 캐시 + audit-bus 통합
import { KVCacheService } from "../../infra/kv-cache.js";
import { AuditBus, generateTraceId, generateSpanId } from "../../infra/audit-bus.js";
import type { TraceContext } from "../../infra/audit-bus.js";

export interface SixHatsLLMCallContext {
  prdId: string;
  hatColor: "white" | "red" | "black" | "yellow" | "green" | "blue";
  round: number;
  opinionPrefix: string;
  orgId: string;
}

export interface CallStats {
  costEstimate: number;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
}

type EvaluateResult =
  | { type: "cache_hit"; cachedResponse: string }
  | { type: "llm_call_required"; cacheKey: string };

export class SixHatsLLMPolicy {
  constructor(
    private kvCache: KVCacheService,
    private auditBus: AuditBus,
  ) {}

  async evaluateCall(ctx: SixHatsLLMCallContext): Promise<EvaluateResult> {
    const cacheKey = await this.buildCacheKey(ctx);
    const cached = await this.kvCache.get<string>(cacheKey);
    if (cached !== null) {
      await this.emitAudit(ctx, { cacheHit: true, cacheKey });
      return { type: "cache_hit", cachedResponse: cached };
    }
    return { type: "llm_call_required", cacheKey };
  }

  async recordCall(
    ctx: SixHatsLLMCallContext,
    cacheKey: string,
    response: string,
    stats: CallStats,
  ): Promise<void> {
    await this.kvCache.set(cacheKey, response, 3600);
    await this.emitAudit(ctx, { cacheHit: false, cacheKey, ...stats });
  }

  async buildCacheKey(ctx: SixHatsLLMCallContext): Promise<string> {
    const input = `${ctx.prdId}|${ctx.hatColor}|${ctx.round}|${ctx.opinionPrefix.slice(0, 64)}`;
    const hash = await sha256Hex(input);
    return `sixhats:llm:${hash.slice(0, 32)}`;
  }

  private async emitAudit(ctx: SixHatsLLMCallContext, extra: Record<string, unknown>): Promise<void> {
    const traceCtx: TraceContext = {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      sampled: false,
    };
    await this.auditBus.emit("six_hats.llm_call", { ...ctx, ...extra }, traceCtx, undefined, ctx.orgId);
  }
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
