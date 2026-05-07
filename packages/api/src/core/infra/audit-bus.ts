// F606: Audit Log Bus — W3C Trace Context + HMAC SHA256 + append-only D1

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

export interface AuditEventRow {
  id: number;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  event_type: string;
  timestamp: number;
  tenant_id?: string;
  actor?: string;
  payload: string;
  hmac_signature: string;
  created_at: number;
}

const HEX = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export function generateTraceId(): string {
  return HEX(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export function generateSpanId(): string {
  return HEX(crypto.getRandomValues(new Uint8Array(8)).buffer);
}

export function parseTraceparent(header: string): TraceContext | null {
  if (!header) return null;
  const parts = header.split("-");
  if (parts.length !== 4) return null;
  const version = parts[0];
  const traceId = parts[1] ?? "";
  const spanId = parts[2] ?? "";
  const flags = parts[3] ?? "";
  if (version !== "00") return null;
  if (!/^[0-9a-f]{32}$/.test(traceId)) return null;
  if (!/^[0-9a-f]{16}$/.test(spanId)) return null;
  return { traceId, spanId, parentSpanId: spanId, sampled: flags === "01" };
}

export function buildTraceparent(ctx: TraceContext): string {
  const flags = ctx.sampled ? "01" : "00";
  return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
}

export class AuditBus {
  private keyPromise: Promise<CryptoKey>;

  constructor(
    private readonly db: D1Database,
    hmacKey: string,
  ) {
    if (!hmacKey || hmacKey.length === 0) {
      throw new Error(
        "AuditBus: hmacKey must be a non-empty string. " +
          "Set AUDIT_HMAC_KEY env var or pass an explicit fallback at call site.",
      );
    }
    this.keyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(hmacKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }

  async sign(eventType: string, payload: unknown, traceId: string): Promise<string> {
    const key = await this.keyPromise;
    const message = `${eventType}:${traceId}:${JSON.stringify(payload)}`;
    const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    return HEX(buf);
  }

  async emit(
    eventType: string,
    payload: unknown,
    ctx: TraceContext,
    actor?: string,
    tenantId?: string,
  ): Promise<void> {
    const hmac = await this.sign(eventType, payload, ctx.traceId);
    const now = Date.now();
    await this.db
      .prepare(
        `INSERT INTO audit_events (trace_id, span_id, parent_span_id, event_type, timestamp, tenant_id, actor, payload, hmac_signature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        ctx.traceId,
        ctx.spanId,
        ctx.parentSpanId ?? null,
        eventType,
        now,
        tenantId ?? null,
        actor ?? null,
        JSON.stringify(payload),
        hmac,
      )
      .run();
  }

  async queryByTrace(traceId: string): Promise<AuditEventRow[]> {
    const result = await this.db
      .prepare("SELECT * FROM audit_events WHERE trace_id = ? ORDER BY timestamp ASC")
      .bind(traceId)
      .all<AuditEventRow>();
    return result.results ?? [];
  }
}
