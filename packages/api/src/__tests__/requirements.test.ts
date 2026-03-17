import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requirementsRoute } from "../routes/requirements.js";

const testApp = new Hono();
testApp.use("*", async (c, next) => {
  c.set("jwtPayload", { sub: "test-user", email: "test@test.com", role: "member" });
  return next();
});
testApp.route("/", requirementsRoute);

describe("requirements routes", () => {
  it("GET /requirements returns mock requirements", async () => {
    const res = await testApp.request("/requirements");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("requirements have correct structure", async () => {
    const res = await testApp.request("/requirements");
    const data = (await res.json()) as any;
    const item = data[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("reqCode");
    expect(item).toHaveProperty("title");
    expect(item).toHaveProperty("status");
  });

  it("PUT /requirements/:id updates status", async () => {
    const res = await testApp.request("/requirements/F1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe("F1");
    expect(data.status).toBe("in_progress");
  });

  it("PUT /requirements/:id rejects invalid status", async () => {
    const res = await testApp.request("/requirements/F1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "invalid_status" }),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data).toHaveProperty("error");
  });

  it("PUT /requirements/:id returns 404 for unknown id", async () => {
    const res = await testApp.request("/requirements/F999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    expect(res.status).toBe(404);
  });
});
