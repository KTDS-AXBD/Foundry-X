/**
 * F166: PII Masker Middleware — Auto-masks PII in request bodies for AI-facing routes.
 * Only applies to POST/PUT on /api/agent/, /api/spec/generate, /api/mcp/ paths.
 */
import { createMiddleware } from "hono/factory";
import type { Env } from "../env.js";
import { PiiMaskerService } from "../services/pii-masker.js";
import type { JwtPayload } from "../middleware/auth.js";

const AI_PATH_PREFIXES = ["/api/agents/", "/api/spec/generate", "/api/mcp/"];
const MASKED_METHODS = new Set(["POST", "PUT"]);

export const piiMaskerMiddleware = createMiddleware<{
  Bindings: Env;
}>(async (c, next) => {
  const path = c.req.path;
  const method = c.req.method.toUpperCase();

  // Only apply to AI-facing routes with body-carrying methods
  const isAiRoute = AI_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isAiRoute || !MASKED_METHODS.has(method)) {
    await next();
    return;
  }

  try {
    const body = await c.req.text();
    if (!body) {
      await next();
      return;
    }

    const jwt = c.get("jwtPayload") as JwtPayload | undefined;
    const tenantId = jwt?.orgId;

    const masker = new PiiMaskerService(c.env.DB);
    const result = await masker.mask(body, tenantId);

    if (result.detections.length > 0) {
      // Store detections in context for audit logging (Phase C)
      c.set("piiDetections" as never, result.detections as never);

      // Replace request body with masked version
      const headers = new Headers(c.req.raw.headers);
      const newRequest = new Request(c.req.url, {
        method: c.req.method,
        headers,
        body: result.masked,
      });
      // @ts-expect-error -- override raw request for downstream handlers
      c.req = c.newRequest(newRequest);
    }
  } catch {
    // If masking fails, continue with original request
  }

  await next();
});
