import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { createCorsMiddleware } from "../../src/middleware/cors.js";
import type { HarnessConfig } from "../../src/types.js";

function createApp(origins: string[] = ["http://localhost:3000"]) {
  const config: HarnessConfig = {
    serviceName: "test-service",
    serviceId: "foundry-x",
    corsOrigins: origins,
  };

  const app = new Hono();
  app.use("*", createCorsMiddleware(config));
  app.get("/api/test", (c) => c.json({ ok: true }));
  return app;
}

describe("CORS Middleware", () => {
  it("should set CORS headers for allowed origin", async () => {
    const app = createApp();
    const res = await app.request("/api/test", {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
  });

  it("should handle preflight OPTIONS request", async () => {
    const app = createApp();
    const res = await app.request("/api/test", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("should reject non-allowed origin", async () => {
    const app = createApp(["https://example.com"]);
    const res = await app.request("/api/test", {
      headers: { Origin: "http://evil.com" },
    });
    // CORS middleware doesn't block — it just doesn't set the header
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
