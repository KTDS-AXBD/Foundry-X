// F606: W3C Trace Context middleware
import type { MiddlewareHandler } from "hono";
import { generateTraceId, generateSpanId, parseTraceparent, buildTraceparent } from "../audit-bus.js";
import type { TraceContext } from "../audit-bus.js";

declare module "hono" {
  interface ContextVariableMap {
    traceContext: TraceContext;
  }
}

export const traceContextMiddleware: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header("traceparent");
  let ctx: TraceContext;

  if (incoming) {
    const parsed = parseTraceparent(incoming);
    if (parsed) {
      ctx = { ...parsed, spanId: generateSpanId(), parentSpanId: parsed.spanId };
    } else {
      ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
    }
  } else {
    ctx = { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
  }

  c.set("traceContext", ctx);
  await next();
  c.header("traceparent", buildTraceparent(ctx));
};
