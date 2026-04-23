// F570 TDD Red Phase — offering-packs route auth guard
import { describe, test, expect } from "vitest";
import app from "../app.js";

describe("F570: offering-packs routes", () => {
  test("POST /api/offering-packs without auth → 401", async () => {
    const res = await app.request("/api/offering-packs", { method: "POST" });
    expect(res.status).toBe(401);
  });

  test("GET /api/offering-packs without auth → 401", async () => {
    const res = await app.request("/api/offering-packs");
    expect(res.status).toBe(401);
  });

  test("GET /api/offering-packs/:id without auth → 401", async () => {
    const res = await app.request("/api/offering-packs/test-id");
    expect(res.status).toBe(401);
  });

  test("POST /api/offering-packs/:id/items without auth → 401", async () => {
    const res = await app.request("/api/offering-packs/test-id/items", { method: "POST" });
    expect(res.status).toBe(401);
  });

  test("POST /api/offering-packs/:id/brief without auth → 401", async () => {
    const res = await app.request("/api/offering-packs/test-id/brief", { method: "POST" });
    expect(res.status).toBe(401);
  });
});
