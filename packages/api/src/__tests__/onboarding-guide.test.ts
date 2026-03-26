import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

describe("onboarding guide routes", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    headers = await createAuthHeaders();
  });

  // ─── GET /api/onboarding/skill-guide ───

  describe("GET /api/onboarding/skill-guide", () => {
    it("returns 200 with skill guide data", async () => {
      const res = await app.request(
        "/api/onboarding/skill-guide",
        { method: "GET", headers },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("includes orchestrator with commands and stages", async () => {
      const res = await app.request(
        "/api/onboarding/skill-guide",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      expect(data.orchestrator).toBeDefined();
      expect(data.orchestrator.name).toBeTruthy();
      expect(data.orchestrator.commands.length).toBeGreaterThan(0);
      expect(data.orchestrator.stages).toHaveLength(11);
      expect(data.orchestrator.stages[0]).toHaveProperty("id");
      expect(data.orchestrator.stages[0]).toHaveProperty("name");
      expect(data.orchestrator.stages[0]).toHaveProperty("description");
    });

    it("has exactly 11 ai-biz skills", async () => {
      const res = await app.request(
        "/api/onboarding/skill-guide",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      expect(data.skills).toHaveLength(11);
    });

    it("skills have correct categories", async () => {
      const res = await app.request(
        "/api/onboarding/skill-guide",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      const categories = data.skills.map((s: any) => s.category);
      expect(categories.filter((c: string) => c === "analysis")).toHaveLength(3);
      expect(categories.filter((c: string) => c === "strategy")).toHaveLength(3);
      expect(categories.filter((c: string) => c === "execution")).toHaveLength(3);
      expect(categories.filter((c: string) => c === "regulation")).toHaveLength(1);
      expect(categories.filter((c: string) => c === "report")).toHaveLength(1);
    });

    it("each skill has displayName, triggers, and frameworks", async () => {
      const res = await app.request(
        "/api/onboarding/skill-guide",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      for (const skill of data.skills) {
        expect(skill.name).toBeTruthy();
        expect(skill.displayName).toBeTruthy();
        expect(skill.category).toBeTruthy();
        expect(skill.description).toBeTruthy();
        expect(Array.isArray(skill.triggers)).toBe(true);
        expect(Array.isArray(skill.frameworks)).toBe(true);
      }
    });
  });

  // ─── GET /api/onboarding/process-flow ───

  describe("GET /api/onboarding/process-flow", () => {
    it("returns 200 with process flow data", async () => {
      const res = await app.request(
        "/api/onboarding/process-flow",
        { method: "GET", headers },
        env,
      );
      expect(res.status).toBe(200);
    });

    it("has 6 lifecycle stages with tools", async () => {
      const res = await app.request(
        "/api/onboarding/process-flow",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      expect(data.lifecycle).toHaveLength(6);
      expect(data.lifecycle[0]).toHaveProperty("stage");
      expect(data.lifecycle[0]).toHaveProperty("tools");
    });

    it("lifecycle stages are in correct order", async () => {
      const res = await app.request(
        "/api/onboarding/process-flow",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      const names = data.lifecycle.map((s: any) => s.name);
      expect(names).toEqual(["수집", "발굴", "형상화", "검증및공유", "제품화", "GTM"]);
    });

    it("discovery has 5 types with icons", async () => {
      const res = await app.request(
        "/api/onboarding/process-flow",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      expect(data.discovery.types).toHaveLength(5);
      const codes = data.discovery.types.map((t: any) => t.code);
      expect(codes).toEqual(["I", "M", "P", "T", "S"]);
      expect(data.discovery.types[0]).toHaveProperty("icon");
    });

    it("discovery has stages with intensity routing", async () => {
      const res = await app.request(
        "/api/onboarding/process-flow",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      expect(data.discovery.stages.length).toBeGreaterThan(0);
      expect(data.discovery.stages[0]).toHaveProperty("coreFor");
      expect(data.discovery.stages[0]).toHaveProperty("normalFor");
      expect(data.discovery.stages[0]).toHaveProperty("lightFor");
    });

    it("commit gate has 4 questions at stage 2-5", async () => {
      const res = await app.request(
        "/api/onboarding/process-flow",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      expect(data.discovery.commitGate.stage).toBe("2-5");
      expect(data.discovery.commitGate.questions).toHaveLength(4);
    });
  });

  // ─── GET /api/onboarding/team-faq ───

  describe("GET /api/onboarding/team-faq", () => {
    it("returns 200 with FAQ data including categories", async () => {
      const res = await app.request(
        "/api/onboarding/team-faq",
        { method: "GET", headers },
        env,
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.categories).toBeDefined();
      expect(data.categories).toHaveLength(3);
    });

    it("has 10 FAQ items total", async () => {
      const res = await app.request(
        "/api/onboarding/team-faq",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      expect(data.items).toHaveLength(10);
    });

    it("has correct category distribution (5 general + 3 ax-bd + 2 troubleshooting)", async () => {
      const res = await app.request(
        "/api/onboarding/team-faq",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      const general = data.items.filter((i: any) => i.category === "general");
      const axBd = data.items.filter((i: any) => i.category === "ax-bd");
      const troubleshooting = data.items.filter(
        (i: any) => i.category === "troubleshooting",
      );
      expect(general).toHaveLength(5);
      expect(axBd).toHaveLength(3);
      expect(troubleshooting).toHaveLength(2);
    });

    it("each FAQ item has required fields", async () => {
      const res = await app.request(
        "/api/onboarding/team-faq",
        { method: "GET", headers },
        env,
      );
      const data = (await res.json()) as any;
      for (const item of data.items) {
        expect(item.id).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.question).toBeTruthy();
        expect(item.answer).toBeTruthy();
      }
    });
  });
});
