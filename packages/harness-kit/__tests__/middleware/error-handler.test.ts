import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { errorHandler, HarnessError } from "../../src/middleware/error-handler.js";

describe("Error Handler", () => {
  it("should return structured error for HarnessError", async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/api/test", () => {
      throw new HarnessError(400, "Bad request", "INVALID_INPUT");
    });

    const res = await app.request("/api/test");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Bad request", code: "INVALID_INPUT" });
  });

  it("should return 500 for generic Error", async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/api/test", () => {
      throw new Error("Something broke");
    });

    const res = await app.request("/api/test");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal Server Error" });
  });

  it("should handle HarnessError without code", async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/api/test", () => {
      throw new HarnessError(404, "Not found");
    });

    const res = await app.request("/api/test");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Not found", code: undefined });
  });
});
