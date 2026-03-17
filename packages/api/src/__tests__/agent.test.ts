import { describe, it, expect } from "vitest";
import { agentRoute } from "../routes/agent.js";
import { createTestEnv } from "./helpers/test-app.js";

describe("agent routes", () => {
  it("GET /agents returns agent list", async () => {
    const res = await agentRoute.request("/agents");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);

    const agent = data[0];
    expect(agent).toHaveProperty("id");
    expect(agent).toHaveProperty("name");
    expect(agent).toHaveProperty("capabilities");
    expect(agent).toHaveProperty("constraints");
  });

  it("GET /agents/stream returns SSE response", async () => {
    const env = createTestEnv();
    const res = await agentRoute.request("/agents/stream", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");

    // Read first chunk to verify SSE format (heartbeat since DB is empty)
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain("heartbeat");
    reader.cancel();
  });

  it("agent profile has correct constraint tiers", async () => {
    const res = await agentRoute.request("/agents");
    const data = await res.json() as any;
    const agent = data[0];

    for (const constraint of agent.constraints) {
      expect(["always", "ask", "never"]).toContain(constraint.tier);
      expect(constraint).toHaveProperty("rule");
      expect(constraint).toHaveProperty("reason");
    }
  });
});
