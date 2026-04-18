// F541 TDD Red Phase — offerings route auth guard
import { describe, test, expect } from "vitest";
import app from "../app.js";

describe("F541: offerings routes", () => {
  test("GET /api/offerings without auth → 401", async () => {
    const res = await app.request("/api/offerings");
    expect(res.status).toBe(401);
  });

  test("GET /api/bdp without auth → 401", async () => {
    const res = await app.request("/api/bdp/test-biz-item");
    expect(res.status).toBe(401);
  });

  test("GET /api/methodologies without auth → 401", async () => {
    const res = await app.request("/api/methodologies");
    expect(res.status).toBe(401);
  });
});
