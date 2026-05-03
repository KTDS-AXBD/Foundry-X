// ─── F336: Agent Adapters Route Tests (Sprint 151) ───

import { describe, it, expect, beforeEach } from "vitest";
import { agentAdaptersRoute, resetRegistry } from "../src/routes/agent-adapters.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Helper: create request and get response
async function request(path: string, options?: RequestInit) {
  const url = `http://localhost${path}`;
  return agentAdaptersRoute.request(url, options, {
    DB: {} as D1Database,
    ANTHROPIC_API_KEY: "",
    JWT_SECRET: "test",
    GITHUB_TOKEN: "",
    WEBHOOK_SECRET: "",
    OPENROUTER_API_KEY: "",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  });
}

describe("Agent Adapters Route", () => {
  beforeEach(() => {
    resetRegistry();
  });

  describe("GET /agent-adapters", () => {
    it("returns list of all adapters", async () => {
      const res = await request("/agent-adapters");
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items).toBeDefined();
      expect(body.total).toBeGreaterThan(0);
      // YAML 에이전트 16개가 기본 등록
      expect(body.total).toBe(16);
    });

    it("filters by role", async () => {
      const res = await request("/agent-adapters?role=discriminator");
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      // discriminator: ogd-disc, shaping-disc, spec-checker, build-validator, deploy-verifier, auto-reviewer = 6
      expect(body.items.every((a: { role: string }) => a.role === "discriminator")).toBe(true);
      expect(body.total).toBe(6);
    });

    it("filters generators", async () => {
      const res = await request("/agent-adapters?role=generator");
      const body = await res.json() as any;
      // generator: ogd-gen, shaping-gen, expert-ta/aa/ca/da/qa = 7
      expect(body.total).toBe(7);
    });
  });

  describe("GET /agent-adapters/:name", () => {
    it("returns adapter detail", async () => {
      const res = await request("/agent-adapters/spec-checker");
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.name).toBe("spec-checker");
      expect(body.role).toBe("discriminator");
      expect(body.metadata?.source).toBe("yaml");
    });

    it("returns 404 for unknown adapter", async () => {
      const res = await request("/agent-adapters/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /agent-adapters/:name/execute", () => {
    it("executes YAML adapter (returns not-executable)", async () => {
      const res = await request("/agent-adapters/spec-checker/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "task-1",
          tenantId: "tenant-1",
        }),
      });
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.success).toBe(false);
      expect(body.feedback[0]).toContain("YAML-defined agent");
    });

    it("returns 404 for unknown adapter", async () => {
      const res = await request("/agent-adapters/unknown/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: "task-1",
          tenantId: "tenant-1",
        }),
      });
      expect(res.status).toBe(404);
    });
  });
});
