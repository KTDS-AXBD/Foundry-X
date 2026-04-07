import { describe, it, expect } from "vitest";
import app from "../app.js";

describe("GET /api/health", () => {
  it("should return 200 with service name", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json() as { service: string; status: string };
    expect(body.service).toBe("gate-x");
    expect(body.status).toBe("ok");
  });
});
