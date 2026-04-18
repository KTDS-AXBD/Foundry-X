// F541 TDD Red Phase — fx-offering health endpoint
import { describe, test, expect, beforeEach } from "vitest";
import app from "../app.js";

describe("F541: fx-offering health", () => {
  test("GET /api/offering/health → 200 with domain=offering", async () => {
    const res = await app.request("/api/offering/health");
    expect(res.status).toBe(200);
    const data = await res.json() as { domain: string; status: string };
    expect(data.domain).toBe("offering");
    expect(data.status).toBe("ok");
  });
});
