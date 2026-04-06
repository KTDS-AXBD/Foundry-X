import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";
import type { HarnessConfig } from "../types.js";

export function createCorsMiddleware(config: HarnessConfig): MiddlewareHandler {
  return cors({
    origin: config.corsOrigins,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
  });
}
