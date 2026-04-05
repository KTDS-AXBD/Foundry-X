// ─── F336: AgentAdapterRegistry Tests (Sprint 151) ───

import { describe, it, expect, beforeEach } from "vitest";
import { AgentAdapterRegistry } from "../services/agent-adapter-registry.js";
import type { AgentAdapter, AgentExecutionContext, AgentResult } from "@foundry-x/shared";

function makeAdapter(
  name: string,
  role: "generator" | "discriminator" | "orchestrator" = "generator",
): AgentAdapter {
  return {
    name,
    role,
    async execute(_ctx: AgentExecutionContext): Promise<AgentResult> {
      return { success: true, qualityScore: 0.9, feedback: [] };
    },
  };
}

describe("AgentAdapterRegistry", () => {
  let registry: AgentAdapterRegistry;

  beforeEach(() => {
    registry = new AgentAdapterRegistry();
  });

  it("registers and retrieves adapter by name", () => {
    const adapter = makeAdapter("test-gen");
    registry.register(adapter);

    expect(registry.get("test-gen")).toBe(adapter);
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("filters by role", () => {
    registry.register(makeAdapter("gen-1", "generator"));
    registry.register(makeAdapter("gen-2", "generator"));
    registry.register(makeAdapter("disc-1", "discriminator"));

    const generators = registry.getByRole("generator");
    expect(generators).toHaveLength(2);
    expect(generators.map((a) => a.name)).toEqual(["gen-1", "gen-2"]);

    const discriminators = registry.getByRole("discriminator");
    expect(discriminators).toHaveLength(1);
  });

  it("lists all adapters", () => {
    registry.register(makeAdapter("a", "generator"));
    registry.register(makeAdapter("b", "discriminator"));
    registry.register(makeAdapter("c", "orchestrator"));

    expect(registry.list()).toHaveLength(3);
    expect(registry.size).toBe(3);
  });

  it("returns adversarial pair", () => {
    registry.register(makeAdapter("gen", "generator"));
    registry.register(makeAdapter("disc", "discriminator"));

    const pair = registry.getAdversarialPair();
    expect(pair.generator?.name).toBe("gen");
    expect(pair.discriminator?.name).toBe("disc");
  });

  it("returns specific adversarial pair by name", () => {
    registry.register(makeAdapter("gen-1", "generator"));
    registry.register(makeAdapter("gen-2", "generator"));
    registry.register(makeAdapter("disc-1", "discriminator"));

    const pair = registry.getAdversarialPair("gen-2", "disc-1");
    expect(pair.generator?.name).toBe("gen-2");
    expect(pair.discriminator?.name).toBe("disc-1");
  });

  it("clears all adapters", () => {
    registry.register(makeAdapter("a"));
    registry.register(makeAdapter("b"));
    expect(registry.size).toBe(2);

    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  it("overwrites adapter with same name", () => {
    const first = makeAdapter("test", "generator");
    const second = makeAdapter("test", "discriminator");

    registry.register(first);
    registry.register(second);

    expect(registry.size).toBe(1);
    expect(registry.get("test")?.role).toBe("discriminator");
  });
});
