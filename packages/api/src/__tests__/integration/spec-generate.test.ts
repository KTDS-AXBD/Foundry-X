import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { app } from "../../app.js";
import { createTestEnv, createAuthHeaders } from "../helpers/test-app.js";

describe("integration: spec/generate with mock AI", () => {
  let env: ReturnType<typeof createTestEnv>;
  let authHeader: Record<string, string>;

  beforeAll(async () => {
    authHeader = await createAuthHeaders({ role: "admin" });
  });

  beforeEach(() => {
    env = createTestEnv();
    // Mock the AI binding to return valid spec JSON
    env.AI = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          title: "Test Feature",
          description: "A test feature for integration",
          acceptanceCriteria: ["It works", "Tests pass"],
          priority: "P1",
          estimatedEffort: "S",
          category: "feature",
          dependencies: [],
          risks: [],
        }),
      }),
    } as any;
  });

  it("POST /api/spec/generate returns structured spec", async () => {
    const res = await app.request(
      "/api/spec/generate",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ text: "사용자가 에이전트에 작업을 할당할 수 있어야 합니다" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.spec).toBeDefined();
    expect(data.spec.title).toBe("Test Feature");
    expect(data.markdown).toContain("# Test Feature");
  });

  it("POST /api/spec/generate with context includes it in request", async () => {
    const res = await app.request(
      "/api/spec/generate",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "에이전트 오케스트레이션 구현",
          context: "Sprint 9, 에이전트 작업 분배",
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.spec).toBeDefined();
    expect(data.confidence).toBeGreaterThan(0);
  });

  it("POST /api/spec/generate returns 503 when AI unavailable", async () => {
    env.AI = {
      run: vi.fn().mockRejectedValue(new Error("AI service down")),
    } as any;

    const res = await app.request(
      "/api/spec/generate",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ text: "에이전트 오케스트레이션 기능을 구현합니다 테스트" }),
      },
      env,
    );
    expect(res.status).toBe(503);
  });
});
