import { describe, it, expect } from "vitest";
import { tokenRoute } from "../routes/token.js";

describe("token routes", () => {
  // ─── Summary ───

  it("GET /tokens/summary returns TokenSummary (fallback to mock)", async () => {
    const res = await tokenRoute.request("/tokens/summary");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data).toHaveProperty("period");
    expect(data).toHaveProperty("totalCost");
    expect(data).toHaveProperty("byModel");
    expect(data).toHaveProperty("byAgent");
    expect(typeof data.totalCost).toBe("number");
  });

  it("summary byModel has correct structure", async () => {
    const res = await tokenRoute.request("/tokens/summary");
    const data = await res.json() as any;

    for (const [model, stats] of Object.entries(data.byModel)) {
      expect(typeof model).toBe("string");
      const s = stats as { tokens: number; cost: number };
      expect(typeof s.tokens).toBe("number");
      expect(typeof s.cost).toBe("number");
    }
  });

  // ─── Usage ───

  it("GET /tokens/usage returns TokenUsage array (fallback to mock)", async () => {
    const res = await tokenRoute.request("/tokens/usage");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const record = data[0];
    expect(record).toHaveProperty("model");
    expect(record).toHaveProperty("inputTokens");
    expect(record).toHaveProperty("outputTokens");
    expect(record).toHaveProperty("cost");
    expect(record).toHaveProperty("timestamp");
  });

  it("usage records have valid token counts", async () => {
    const res = await tokenRoute.request("/tokens/usage");
    const data = await res.json() as any;

    for (const record of data) {
      expect(record.inputTokens).toBeGreaterThan(0);
      expect(record.outputTokens).toBeGreaterThan(0);
      expect(record.cost).toBeGreaterThan(0);
    }
  });
});
